import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { RaceFromAPI } from '../types';

const prisma = new PrismaClient();
const SPORTRADAR_API_KEY = process.env.SPORTRADAR_API_KEY;
const API_BASE_URL = `https://api.sportradar.com/motogp/trial/v2/en`;

// Funzione per mappare i dati dell'API al nostro modello
const mapRaceData = (apiRace: any): RaceFromAPI => {
  // La mappatura dipenderà dalla struttura reale della risposta dell'API
  // Questo è un esempio basato su una struttura ipotetica
  return {
    id: apiRace.id,
    name: apiRace.description,
    circuit: apiRace.venue.name,
    country: apiRace.venue.country,
    date: new Date(apiRace.scheduled),
    season: new Date(apiRace.scheduled).getFullYear(),
    round: apiRace.parents?.[0]?.number || 0,
    sprintDate: apiRace.sprint ? new Date(apiRace.sprint.scheduled) : undefined,
  };
};

export const syncRaceSchedule = async (season: number) => {
  if (!SPORTRADAR_API_KEY) {
    console.warn('Chiave API Sportradar non configurata. Sincronizzazione saltata.');
    return;
  }

  try {
    const response = await axios.get(`${API_BASE_URL}/seasons/${season}/schedule.json?api_key=${SPORTRADAR_API_KEY}`);
    const apiRaces = response.data.stages;

    for (const apiRace of apiRaces) {
      const raceData = mapRaceData(apiRace);

      await prisma.race.upsert({
        where: { id: raceData.id }, // Assumendo che l'API fornisca un ID stabile
        update: raceData,
        create: raceData,
      });
    }
    console.log(`✅ Sincronizzate ${apiRaces.length} gare per la stagione ${season}.`);
  } catch (error) {
    console.error('Errore durante la sincronizzazione del calendario gare:', error);
  }
};

export const syncCurrentSeasonRaceSchedule = async () => {
  const currentYear = new Date().getFullYear();
  await syncRaceSchedule(currentYear);
};

// In futuro aggiungeremo qui:
// - syncRaceResults(raceId: string)
// - syncRiderList()