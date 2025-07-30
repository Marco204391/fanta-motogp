// backend/src/services/scoringService.ts
import { PrismaClient, RaceLineup } from '@prisma/client';

const prisma = new PrismaClient();

// Calcola i punti per un singolo pilota
const calculateRiderPoints = (predictedPosition: number, actualPosition: number | null, maxPoints: number): number => {
  // Se il pilota non ha terminato la gara (DNF), riceve il massimo dei punti
  if (actualPosition === null) {
    return maxPoints;
  }
  const positionDifference = Math.abs(predictedPosition - actualPosition);
  return actualPosition + positionDifference;
};

export const processRaceResults = async (raceId: string) => {
  // 1. Recupera la gara e tutti i suoi risultati ufficiali
  // 2. Trova tutti i team che devono essere calcolati per questa gara
  // 3. Per ogni team:
  //    a. Cerca lo schieramento per la gara corrente
  //    b. Se non esiste, trova l'ultimo schieramento valido della stessa stagione
  //    c. Se esiste uno schieramento valido:
  //       i. Itera sui piloti schierati
  //       ii. Per ogni pilota, calcola i punti con la funzione calculateRiderPoints
  //       iii. Somma i punti e crea un record in TeamScore
};