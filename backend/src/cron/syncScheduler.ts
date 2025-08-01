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

    // 3. Controlla risultati gare ogni 2 ore la domenica (giorno gara)
    this.jobs.set('results', cron.schedule('0 */2 * * 0', async () => {
      console.log('⏰ Controllo risultati gare...');
      try {
        await this.checkAndSyncRaceResults();
      } catch (error) {
        console.error('Errore sync risultati:', error);
      }
    }));

    // 4. Controlla risultati anche il lunedì per gare posticipate
    this.jobs.set('results-monday', cron.schedule('0 */4 * * 1', async () => {
      console.log('⏰ Controllo risultati gare (lunedì)...');
      try {
        await this.checkAndSyncRaceResults();
      } catch (error) {
        console.error('Errore sync risultati:', error);
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
    // Trova gare completate senza risultati
    const racesWithoutResults = await prisma.race.findMany({
      where: {
        date: {
          lt: new Date(),
          gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Ultima settimana
        },
        results: { none: {} }
      },
      orderBy: { date: 'desc' }
    });

    for (const race of racesWithoutResults) {
      try {
        console.log(`📊 Tentativo sync risultati per: ${race.name}`);
        await motogpApi.syncRaceResults(race.id);
        
        // Notifica gli utenti che i risultati sono disponibili
        await this.notifyUsersAboutResults(race);
        
      } catch (error) {
        console.error(`Errore sync risultati ${race.name}:`, error);
      }
    }
  }

  private async notifyUsersAboutResults(race: any) {
    // Trova tutti gli utenti con team in leghe attive
    const users = await prisma.user.findMany({
      where: {
        teams: {
          some: {
            league: {
              startDate: { lte: new Date() },
              endDate: { gte: new Date() }
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

// Aggiungi al file di avvio del server
// backend/src/server.ts
/*
import { syncScheduler } from './jobs/syncScheduler';

// Dopo aver avviato il server
syncScheduler.start();

// Gestione graceful shutdown
process.on('SIGTERM', () => {
  syncScheduler.stop();
  // ... altro cleanup
});
*/