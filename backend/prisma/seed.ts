// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { motogpApi } from '../src/services/motogpApiService';

const prisma = new PrismaClient();

async function main() {
  console.log('🏍️  Inizio seed del database Fanta MotoGP per la stagione corrente...');
  
  try {
    // 1. Sincronizzazione Piloti
    console.log('🔄 Sincronizzazione piloti in corso...');
    await motogpApi.syncRiders();
    console.log('✅ Piloti sincronizzati con successo.');

    // 2. Sincronizzazione Calendario Gare per la stagione corrente
    const currentYear = new Date().getFullYear();

    console.log(`📅 Sincronizzazione gare già disputate per la stagione ${currentYear}...`);
    await motogpApi.syncRaceCalendar(currentYear, true); // Carica le gare concluse (finished = true)

    console.log(`📅 Sincronizzazione gare in programma per la stagione ${currentYear}...`);
    await motogpApi.syncRaceCalendar(currentYear, false); // Carica le gare future (finished = false)
    
    console.log(`✅ Calendario completo per la stagione ${currentYear} sincronizzato.`);

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