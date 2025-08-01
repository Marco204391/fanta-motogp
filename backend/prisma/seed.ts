// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { motogpApi } from '../src/services/motogpApiService';

const prisma = new PrismaClient();

async function main() {
  console.log('🏍️  Inizio seed del database Fanta MotoGP tramite API ufficiali...');
  
  try {
    // 1. Sincronizzazione Piloti
    console.log('🔄 Sincronizzazione piloti in corso...');
    await motogpApi.syncRiders();
    console.log('✅ Piloti sincronizzati con successo.');

    // 2. Sincronizzazione Calendario Gare (per la stagione corrente)
    console.log('📅 Sincronizzazione calendario gare in corso...');
    await motogpApi.syncRaceCalendar();
    console.log('✅ Calendario gare sincronizzato con successo.');

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