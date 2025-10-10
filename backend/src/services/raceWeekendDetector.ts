// backend/src/services/raceWeekendDetector.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class RaceWeekendDetector {
  /**
   * Verifica se siamo attualmente in un weekend di gara
   * Logica: controlla se la prossima gara è nei prossimi 3 giorni
   * o se l'ultima gara è stata negli ultimi 2 giorni
   */
  async isRaceWeekend(): Promise<{ isRaceWeekend: boolean; raceId?: string; race?: any }> {
    const now = new Date();

    const nextRace = await prisma.race.findFirst({
      where: {
        gpDate: {
          gte: now
        }
      },
      orderBy: {
        gpDate: 'asc'
      }
    });

    if (nextRace) {
      const daysUntilRace = this.getDaysDifference(now, nextRace.gpDate);
      
      if (daysUntilRace <= 3) {
        console.log(`✅ Weekend di gara in corso: ${nextRace.name} (tra ${daysUntilRace} giorni)`);
        return { 
          isRaceWeekend: true, 
          raceId: nextRace.id,
          race: nextRace
        };
      }
    }

    const lastRace = await prisma.race.findFirst({
      where: {
        gpDate: {
          lt: now
        }
      },
      orderBy: {
        gpDate: 'desc'
      }
    });

    if (lastRace) {
      const daysSinceRace = this.getDaysDifference(lastRace.gpDate, now);
      
      if (daysSinceRace <= 2) {
        console.log(`✅ Weekend di gara appena concluso: ${lastRace.name} (${daysSinceRace} giorni fa)`);
        return { 
          isRaceWeekend: true, 
          raceId: lastRace.id,
          race: lastRace
        };
      }
    }

    console.log(`🏖️ Nessuna gara questo weekend`);
    return { isRaceWeekend: false };
  }

  /**
   * Calcola la differenza in giorni tra due date
   */
  private getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}

export const raceWeekendDetector = new RaceWeekendDetector();