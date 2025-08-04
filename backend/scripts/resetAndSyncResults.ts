// backend/scripts/resetAndSyncResults.ts
import { PrismaClient } from '@prisma/client';
import { motogpApi } from '../src/services/motogpApiService';

const prisma = new PrismaClient();

async function resetAndSyncResults() {
  console.log('🔥 Inizio reset e re-sync dei risultati di gara...');

  try {
    // 1. Cancella tutti i risultati esistenti
    console.log('🗑️  Cancellazione di tutti i record in RaceResult...');
    const { count } = await prisma.raceResult.deleteMany({});
    console.log(`✅ Cancellati ${count} record.`);

    // 2. Trova le gare passate della stagione corrente
    const currentYear = new Date().getFullYear();
    console.log(`🔍 Ricerca delle gare già disputate per la stagione ${currentYear}...`);
    const finishedRaces = await prisma.race.findMany({
      where: {
        season: currentYear,
        gpDate: {
          lt: new Date() // Cerca gare la cui data è passata
        }
      },
      orderBy: {
        gpDate: 'asc'
      }
    });

    if (finishedRaces.length === 0) {
      console.log('ℹ️  Nessuna gara ancora disputata in questa stagione. Nessun risultato da sincronizzare.');
      return;
    }

    console.log(`Found ${finishedRaces.length} gare da sincronizzare.`);

    // 3. Sincronizza i risultati per ogni gara trovata
    for (const race of finishedRaces) {
      try {
        console.log(`🔄 Sincronizzazione risultati per: ${race.name} (ID: ${race.id})`);
        await motogpApi.syncRaceResults(race.id);
        console.log(`👍 Risultati per ${race.name} sincronizzati con successo.`);
      } catch (error) {
        console.error(`❌ Errore durante la sincronizzazione dei risultati per ${race.name}:`, error);
      }
    }

  } catch (error) {
    console.error('❌ Errore critico durante il processo:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🎉 Processo completato!');
  }
}

resetAndSyncResults();