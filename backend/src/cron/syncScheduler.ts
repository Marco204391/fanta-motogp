// backend/src/jobs/syncScheduler.ts
import cron from 'node-cron';
import { motogpApi } from '../services/motogpApiService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SyncScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  start() {
    console.log('🚀 Avvio scheduler sincronizzazioni MotoGP...');

    // 1. Sincronizza piloti ogni lunedì alle 3:00 AM
    this.jobs.set('riders', cron.schedule('0 3 * * 1', async () => {
      console.log('⏰ Sincronizzazione piloti programmata...');
      try {
        await motogpApi.syncRiders();
      } catch (error) {
        console.error('Errore sync piloti:', error);
      }
    }));

    // 2. Sincronizza calendario ogni martedì alle 3:00 AM
    this.jobs.set('calendar', cron.schedule('0 3 * * 2', async () => {
      console.log('⏰ Sincronizzazione calendario programmata...');
      try {
        await motogpApi.syncRaceCalendar();
      } catch (error) {
        console.error('Errore sync calendario:', error);
      }
    }));
    
    // 3. Controlla risultati ogni 2 ore il venerdì
    this.jobs.set('results-friday', cron.schedule('0 */2 * * 5', async () => {
        console.log('⏰ Controllo risultati gare (venerdì)...');
        try {
            await this.checkAndSyncRaceResults();
        } catch (error) {
            console.error('Errore sync risultati venerdì:', error);
        }
    }));

    // 4. Controlla risultati ogni 2 ore il sabato
    this.jobs.set('results-saturday', cron.schedule('0 */2 * * 6', async () => {
        console.log('⏰ Controllo risultati gare (sabato)...');
        try {
            await this.checkAndSyncRaceResults();
        } catch (error) {
            console.error('Errore sync risultati sabato:', error);
        }
    }));

    // 5. Controlla risultati gare ogni 2 ore la domenica (giorno gara)
    this.jobs.set('results-sunday', cron.schedule('0 */2 * * 0', async () => {
      console.log('⏰ Controllo risultati gare (domenica)...');
      try {
        await this.checkAndSyncRaceResults();
      } catch (error) {
        console.error('Errore sync risultati domenica:', error);
      }
    }));

    // 6. Controlla risultati anche il lunedì per gare posticipate
    this.jobs.set('results-monday', cron.schedule('0 */4 * * 1', async () => {
      console.log('⏰ Controllo risultati gare (lunedì)...');
      try {
        await this.checkAndSyncRaceResults();
      } catch (error) {
        console.error('Errore sync risultati lunedì:', error);
      }
    }));

    console.log('✅ Scheduler avviato con successo');
  }

  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs.clear();
    console.log('🛑 Scheduler fermato');
  }

  private async checkAndSyncRaceResults() {
    // Trova le gare che si sono svolte negli ultimi 3 giorni.
    // Questo approccio cattura l'intero weekend di gara (ven-dom)
    // e permette di aggiornare i risultati delle varie sessioni (FP, Q, Sprint, Race).
    const racesToSync = await prisma.race.findMany({
      where: {
        gpDate: {
          gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Da 3 giorni fa
          lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)  // Fino a 2 giorni nel futuro
        }
      },
      orderBy: { gpDate: 'desc' }
    });

    for (const race of racesToSync) {
      try {
        console.log(`📊 Tentativo sync risultati per: ${race.name}`);
        await motogpApi.syncRaceResults(race.id);
        
        // Notifica solo se la gara principale è finita e ci sono risultati
        const raceResultsCount = await prisma.raceResult.count({ where: { raceId: race.id, session: 'RACE' }});
        if (new Date() > new Date(race.gpDate) && raceResultsCount > 0) {
            await this.notifyUsersAboutResults(race);
        }
        
      } catch (error) {
        console.error(`Errore sync risultati ${race.name}:`, error);
      }
    }
  }

  private async notifyUsersAboutResults(race: any) {
    // Controlla se le notifiche per questa gara sono già state inviate
    const existingNotification = await prisma.notification.findFirst({
        where: {
            message: { contains: `I risultati di ${race.name} sono ora disponibili.` },
            type: 'RACE_RESULTS'
        }
    });

    if (existingNotification) {
        console.log(`📬 Notifiche per ${race.name} già inviate. Salto.`);
        return;
    }

    // Trova tutti gli utenti con team in leghe attive
    const users = await prisma.user.findMany({
      where: {
        teams: {
          some: {
            league: {
              // Assumiamo che se non ci sono date, la lega sia sempre attiva
            }
          }
        }
      }
    });

    // Crea notifiche per ogni utente
    for (const user of users) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Risultati disponibili!',
          message: `I risultati di ${race.name} sono ora disponibili. Controlla i tuoi punteggi!`,
          type: 'RACE_RESULTS'
        }
      });
    }
  }
}

// Singleton instance
export const syncScheduler = new SyncScheduler();