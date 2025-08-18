// backend/scripts/calculateScores.ts
import { PrismaClient, SessionType } from '@prisma/client';
import { motogpApi } from '../src/services/motogpApiService';

const prisma = new PrismaClient();

async function calculateScoresForLatestRace() {
  console.log('🔥 Inizio calcolo punteggi per l\'ultima gara conclusa...');

  try {
    const raceToProcess = await prisma.race.findFirst({
      where: {
        gpDate: {
          lt: new Date(),
        },
        results: {
          some: {},
        },
      },
      orderBy: {
        gpDate: 'desc',
      },
    });

    if (!raceToProcess) {
      console.log('ℹ️  Nessuna gara trovata da elaborare. Assicurati che i risultati siano sincronizzati.');
      return;
    }

    console.log(`🚀 Calcolo punteggi per: ${raceToProcess.name} (ID: ${raceToProcess.id})`);

    // Esegue il calcolo dei punteggi per la gara
    await motogpApi.calculateTeamScores(raceToProcess.id, SessionType.RACE);

    console.log(`👍 Punteggi per ${raceToProcess.name} calcolati con successo.`);

  } catch (error) {
    console.error('❌ Errore critico durante il processo di calcolo:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🎉 Processo completato!');
  }
}

calculateScoresForLatestRace();