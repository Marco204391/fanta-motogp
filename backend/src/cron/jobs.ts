// backend/src/cron/jobs.ts
import cron from 'node-cron';
import { syncCurrentSeasonRaceSchedule } from '../services/dataSyncService';
import { processRaceResults } from '../services/scoringService';

// Sincronizza il calendario gare ogni giorno alle 3:00
cron.schedule('0 3 * * *', () => {
  console.log('📅 Eseguo sincronizzazione calendario gare...');
  syncCurrentSeasonRaceSchedule();
});

// Esegue il calcolo dei punteggi per le gare concluse ma non ancora processate.
// Esempio: eseguito ogni 6 ore.
cron.schedule('0 */6 * * *', () => {
  console.log('🏁 Avvio processo calcolo punteggi...');
  // Logica per trovare l'ID dell'ultima gara conclusa e avviare processRaceResults(raceId)
});