// backend/src/services/motogpApiService.ts
import axios from 'axios';
import { Category, PrismaClient, RiderType, SessionType } from '@prisma/client';

const prisma = new PrismaClient();

interface MotoGPApiConfig {
  baseUrl: string;
  resultsApi: string;
  broadcastApi: string;
}

const config: MotoGPApiConfig = {
  baseUrl: 'https://api.motogp.pulselive.com/motogp/v1',
  resultsApi: 'https://api.motogp.pulselive.com/motogp/v1/results',
  broadcastApi: 'https://api.motogp.pulselive.com/motogp/v1'
};

const CATEGORY_MAPPING: Record<string, Category> = {
  'e8c110ad-64aa-4e8e-8a86-f2f152f6a942': Category.MOTOGP,
  '549640b8-fd9c-4245-acfd-60e4bc38b25c': Category.MOTO2,
  '954f7e65-2ef2-4423-b949-4961cc603e45': Category.MOTO3,
};

const getRiderType = (apiRider: any): RiderType => {
    const careerStep = apiRider.current_career_step;
    if (!careerStep || !careerStep.type) return RiderType.TEST_RIDER;

    switch (careerStep.type.toUpperCase()) {
        case 'OFFICIAL':
            return RiderType.OFFICIAL;
        case 'WILDCARD':
            return RiderType.WILDCARD;
        case 'REPLACEMENT':
        case 'SUBSTITUTE':
            return RiderType.REPLACEMENT;
        case 'TEST':
        default:
            return RiderType.TEST_RIDER;
    }
};

