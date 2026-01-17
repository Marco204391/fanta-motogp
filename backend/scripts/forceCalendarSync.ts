// backend/scripts/forceCalendarSync.ts
import { motogpApi } from '../src/services/motogpApiService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function forceSync() {
  // Puoi cambiare 2025 con l'anno che ti interessa
  const SEASON = new Date().getFullYear(); 
  
  console.log(`🚀 Forzatura sincronizzazione Calendario ${SEASON} avviata...`);

  try {
    // Chiama direttamente il servizio esistente
    await motogpApi.syncRaceCalendar(SEASON);
    
    console.log(`✅ Calendario ${SEASON} importato con successo nel database!`);
  } catch (error) {
    console.error('❌ Errore durante la sincronizzazione:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

forceSync();