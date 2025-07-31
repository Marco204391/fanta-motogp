// backend/src/services/motogpApiService.ts
import axios from 'axios';
import { Category, PrismaClient } from '@prisma/client';

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

// Mappatura categorie API -> Database
const CATEGORY_MAPPING: Record<string, Category> = {
  'e8c110ad-64aa-4e8e-8a86-f2f152f6a942': Category.MOTOGP,
  '549640b8-fd9c-4245-acfd-60e4bc38b25c': Category.MOTO2,
  '954f7e65-2ef2-4423-b949-4961cc603e45': Category.MOTO3,
};

export class MotoGPApiService {
  private axiosInstance = axios.create({
    baseURL: config.baseUrl,
    timeout: 10000,
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'FantaMotoGP/1.0'
    }
  });

  // 1. Sincronizza i piloti dal MotoGP API
  async syncRiders() {
    try {
      console.log('🏍️ Sincronizzazione piloti in corso...');
      
      // Ottieni tutti i piloti dalla API
      const response = await this.axiosInstance.get('/riders');
      const riders = response.data;

      for (const apiRider of riders) {
        // Solo piloti attivi nelle categorie che ci interessano
        if (!apiRider.current_career_step?.in_grid) continue;
        
        const categoryId = apiRider.current_career_step?.category?.legacy_id;
        const category = this.mapLegacyCategory(categoryId);
        
        if (!category) continue;

        // Calcola il valore del pilota basato su vari fattori
        const value = this.calculateRiderValue(apiRider);

        await prisma.rider.upsert({
          where: { 
            number: apiRider.current_career_step.number 
          },
          update: {
            name: `${apiRider.name} ${apiRider.surname}`,
            team: apiRider.current_career_step.sponsored_team,
            category,
            nationality: apiRider.country.iso,
            value,
            isActive: true,
            photoUrl: apiRider.current_career_step.pictures?.portrait
          },
          create: {
            name: `${apiRider.name} ${apiRider.surname}`,
            number: apiRider.current_career_step.number,
            team: apiRider.current_career_step.sponsored_team,
            category,
            nationality: apiRider.country.iso,
            value,
            isActive: true,
            photoUrl: apiRider.current_career_step.pictures?.portrait
          }
        });

        console.log(`✅ Sincronizzato: ${apiRider.name} ${apiRider.surname} (#${apiRider.current_career_step.number})`);
      }

      console.log('🎉 Sincronizzazione piloti completata!');
      return { success: true, message: 'Piloti sincronizzati con successo' };
    } catch (error) {
      console.error('❌ Errore sincronizzazione piloti:', error);
      throw error;
    }
  }

  // 2. Sincronizza calendario gare
  async syncRaceCalendar(seasonYear: number = new Date().getFullYear()) {
    try {
      console.log(`📅 Sincronizzazione calendario ${seasonYear}...`);
      
      // Prima ottieni l'ID della stagione
      const seasonsResponse = await axios.get(`${config.resultsApi}/seasons`);
      const season = seasonsResponse.data.find((s: any) => s.year === seasonYear);
      
      if (!season) {
        throw new Error(`Stagione ${seasonYear} non trovata`);
      }

      // Poi ottieni gli eventi della stagione
      const eventsResponse = await axios.get(`${config.resultsApi}/events?seasonUuid=${season.id}`);
      const events = eventsResponse.data;

      // Ottieni anche gli eventi broadcast per date più precise
      const broadcastResponse = await this.axiosInstance.get(`/events?seasonYear=${seasonYear}`);
      const broadcastEvents = broadcastResponse.data;

      for (const [index, event] of events.entries()) {
        // Trova l'evento broadcast corrispondente
        const broadcastEvent = broadcastEvents.find((be: any) => 
          be.name?.toLowerCase().includes(event.country.name.toLowerCase()) ||
          be.circuit?.name === event.circuit.name
        );

        // Estrai date delle gare
        const raceDate = this.extractRaceDate(broadcastEvent);
        const sprintDate = this.extractSprintDate(broadcastEvent);

        if (!raceDate) continue;

        await prisma.race.upsert({
          where: {
            season_round: {
              season: seasonYear,
              round: index + 1
            }
          },
          update: {
            name: event.sponsored_name || event.name,
            circuit: event.circuit.name,
            country: event.country.iso,
            date: raceDate,
            sprintDate: sprintDate,
            apiEventId: event.id,
            apiBroadcastId: broadcastEvent?.id
          },
          create: {
            name: event.sponsored_name || event.name,
            circuit: event.circuit.name,
            country: event.country.iso,
            date: raceDate,
            sprintDate: sprintDate,
            round: index + 1,
            season: seasonYear,
            apiEventId: event.id,
            apiBroadcastId: broadcastEvent?.id
          }
        });

        console.log(`✅ Sincronizzata gara: ${event.sponsored_name} (Round ${index + 1})`);
      }

      console.log('🎉 Calendario sincronizzato!');
      return { success: true, message: 'Calendario sincronizzato con successo' };
    } catch (error) {
      console.error('❌ Errore sincronizzazione calendario:', error);
      throw error;
    }
  }

  // 3. Recupera risultati di una sessione specifica
  async getSessionResults(sessionId: string, isTest: boolean = false) {
    try {
      const response = await axios.get(
        `${config.resultsApi}/session/${sessionId}/classification?test=${isTest}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Errore recupero risultati sessione:', error);
      throw error;
    }
  }

  // 4. Sincronizza risultati di una gara
  async syncRaceResults(raceId: string) {
    try {
      console.log('🏁 Sincronizzazione risultati gara...');
      
      // Recupera la gara dal database
      const race = await prisma.race.findUnique({
        where: { id: raceId }
      });

      if (!race || !race.apiEventId) {
        throw new Error('Gara non trovata o mancante di API ID');
      }

      // Ottieni le categorie per questo evento
      const categoriesResponse = await axios.get(
        `${config.resultsApi}/categories?eventUuid=${race.apiEventId}`
      );
      const categories = categoriesResponse.data;

      // Per ogni categoria, ottieni le sessioni
      for (const category of categories) {
        const dbCategory = CATEGORY_MAPPING[category.id];
        if (!dbCategory) continue;

        // Ottieni sessioni per categoria
        const sessionsResponse = await axios.get(
          `${config.resultsApi}/sessions?eventUuid=${race.apiEventId}&categoryUuid=${category.id}`
        );
        const sessions = sessionsResponse.data;

        // Trova la sessione della gara (tipo 'RAC')
        const raceSession = sessions.find((s: any) => s.type === 'RAC');
        if (!raceSession) continue;

        // Ottieni classifiche
        const results = await this.getSessionResults(raceSession.id);
        
        // Salva risultati nel database
        await this.saveRaceResults(race.id, dbCategory, results.classification);
      }

      // Calcola punteggi dei team
      await this.calculateTeamScores(race.id);

      console.log('🎉 Risultati sincronizzati e punteggi calcolati!');
      return { success: true, message: 'Risultati sincronizzati con successo' };
    } catch (error) {
      console.error('❌ Errore sincronizzazione risultati:', error);
      throw error;
    }
  }

  // 5. Salva risultati nel database
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

      await prisma.raceResult.upsert({
        where: {
          raceId_riderId: {
            raceId,
            riderId: rider.id
          }
        },
        update: {
          position: result.position || null,
          status,
          points: 0 // I punti del campionato reale, non del fantacampionato
        },
        create: {
          raceId,
          riderId: rider.id,
          position: result.position || null,
          status,
          points: 0
        }
      });
    }
  }

  private async calculateTeamScores(raceId: string) {
    // Ottieni tutti gli schieramenti per questa gara
    const lineups = await prisma.raceLineup.findMany({
      where: { raceId },
      include: {
        lineupRiders: {
          include: {
            rider: true
          }
        },
        team: true
      }
    });

    // Ottieni i risultati della gara
    const raceResults = await prisma.raceResult.findMany({
      where: { raceId }
    });

    // Mappa riderId -> posizione reale (99 se non ha finito)
    const resultMap = new Map<string, number>();
    raceResults.forEach(result => {
      if (result.status === 'FINISHED' && result.position) {
        resultMap.set(result.riderId, result.position);
      } else {
        // DNF, DNS, DSQ = massimo punteggio (99)
        resultMap.set(result.riderId, 99);
      }
    });

    // Calcola punteggi per ogni team
    for (const lineup of lineups) {
      let totalPoints = 0;
      const riderScores: any[] = [];

      // Se non c'è schieramento per questa gara, usa l'ultimo valido
      let actualLineup = lineup;
      if (lineup.lineupRiders.length === 0) {
        const lastValidLineup = await prisma.raceLineup.findFirst({
          where: {
            teamId: lineup.teamId,
            lineupRiders: { some: {} },
            race: { date: { lt: (await prisma.race.findUnique({ where: { id: raceId } }))!.date } }
          },
          orderBy: { race: { date: 'desc' } },
          include: {
            lineupRiders: {
              include: { rider: true }
            }
          }
        });

        if (!lastValidLineup) {
          console.log(`Team ${lineup.team.name} non ha schieramenti validi, skip`);
          continue;
        }
        actualLineup = lastValidLineup;
      }

      // Calcola punti per ogni pilota schierato
      for (const lineupRider of actualLineup.lineupRiders) {
        const actualPosition = resultMap.get(lineupRider.riderId);
        const predictedPosition = lineupRider.predictedPosition;

        if (!actualPosition) {
          console.warn(`Nessun risultato trovato per il pilota ${lineupRider.rider.name}`);
          continue;
        }

        // CALCOLO PUNTI SECONDO REGOLAMENTO CORRETTO:
        // Se il pilota non finisce (posizione 99) = 99 punti
        // Altrimenti: punti = posizione arrivo + differenza assoluta tra previsto e reale
        
        let points: number;
        if (actualPosition === 99) {
          // Non ha finito la gara (DNF, DNS, DSQ)
          points = 99;
        } else {
          // Ha finito la gara
          const basePoints = actualPosition; // Posizione di arrivo
          const differenza = Math.abs(predictedPosition - actualPosition);
          points = basePoints + differenza;
        }

        riderScores.push({
          riderId: lineupRider.riderId,
          riderName: lineupRider.rider.name,
          predictedPosition,
          actualPosition,
          points,
          category: lineupRider.rider.category
        });

        totalPoints += points;
      }

      // Verifica di aver calcolato punti per 6 piloti
      if (riderScores.length !== 6) {
        console.warn(`Team ${lineup.team.name} ha solo ${riderScores.length} piloti schierati`);
      }

      // Salva o aggiorna il punteggio del team
      await prisma.teamScore.upsert({
        where: {
          teamId_raceId: {
            teamId: lineup.teamId,
            raceId
          }
        },
        update: {
          totalPoints,
          riderScores,
          calculatedAt: new Date()
        },
        create: {
          teamId: lineup.teamId,
          raceId,
          totalPoints,
          riderScores
        }
      });

      console.log(`Team ${lineup.team.name}: ${totalPoints} punti totali`);
    }
  }

  // Sincronizza risultati da API MotoGP
  async syncRaceResults(raceId: string) {
    try {
      const race = await prisma.race.findUnique({
        where: { id: raceId }
      });

      if (!race || !race.apiEventId) {
        throw new Error('Gara non trovata o mancano dati API');
      }

      // Chiamata API per ottenere i risultati
      // Nota: L'endpoint esatto dipende dalla documentazione API MotoGP
      const categories = ['MOTOGP', 'MOTO2', 'MOTO3'];
      
      for (const category of categories) {
        const response = await axios.get(
          `${this.baseUrl}/results/${race.apiEventId}/${category}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Accept': 'application/json'
            }
          }
        );

        if (response.data && response.data.classification) {
          await this.saveRaceResults(raceId, category as Category, response.data.classification);
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

  // Salva risultati nel database
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

      await prisma.raceResult.upsert({
        where: {
          raceId_riderId: {
            raceId,
            riderId: rider.id
          }
        },
        update: {
          position: result.position || null,
          status,
          points: 0 // I punti del campionato reale, non del fantacampionato
        },
        create: {
          raceId,
          riderId: rider.id,
          position: result.position || null,
          status,
          points: 0
        }
      });
    }
  }

  // Altri metodi utility...
  private mapLegacyCategory(legacyId: number): Category | null {
    switch(legacyId) {
      case 3: return Category.MOTOGP;
      case 2: return Category.MOTO2;
      case 1: return Category.MOTO3;
      default: return null;
    }
  }

  private calculateRiderValue(apiRider: any): number {
    const baseValue = apiRider.current_career_step.category.legacy_id === 3 ? 50 : 
                     apiRider.current_career_step.category.legacy_id === 2 ? 30 : 20;
    
    const numberBonus = Math.max(0, 50 - apiRider.current_career_step.number) * 2;
    const randomFactor = Math.floor(Math.random() * 20) - 10;
    
    return Math.max(10, baseValue + numberBonus + randomFactor);
  }
}

// Singleton instance
export const motogpApi = new MotogpApiService();