export class MotoGPApiService {
  private axiosInstance = axios.create({
    baseURL: config.baseUrl,
    timeout: 15000,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'FantaMotoGP/1.0'
    }
  });

  async syncRiders() {
    try {
      console.log('🏍️ Sincronizzazione piloti in corso...');
      const response = await this.axiosInstance.get('/riders');
      const riders = response.data;
      
      console.log(`🔎 Trovati ${riders.length} piloti totali dall'API.`);
      let syncedCount = 0;
      let skippedCount = 0;

      for (const apiRider of riders) {
        const riderFullName = `${apiRider.name} ${apiRider.surname}`;
        const careerStep = apiRider.current_career_step;

        if (!careerStep?.category?.legacy_id) {
          console.log(`🟡 SKIPPATO: ${riderFullName} - Nessun career step valido.`);
          skippedCount++;
          continue;
        }
        
        const category = this.mapLegacyCategory(careerStep.category.legacy_id);
        
        if (!category) {
          console.log(`🟡 SKIPPATO: ${riderFullName} - Categoria non gestita (${careerStep.category.name}).`);
          skippedCount++;
          continue;
        }

        const value = this.calculateRiderValue(apiRider);
        const riderType = getRiderType(apiRider);
        const photoUrl = careerStep.pictures?.profile?.main ?? careerStep.pictures?.portrait;
        const isActive = !!careerStep;

        await prisma.rider.upsert({
          where: { apiRiderId: apiRider.id },
          update: {
            name: riderFullName,
            team: careerStep.sponsored_team,
            number: careerStep.number,
            category,
            nationality: apiRider.country.iso,
            value,
            isActive,
            photoUrl: photoUrl,
            riderType,
          },
          create: {
            name: riderFullName,
            number: careerStep.number,
            team: careerStep.sponsored_team,
            category,
            nationality: apiRider.country.iso,
            value,
            isActive,
            photoUrl: photoUrl,
            riderType,
            apiRiderId: apiRider.id,
          }
        });
        syncedCount++;
      }
      
      console.log('🎉 Sincronizzazione piloti completata!');
      console.log(`📊 Riepilogo: ${syncedCount} piloti sincronizzati, ${skippedCount} piloti scartati.`);
    } catch (error) {
      console.error('❌ Errore sincronizzazione piloti:', error);
      throw error;
    }
  }

  async syncRaceCalendar(season: number = new Date().getFullYear()) {
    try {
      console.log(`📅 Sincronizzazione calendario ${season}...`);
      
      const seasonsResponse = await this.axiosInstance.get('/results/seasons');
      const seasonData = seasonsResponse.data.find((s: any) => s.year === season);
      
      if (!seasonData) throw new Error(`Stagione ${season} non trovata`);

      const finishedEventsUrl = `/results/events?seasonUuid=${seasonData.id}&isFinished=true`;
      const upcomingEventsUrl = `/results/events?seasonUuid=${seasonData.id}&isFinished=false`;

      const [finishedEventsResponse, upcomingEventsResponse] = await Promise.all([
        this.axiosInstance.get(finishedEventsUrl),
        this.axiosInstance.get(upcomingEventsUrl)
      ]);

      const allEvents = [...finishedEventsResponse.data, ...upcomingEventsResponse.data];
      
      for (const event of allEvents) {
        if (event.test) {
          console.log(`🟡 SKIPPATO: ${event.name} (evento di test)`);
          continue;
        }

        let raceDate: Date | null = null;
        let sprintDate: Date | null = null;
        let trackLayoutUrl: string | null = null;

        try {
          const eventDetailsResponse = await this.axiosInstance.get(`/events/${event.toad_api_uuid}`);
          const eventData = eventDetailsResponse.data;
          const broadcasts = eventData?.broadcasts || [];
          
          if (eventData?.circuit?.track?.assets?.info?.path) {
            trackLayoutUrl = eventData.circuit.track.assets.info.path;
          }
          
          const raceSession = broadcasts.find((s: any) => s.shortname === 'RAC' && s.category.acronym === 'MGP');
          if (raceSession && raceSession.date_start) {
            raceDate = new Date(raceSession.date_start);
          }

          const sprintSession = broadcasts.find((s: any) => s.shortname === 'SPR' && s.category.acronym === 'MGP');
          if (sprintSession && sprintSession.date_start) {
            sprintDate = new Date(sprintSession.date_start);
          }
        } catch (sessionError) {
          console.warn(`⚠️ Impossibile recuperare i dettagli delle sessioni per ${event.name}, uso le date generali.`);
        }
        const roundNumber = event.sequence || event.number || 0; 
        
        await prisma.race.upsert({
          where: { apiEventId: event.id },
          update: {
            name: event.name,
            circuit: event.circuit.name,
            country: event.country.name,
            startDate: new Date(event.date_start),
            endDate: new Date(event.date_end),
            gpDate: raceDate || new Date(event.date_end),
            sprintDate: sprintDate,
            round: roundNumber,
            season,
            trackLayoutUrl
          },
          create: {
            name: event.name,
            circuit: event.circuit.name,
            country: event.country.name,
            startDate: new Date(event.date_start),
            endDate: new Date(event.date_end),
            gpDate: raceDate || new Date(event.date_end),
            sprintDate: sprintDate,
            round: roundNumber,
            season,
            apiEventId: event.id,
            trackLayoutUrl
          }
        });
        console.log(`✅ Sincronizzato evento: ${event.name}`);
      }

      console.log('🔄 Ricalcolo dei round in ordine cronologico...');
      const races = await prisma.race.findMany({
        where: { season },
        orderBy: { gpDate: 'asc' }
      });

      for (let i = 0; i < races.length; i++) {
        await prisma.race.update({
          where: { id: races[i].id },
          data: { round: i + 1 }
        });
      }
      
      console.log(`🎉 Calendario per la stagione ${season} sincronizzato e ordinato!`);
    } catch (error) {
      console.error(`❌ Errore sincronizzazione calendario ${season}:`, error);
      throw error;
    }
  }

  async syncRaceResults(raceId: string) {
    try {
      const race = await prisma.race.findUnique({ where: { id: raceId } });
      if (!race || !race.apiEventId) throw new Error('Gara non trovata o mancano dati API');

      for (const [categoryId, category] of Object.entries(CATEGORY_MAPPING)) {
        try {
          const sessionsResponse = await this.axiosInstance.get(`/results/sessions?eventUuid=${race.apiEventId}&categoryUuid=${categoryId}`);
          
          const raceSession = sessionsResponse.data.find((s: any) => s.type === 'RAC');
          const sprintSession = sessionsResponse.data.find((s: any) => s.type === 'SPR');
          const q1Session = sessionsResponse.data.find((s: any) => (s.type === 'Q' && s.number === 1) || s.type === 'Q1');
          const q2Session = sessionsResponse.data.find((s: any) => (s.type === 'Q' && s.number === 2) || s.type === 'Q2');
          const fp1Session = sessionsResponse.data.find((s: any) => (s.type === 'FP' && s.number === 1) || s.type === 'FP1');
          const fp2Session = sessionsResponse.data.find((s: any) => (s.type === 'FP' && s.number === 2) || s.type === 'FP2');
          const prSession = sessionsResponse.data.find((s: any) => s.type === 'PR');

          if (raceSession) {
            const resultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${raceSession.id}&test=false`);
            if (resultsResponse.data?.classification) {
              await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.RACE);
            }
          }
          if (sprintSession) {
            const resultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${sprintSession.id}&test=false`);
            if (resultsResponse.data?.classification) {
              await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.SPRINT);
            }
          }

          if (fp1Session) {
            const resultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${fp1Session.id}&test=false`);
            if (resultsResponse.data?.classification) {
                await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.FP1);
            }
          }
          if (fp2Session) {
            const resultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${fp2Session.id}&test=false`);
            if (resultsResponse.data?.classification) {
                await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.FP2);
            }
          }
          
          if (prSession) {
            const resultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${prSession.id}&test=false`);
            if (resultsResponse.data?.classification) {
                await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.PR);
            }
          }

          if (q2Session) {
            const q2ResultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${q2Session.id}&test=false`);
            if (q2ResultsResponse.data?.classification) {
              const q2Results = q2ResultsResponse.data.classification;
              let finalClassification = q2Results;

              if (q1Session) {
                const q1ResultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${q1Session.id}&test=false`);
                if (q1ResultsResponse.data?.classification) {
                  const q1Results = q1ResultsResponse.data.classification;
                  const q1RidersNotInQ2 = q1Results.slice(2);
                  const lastQ2Position = q2Results.length;
                  const adjustedQ1Riders = q1RidersNotInQ2.map((rider: any, index: number) => ({
                      ...rider,
                      position: lastQ2Position + index + 1,
                  }));

                  finalClassification = [...q2Results, ...adjustedQ1Riders];
                }
              }

              await this.saveRaceResults(raceId, category, finalClassification, SessionType.QUALIFYING);
            }
          } else if (q1Session) {
            // Fallback for categories that only have one qualifying session
            const resultsResponse = await axios.get(`https://api.motogp.pulselive.com/motogp/v2/results/classifications?session=${q1Session.id}&test=false`);
            if (resultsResponse.data?.classification) {
              await this.saveRaceResults(raceId, category, resultsResponse.data.classification, SessionType.QUALIFYING);
            }
          }
        } catch (error) {
          console.error(`Errore sync risultati ${category}:`, error);
        }
      }

      await this.calculateTeamScores(raceId, SessionType.RACE);
      if (race.sprintDate) {
        await this.calculateTeamScores(raceId, SessionType.SPRINT);
      }

      console.log(`✅ Risultati sincronizzati per gara ${race.name}`);
      return { success: true, message: 'Risultati sincronizzati con successo' };
      
    } catch (error) {
      console.error('❌ Errore sincronizzazione risultati:', error);
      throw error;
    }
  }

  private async saveRaceResults(raceId: string, category: Category, classification: any[], session: SessionType) {
    const finishedRiders = classification.filter(r => r.position !== null);
    const dnfRiders = classification.filter(r => r.position === null).sort((a, b) => (b.total_laps || 0) - (a.total_laps || 0));
    const lastPosition = finishedRiders.length;
    const finalClassification = [...finishedRiders, ...dnfRiders.map((rider, index) => ({ ...rider, position: lastPosition + index + 1 }))];

    for (const result of finalClassification) {
      let rider = await prisma.rider.findUnique({ where: { apiRiderId: result.rider.riders_api_uuid } });
      if (!rider) {
        rider = await prisma.rider.findFirst({ where: { name: { contains: result.rider.full_name }, category } });
      }

      if (!rider) {
        console.warn(`⚠️ Pilota non trovato nel DB, impossibile salvare il risultato per: ${result.rider.full_name}`);
        continue;
      }
      
      let status: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ' = 'FINISHED';
      if (result.status === 'OUTSTND' || result.status === 'DNF') status = 'DNF';
      else if (result.status === 'DNS') status = 'DNS';
      else if (result.status === 'DSQ') status = 'DSQ';
      else if (!result.position) status = 'DNF';

      const dataToSave = {
        position: result.position || null,
        points: result.points || 0,
        status,
        time: result.time || null,
        totalLaps: result.total_laps || null,
        bestLap: result.best_lap || null,
      };

      await prisma.raceResult.upsert({
        where: { raceId_riderId_session: { raceId, riderId: rider.id, session } },
        update: dataToSave,
        create: {
          session,
          ...dataToSave,
          race: {
            connect: { id: raceId }
          },
          rider: {
            connect: { id: rider.id }
          }
        },
      });
    }
  }

  async calculateTeamScores(raceId: string, session: SessionType) {
    console.log(`-- Inizio calcolo punteggi per ${session} della gara ${raceId} --`);
    try {
      const raceResults = await prisma.raceResult.findMany({
        where: { raceId, session },
        include: { rider: true },
      });

      if (raceResults.length === 0) {
        console.log(`Nessun risultato ${session} trovato per la gara.`);
        return;
      }
      
      const qualifyingResults = await prisma.raceResult.findMany({
          where: {
              raceId,
              session: 'QUALIFYING',
              position: { in: [1, 2, 3] }
          },
          select: {
              riderId: true,
              position: true
          }
      });

      const qualifyingBonusMap = new Map<string, number>();
      qualifyingResults.forEach(result => {
          if (result.position === 1) qualifyingBonusMap.set(result.riderId, -5);
          if (result.position === 2) qualifyingBonusMap.set(result.riderId, -3);
          if (result.position === 3) qualifyingBonusMap.set(result.riderId, -1);
      });

      const maxPositions = raceResults.reduce((acc, result) => {
        const category = result.rider.category;
        if (result.position && result.position > (acc[category] || 0)) {
          acc[category] = result.position;
        }
        return acc;
      }, {} as Record<Category, number>);

      const resultMap = new Map<string, { position: number | null, status: string }>();
      raceResults.forEach(result => {
        resultMap.set(result.riderId, { position: result.position, status: result.status });
      });

      const lineups = await prisma.raceLineup.findMany({
        where: { raceId },
        include: {
          lineupRiders: { include: { rider: true } },
          team: { include: { riders: { include: { rider: true } } } }
        }
      });

      for (const lineup of lineups) {
        let totalPoints = 0;
        let riderScores = [];

        for (const lineupRider of lineup.lineupRiders) {
          const result = resultMap.get(lineupRider.riderId);
          const predictedPosition = lineupRider.predictedPosition;
          let points = 0;
          let basePoints = 0;

          if (!result) {
            const riderCategory = lineupRider.rider.category;
            const maxPos = maxPositions[riderCategory] || 25;
            basePoints = maxPos + 1;
          } else {
            const { position, status } = result;
            const riderCategory = lineupRider.rider.category;
            const maxPos = maxPositions[riderCategory] || 25;

            if (status === 'DNS') {
              basePoints = maxPos + 1;
            } else {
              basePoints = position ?? (maxPos + 1);
            }
          }
          
          const difference = Math.abs(predictedPosition - basePoints);
          points = basePoints + difference;
          
          const qualifyingBonus = (session === SessionType.RACE) ? (qualifyingBonusMap.get(lineupRider.riderId) || 0) : 0;
          points += qualifyingBonus;

          riderScores.push({ rider: lineupRider.rider.name, points, predicted: predictedPosition, actual: result?.position ?? result?.status, base: basePoints, diff: difference, qualifyingBonus });
          totalPoints += points;
        }
        
        await prisma.teamScore.upsert({
          where: { teamId_raceId_session: { teamId: lineup.teamId, raceId, session } },
          update: { totalPoints, calculatedAt: new Date(), riderScores: riderScores as any },
          create: { teamId: lineup.teamId, raceId, session, totalPoints, riderScores: riderScores as any }
        });

        console.log(`Team ${lineup.team.name}: ${totalPoints} punti per ${session}`);
      }
    } catch (error) {
      console.error(`Errore nel calcolo dei punteggi per ${session}:`, error);
    }
  }

  private mapLegacyCategory(legacyId: number): Category | null {
    switch (legacyId) {
      case 3: return Category.MOTOGP;
      case 2: return Category.MOTO2;
      case 1: return Category.MOTO3;
      default: return null;
    }
  }

  private calculateRiderValue(apiRider: any): number {
    const baseValue = 50;
    const championships = apiRider.championships?.length || 0;
    const wins = apiRider.victories || 0;
    
    return Math.min(200, baseValue + (championships * 30) + (wins * 2));
  }
}

export const motogpApi = new MotoGPApiService();