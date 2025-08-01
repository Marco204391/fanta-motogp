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
    } catch (error) {
      console.error('❌ Errore sincronizzazione piloti:', error);
      throw error;
    }
  }

  // 2. Sincronizza calendario gare
  async syncRaceCalendar(season: number = new Date().getFullYear()) {
    try {
      console.log(`📅 Sincronizzazione calendario ${season}...`);
      
      // Prima ottieni l'ID della stagione
      const seasonsResponse = await this.axiosInstance.get('/results/seasons');
      const currentSeason = seasonsResponse.data.find((s: any) => s.year === season);
      
      if (!currentSeason) {
        throw new Error(`Stagione ${season} non trovata`);
      }

      // Ottieni gli eventi della stagione
      const eventsResponse = await this.axiosInstance.get(
        `/results/events?seasonUuid=${currentSeason.id}&isFinished=false`
      );

      for (const event of eventsResponse.data) {
        await prisma.race.upsert({
          where: {
            apiEventId: event.id,
          },
          update: {
            name: event.name,
            circuit: event.circuit.name,
            country: event.country.name,
            date: new Date(event.date_end),
            sprintDate: event.date_start ? new Date(event.date_start) : null,
            round: event.number || 0,
            season: season,
          },
          create: {
            name: event.name,
            circuit: event.circuit.name,
            country: event.country.name,
            date: new Date(event.date_end),
            sprintDate: event.date_start ? new Date(event.date_start) : null,
            round: event.number || 0,
            season: season,
            apiEventId: event.id,
          }
        });

        console.log(`✅ Sincronizzato evento: ${event.name}`);
      }

      console.log('🎉 Calendario sincronizzato!');
    } catch (error) {
      console.error('❌ Errore sincronizzazione calendario:', error);
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

  // 5. Calcola punteggi fantacalcio
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
        resultMap.set(result.riderId, 99);
      }
    });

    // Calcola punteggi per ogni team
    for (const lineup of lineups) {
      let totalPoints = 0;
      let lineupToUse = lineup;

      // Se lo schieramento è vuoto, cerca l'ultimo valido
      if (lineup.lineupRiders.length === 0) {
        const currentRace = await prisma.race.findUnique({ where: { id: raceId } });
        const lastValidLineup = await prisma.raceLineup.findFirst({
          where: {
            teamId: lineup.teamId,
            lineupRiders: { some: {} },
            race: { date: { lt: currentRace!.date } }
          },
          orderBy: { race: { date: 'desc' } },
          include: {
            lineupRiders: {
              include: { rider: true }
            },
            team: true
          }
        });
        
        if (lastValidLineup) {
          console.log(`Team ${lineup.team.name}: usa l'ultimo schieramento valido.`);
          lineupToUse = lastValidLineup;
        } else {
          // Nessuno schieramento trovato - penalità massima
          totalPoints = 6 * 99; // 6 piloti * 99 punti
          
          await prisma.teamScore.upsert({
            where: { teamId_raceId: { teamId: lineup.teamId, raceId } },
            update: { totalPoints, calculatedAt: new Date() },
            create: { teamId: lineup.teamId, raceId, totalPoints }
          });
          continue;
        }
      }

      // Calcola i punti per ogni pilota schierato
      for (const lineupRider of lineupToUse.lineupRiders) {
        const actualPosition = resultMap.get(lineupRider.riderId);
        const predictedPosition = lineupRider.predictedPosition;

        if (actualPosition === undefined) {
          console.warn(`Nessun risultato per ${lineupRider.rider.name}`);
          totalPoints += 99;
          continue;
        }

        let points: number;
        if (actualPosition === 99) {
          // Non ha finito la gara
          points = 99;
        } else {
          // Punti = posizione arrivo + differenza assoluta
          const basePoints = actualPosition;
          const difference = Math.abs(predictedPosition - actualPosition);
          points = basePoints + difference;
        }

        totalPoints += points;
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
          calculatedAt: new Date()
        },
        create: {
          teamId: lineup.teamId,
          raceId,
          totalPoints
        }
      });

      console.log(`Team ${lineup.team.name}: ${totalPoints} punti totali`);
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