// backend/scripts/syncLatestRace.ts
import { PrismaClient } from '@prisma/client';
import { motogpApi } from '../src/services/motogpApiService';

const prisma = new PrismaClient();

async function syncLatestRace() {
  console.log('🔥 Inizio sincronizzazione risultati per l\'ultima gara...');

  try {
    const now = new Date();

    // Trova l'ultima gara disputata
    const lastRace = await prisma.race.findFirst({
      where: {
        gpDate: {
          lte: now,
        },
      },
      orderBy: {
        gpDate: 'desc',
      },
    });

    // Trova la prossima gara in programma
    const nextRace = await prisma.race.findFirst({
      where: {
        gpDate: {
          gte: now,
        },
      },
      orderBy: {
        gpDate: 'asc',
      },
    });

    let raceToSync = null;

    if (lastRace && nextRace) {
      const diffLast = now.getTime() - lastRace.gpDate.getTime();
      const diffNext = nextRace.gpDate.getTime() - now.getTime();
      raceToSync = diffLast < diffNext ? lastRace : nextRace;
    } else {
      // Se una delle due non esiste, prende l'altra
      raceToSync = lastRace || nextRace;
    }

    if (!raceToSync) {
      console.log('ℹ️  Nessuna gara trovata nel database per la sincronizzazione.');
      return;
    }

    console.log(`🔄 Sincronizzazione risultati per: ${raceToSync.name} (ID: ${raceToSync.id})`);
    
    // Esegue la sincronizzazione dei risultati per la gara selezionata
    await motogpApi.syncRaceResults(raceToSync.id);
    
    console.log(`👍 Risultati per ${raceToSync.name} sincronizzati con successo.`);

  } catch (error) {
    console.error('❌ Errore critico durante il processo:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🎉 Processo completato!');
  }
}

syncLatestRace();