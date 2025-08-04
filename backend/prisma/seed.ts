// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { motogpApi } from '../src/services/motogpApiService';

const prisma = new PrismaClient();

async function main() {
  console.log('🏍️  Inizio seed del database Fanta MotoGP per la stagione corrente...');
  
  try {
    const currentYear = new Date().getFullYear();

    // 1. Sincronizzazione Piloti
    console.log('🔄 Sincronizzazione piloti in corso...');
    await motogpApi.syncRiders();
    console.log('✅ Piloti sincronizzati con successo.');

    // 2. Sincronizzazione Calendario Gare per l'intera stagione corrente
    console.log(`📅 Sincronizzazione calendario completo per la stagione ${currentYear}...`);
    // Sincronizza sia le gare concluse (finished = true) che quelle future (finished = false)
    await motogpApi.syncRaceCalendar(currentYear, true);
    await motogpApi.syncRaceCalendar(currentYear, false);
    console.log(`✅ Calendario per la stagione ${currentYear} sincronizzato.`);

    // 3. Recupero dei risultati per tutte le gare già terminate della stagione corrente
    console.log(`📊 Recupero risultati per le gare già disputate nella stagione ${currentYear}...`);
    const finishedRaces = await prisma.race.findMany({
      where: {
        season: currentYear,
        gpDate: {
          lt: new Date() // Cerca gare la cui data è passata
        }
      }
    });

    if (finishedRaces.length > 0) {
      for (const race of finishedRaces) {
        try {
          console.log(`  -> Sincronizzazione risultati per: ${race.name}`);
          await motogpApi.syncRaceResults(race.id);
        } catch (error) {
          console.error(`❌ Errore durante la sincronizzazione dei risultati per ${race.name}:`, error);
        }
      }
      console.log(`✅ Risultati recuperati per ${finishedRaces.length} gare.`);
    } else {
      console.log('ℹ️  Nessuna gara ancora disputata in questa stagione.');
    }

  } catch (error) {
    console.error('❌ Errore durante il processo di seed:', error);
    process.exit(1);
  } finally {
    console.log('🎉 Seed completato con successo!');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });