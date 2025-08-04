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

  async syncRaceCalendar(season: number = new Date().getFullYear(), isFinished?: boolean) {
    try {
      console.log(`📅 Sincronizzazione calendario ${season} (isFinished: ${isFinished})...`);
      
      const seasonsResponse = await this.axiosInstance.get('/results/seasons');
      const seasonData = seasonsResponse.data.find((s: any) => s.year === season);
      
      if (!seasonData) throw new Error(`Stagione ${season} non trovata`);

      let url = `/results/events?seasonUuid=${seasonData.id}`;
      if (typeof isFinished === 'boolean') {
        url += `&isFinished=${isFinished}`;
      }

      const eventsResponse = await this.axiosInstance.get(url);
      
      for (const event of eventsResponse.data) {
        if (event.test) {
          console.log(`🟡 SKIPPATO: ${event.name} (evento di test)`);
          continue;
        }

        let raceDate: Date | null = null;
        let sprintDate: Date | null = null;

        try {
          const eventDetailsResponse = await this.axiosInstance.get(`/events/${event.toad_api_uuid}`);
          const broadcasts = eventDetailsResponse.data?.broadcasts || [];
          
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
            round: event.number || 0,
            season,
          },
          create: {
            name: event.name,
            circuit: event.circuit.name,
            country: event.country.name,
            startDate: new Date(event.date_start),
            endDate: new Date(event.date_end),
            gpDate: raceDate || new Date(event.date_end),
            sprintDate: sprintDate,
            round: event.number || 0,
            season,
            apiEventId: event.id,
          }
        });
        console.log(`✅ Sincronizzato evento: ${event.name}`);
      }
      console.log(`🎉 Calendario per la stagione ${season} (isFinished: ${isFinished}) sincronizzato!`);
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
    for (const result of classification) {
      let rider = await prisma.rider.findUnique({
        where: { apiRiderId: result.rider.riders_api_uuid }
      });

      if (!rider) {
        rider = await prisma.rider.findFirst({
          where: { name: { contains: result.rider.full_name }, category }
        });
      }

      if (!rider) {
        console.warn(`⚠️ Pilota non trovato: ${result.rider.full_name}`);
        continue;
      }
      
      let status: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ' = 'FINISHED';
      if (result.status === 'OUTSTND' || result.status === 'DNF') {
        status = 'DNF';
      } else if (result.status === 'DNS') {
        status = 'DNS';
      } else if (result.status === 'DSQ') {
        status = 'DSQ';
      } else if (!result.position) {
        status = 'DNF';
      } else {
        status = 'FINISHED';
      }

      await prisma.raceResult.upsert({
        where: { raceId_riderId_session: { raceId, riderId: rider.id, session } },
        update: {
          position: result.position || null,
          status,
        },
        create: {
          raceId,
          riderId: rider.id,
          session,
          position: result.position || null,
          status,
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
            // Se il pilota non ha un risultato per questa sessione (es. non ha corso lo sprint)
            // si applica la penalità massima di quella categoria + 1
            const riderCategory = lineupRider.rider.category;
            const maxPos = maxPositions[riderCategory] || 25; // Fallback a 25
            basePoints = maxPos + 1;
          } else {
            const { position, status } = result;
            const riderCategory = lineupRider.rider.category;
            const maxPos = maxPositions[riderCategory] || 25;

            if (status === 'DNS') {
              // Non ha partecipato: penalità max classifica + 1
              basePoints = maxPos + 1;
            } else {
              // Ha partecipato (FINISHED, DNF, DSQ): usa la sua posizione se esiste, altrimenti penalità
              basePoints = position ?? (maxPos + 1);
            }
          }
          
          const difference = Math.abs(predictedPosition - basePoints);
          points = basePoints + difference;
          
          riderScores.push({ rider: lineupRider.rider.name, points, predicted: predictedPosition, actual: result?.position ?? result?.status, base: basePoints, diff: difference });
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

  private async updateLeagueStandings(raceId: string) {
    try {
      const leagues = await prisma.league.findMany({
        include: {
          teams: {
            include: {
              scores: true
            }
          }
        }
      });

      for (const league of leagues) {
        league.teams.map(team => {
          const totalPoints = team.scores.reduce((sum, score) => sum + score.totalPoints, 0);
          return {
            teamId: team.id,
            totalPoints,
          };
        }).sort((a, b) => a.totalPoints - b.totalPoints);

        console.log(`Classifica aggiornata per lega ${league.name}`);
      }
    } catch (error) {
      console.error('Errore aggiornamento classifiche:', error);
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