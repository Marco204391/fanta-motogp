// backend/src/services/motogpApiService.ts
import axios from 'axios';
import { Category, PrismaClient, RiderType } from '@prisma/client';

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
          where: { apiRiderId: apiRider.id }, // Usa l'ID univoco dell'API
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
        // --- MODIFICA 1: Esclusione dei test utilizzando il flag 'test' ---
        if (event.test) {
          console.log(`🟡 SKIPPATO: ${event.name} (evento di test)`);
          continue;
        }

        // --- MODIFICA 2: Recupero date precise dall'endpoint dell'evento specifico ---
        let raceDate: Date | null = null;
        let sprintDate: Date | null = null;

        try {
          // L'ID dell'evento dalla prima chiamata viene usato qui
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

  // 3. Sincronizza risultati di una gara
  async syncRaceResults(raceId: string) {
    try {
      const race = await prisma.race.findUnique({
        where: { id: raceId }
      });

      if (!race || !race.apiEventId) {
        throw new Error('Gara non trovata o mancano dati API');
      }

      // Per ogni categoria, ottieni i risultati
      for (const [categoryId, category] of Object.entries(CATEGORY_MAPPING)) {
        try {
          // Prima ottieni le sessioni per trovare l'ID della gara
          const sessionsResponse = await this.axiosInstance.get(
            `/results/sessions?eventUuid=${race.apiEventId}&categoryUuid=${categoryId}`
          );

          // Trova la sessione della gara (tipo 'RAC')
          const raceSession = sessionsResponse.data.find((s: any) => s.type === 'RAC');
          if (!raceSession) continue;

          // Ottieni i risultati della gara
          const resultsResponse = await this.axiosInstance.get(
            `/results/session/${raceSession.id}/classification`
          );

          if (resultsResponse.data?.classification) {
            await this.saveRaceResults(raceId, category, resultsResponse.data.classification);
          }
        } catch (error) {
          console.error(`Errore sync risultati ${category}:`, error);
        }
      }

      // Dopo aver salvato tutti i risultati, calcola i punteggi
      await this.calculateTeamScores(raceId);

      console.log(`✅ Risultati sincronizzati per gara ${race.name}`);
      return { success: true, message: 'Risultati sincronizzati con successo' };
      
    } catch (error) {
      console.error('❌ Errore sincronizzazione risultati:', error);
      throw error;
    }
  }

  // 4. Salva risultati nel database
  private async saveRaceResults(raceId: string, category: Category, classification: any[]) {
    for (const result of classification) {
      // Trova il pilota nel database
      const rider = await prisma.rider.findFirst({
        where: {
          name: {
            contains: result.rider.full_name
          },
          category
        }
      });

      if (!rider) {
        console.warn(`⚠️ Pilota non trovato: ${result.rider.full_name}`);
        continue;
      }

      // Determina lo stato
      let status: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ' = 'FINISHED';
      if (result.status === 'DNS') status = 'DNS';
      else if (result.status === 'DNF' || !result.position) status = 'DNF';
      else if (result.status === 'DSQ') status = 'DSQ';

      // Usa una query diretta invece di upsert con chiave composta
      const existingResult = await prisma.raceResult.findFirst({
        where: {
          raceId,
          riderId: rider.id
        }
      });

      if (existingResult) {
        await prisma.raceResult.update({
          where: { id: existingResult.id },
          data: {
            position: result.position || null,
            status,
            points: 0
          }
        });
      } else {
        await prisma.raceResult.create({
          data: {
            raceId,
            riderId: rider.id,
            position: result.position || null,
            status,
            points: 0
          }
        });
      }
    }
  }

  async calculateTeamScores(raceId: string) {
  try {
    // 1. Ottieni tutti i risultati della gara
    const raceResults = await prisma.raceResult.findMany({
      where: { raceId },
      include: { rider: true }
    });

    if (raceResults.length === 0) {
      console.log('Nessun risultato trovato per la gara');
      return;
    }

    // 2. Crea mappa dei risultati per un accesso rapido
    const resultMap = new Map<string, number>();
    raceResults.forEach(result => {
      resultMap.set(result.riderId, result.position ?? 99 );
    });

    // 3. Ottieni tutti gli schieramenti per questa gara
    const lineups = await prisma.raceLineup.findMany({
      where: { raceId },
      include: {
        lineupRiders: {
          include: { rider: true }
        },
        team: true
      }
    });

    // 4. Ottieni anche tutti i team della lega per gestire quelli senza schieramento
    const race = await prisma.race.findUnique({
      where: { id: raceId }
    });

    if (!race) return;

    // Trova tutti i team nelle leghe attive
    const allTeams = await prisma.team.findMany({
      include: {
        league: true,
        riders: {
          include: { rider: true }
        }
      }
    });

    // 5. Calcola i punteggi per ogni team
    for (const team of allTeams) {
      let totalPoints = 0;
      let lineupToUse = lineups.find(l => l.teamId === team.id);
      let usedFallback = false;

      // Se non c'è uno schieramento per questa gara, usa l'ultimo valido
      if (!lineupToUse) {
        console.log(`Team ${team.name}: nessuno schieramento per questa gara, cerco il precedente...`);
        
        const lastValidLineup = await prisma.raceLineup.findFirst({
          where: {
              teamId: team.id,
              race: {
                  date: { lt: race.date }
              }
          },
          orderBy: { race: { date: 'desc' } },
          include: {
              lineupRiders: {
                  include: { rider: true }
              },
              team: true,
              race: true // Add this line
          }
        });
        
        if (lastValidLineup) {
          console.log(`Team ${team.name}: usa l'ultimo schieramento valido del ${lastValidLineup.race.date}.`);
          lineupToUse = lastValidLineup;
          usedFallback = true;
        } else {
          // Nessuno schieramento trovato - penalità massima
          console.log(`Team ${team.name}: nessuno schieramento precedente, applico penalità massima.`);
          totalPoints = 6 * 99; // 6 piloti * 99 punti (penalità massima)
          
          await prisma.teamScore.upsert({
            where: { teamId_raceId: { teamId: team.id, raceId } },
            update: { 
              totalPoints, 
              calculatedAt: new Date(),
              notes: 'Penalità massima - nessuno schieramento'
            },
            create: { 
              teamId: team.id, 
              raceId, 
              totalPoints,
              notes: 'Penalità massima - nessuno schieramento'
            }
          });
          continue;
        }
      }

      // Calcola i punti per ogni pilota schierato
      for (const lineupRider of lineupToUse.lineupRiders) {
        // Verifica che il pilota sia ancora nel team
        const stillInTeam = team.riders.some(tr => tr.riderId === lineupRider.riderId);
        
        if (!stillInTeam) {
          console.warn(`Pilota ${lineupRider.rider.name} non più nel team, penalità massima`);
          totalPoints += 99;
          continue;
        }

        const actualPosition = resultMap.get(lineupRider.riderId);
        const predictedPosition = lineupRider.predictedPosition;

        if (actualPosition === undefined) {
          console.warn(`Nessun risultato per ${lineupRider.rider.name}`);
          totalPoints += 99;
          continue;
        }

        let points: number;
        if (actualPosition === 99) {
          // Non ha finito la gara (DNF, DNS, DSQ)
          points = 99;
        } else {
          // Punti = posizione arrivo + differenza assoluta dalla previsione
          const basePoints = actualPosition;
          const difference = Math.abs(predictedPosition - actualPosition);
          points = basePoints + difference;
        }

        totalPoints += points;
        console.log(`${lineupRider.rider.name}: previsto ${predictedPosition}°, arrivato ${actualPosition}° = ${points} punti`);
      }

      // Salva o aggiorna il punteggio del team
      await prisma.teamScore.upsert({
        where: {
          teamId_raceId: {
            teamId: team.id,
            raceId
          }
        },
        update: {
          totalPoints,
          calculatedAt: new Date(),
          notes: usedFallback ? 'Usato schieramento precedente' : null
        },
        create: {
          teamId: team.id,
          raceId,
          totalPoints,
          notes: usedFallback ? 'Usato schieramento precedente' : null
        }
      });

      console.log(`Team ${team.name}: ${totalPoints} punti totali${usedFallback ? ' (con schieramento precedente)' : ''}`);
    }

    // 6. Aggiorna le classifiche delle leghe
    await this.updateLeagueStandings(raceId);

  } catch (error) {
    console.error('Errore nel calcolo dei punteggi:', error);
    throw error;
  }
  }

// Nuova funzione per aggiornare le classifiche
private async updateLeagueStandings(raceId: string) {
  try {
    // Trova tutte le leghe con team che hanno punteggi per questa gara
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
      // Calcola i punti totali per ogni team
      const teamStandings = league.teams.map(team => {
        const totalPoints = team.scores.reduce((sum, score) => sum + score.totalPoints, 0);
        return {
          teamId: team.id,
          totalPoints,
          raceCount: team.scores.length
        };
      }).sort((a, b) => a.totalPoints - b.totalPoints); // Ordinamento crescente (meno punti = meglio)

      console.log(`Classifica aggiornata per lega ${league.name}`);
    }
  } catch (error) {
    console.error('Errore aggiornamento classifiche:', error);
  }
}

  // Metodi helper
  private mapLegacyCategory(legacyId: number): Category | null {
    switch (legacyId) {
      case 3: return Category.MOTOGP;
      case 2: return Category.MOTO2;
      case 1: return Category.MOTO3;
      default: return null;
    }
  }

  private calculateRiderValue(apiRider: any): number {
    // Formula semplice basata su risultati passati
    const baseValue = 50;
    const championships = apiRider.championships?.length || 0;
    const wins = apiRider.victories || 0;
    
    return Math.min(200, baseValue + (championships * 30) + (wins * 2));
  }
}

// Esporta istanza singleton
export const motogpApi = new MotoGPApiService();