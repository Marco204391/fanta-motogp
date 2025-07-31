// backend/prisma/seedRaces.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Calendario MotoGP 2025 (aggiorna con le date ufficiali quando disponibili)
const races2025 = [
  {
    name: 'Qatar Airways Grand Prix of Qatar',
    circuit: 'Losail International Circuit',
    country: 'QA',
    date: new Date('2025-03-09T18:00:00Z'),
    sprintDate: new Date('2025-03-08T18:00:00Z'),
    round: 1,
    season: 2025
  },
  {
    name: 'Red Bull Grand Prix of The Americas',
    circuit: 'Circuit of The Americas',
    country: 'US',
    date: new Date('2025-04-13T19:00:00Z'),
    sprintDate: new Date('2025-04-12T20:00:00Z'),
    round: 2,
    season: 2025
  },
  {
    name: 'Grande Prémio de Portugal',
    circuit: 'Autódromo Internacional do Algarve',
    country: 'PT',
    date: new Date('2025-04-27T13:00:00Z'),
    sprintDate: new Date('2025-04-26T14:00:00Z'),
    round: 3,
    season: 2025
  },
  {
    name: 'Gran Premio de España',
    circuit: 'Circuito de Jerez',
    country: 'ES',
    date: new Date('2025-05-04T12:00:00Z'),
    sprintDate: new Date('2025-05-03T13:00:00Z'),
    round: 4,
    season: 2025
  },
  {
    name: 'SHARK Grand Prix de France',
    circuit: 'Le Mans',
    country: 'FR',
    date: new Date('2025-05-18T12:00:00Z'),
    sprintDate: new Date('2025-05-17T13:00:00Z'),
    round: 5,
    season: 2025
  },
  {
    name: 'Gran Premio d\'Italia',
    circuit: 'Autodromo del Mugello',
    country: 'IT',
    date: new Date('2025-06-01T12:00:00Z'),
    sprintDate: new Date('2025-05-31T13:00:00Z'),
    round: 6,
    season: 2025
  },
  {
    name: 'Liqui Moly Motorrad Grand Prix Deutschland',
    circuit: 'Sachsenring',
    country: 'DE',
    date: new Date('2025-06-22T12:00:00Z'),
    sprintDate: new Date('2025-06-21T13:00:00Z'),
    round: 7,
    season: 2025
  },
  {
    name: 'Motul TT Assen',
    circuit: 'TT Circuit Assen',
    country: 'NL',
    date: new Date('2025-06-29T12:00:00Z'),
    sprintDate: new Date('2025-06-28T13:00:00Z'),
    round: 8,
    season: 2025
  },
  {
    name: 'Michelin Grand Prix of Finland',
    circuit: 'KymiRing',
    country: 'FI',
    date: new Date('2025-07-13T12:00:00Z'),
    sprintDate: new Date('2025-07-12T13:00:00Z'),
    round: 9,
    season: 2025
  },
  {
    name: 'Monster Energy British Grand Prix',
    circuit: 'Silverstone Circuit',
    country: 'GB',
    date: new Date('2025-08-03T12:00:00Z'),
    sprintDate: new Date('2025-08-02T13:00:00Z'),
    round: 10,
    season: 2025
  },
  {
    name: 'Bitci Motorrad Grand Prix von Österreich',
    circuit: 'Red Bull Ring',
    country: 'AT',
    date: new Date('2025-08-17T12:00:00Z'),
    sprintDate: new Date('2025-08-16T13:00:00Z'),
    round: 11,
    season: 2025
  },
  {
    name: 'Gran Premio de Aragón',
    circuit: 'MotorLand Aragón',
    country: 'ES',
    date: new Date('2025-09-07T12:00:00Z'),
    sprintDate: new Date('2025-09-06T13:00:00Z'),
    round: 12,
    season: 2025
  },
  {
    name: 'Gran Premio di San Marino e della Riviera di Rimini',
    circuit: 'Misano World Circuit',
    country: 'SM',
    date: new Date('2025-09-14T12:00:00Z'),
    sprintDate: new Date('2025-09-13T13:00:00Z'),
    round: 13,
    season: 2025
  },
  {
    name: 'Grand Prix of Japan',
    circuit: 'Twin Ring Motegi',
    country: 'JP',
    date: new Date('2025-09-28T05:00:00Z'),
    sprintDate: new Date('2025-09-27T06:00:00Z'),
    round: 14,
    season: 2025
  },
  {
    name: 'PTT Thailand Grand Prix',
    circuit: 'Chang International Circuit',
    country: 'TH',
    date: new Date('2025-10-05T07:00:00Z'),
    sprintDate: new Date('2025-10-04T08:00:00Z'),
    round: 15,
    season: 2025
  },
  {
    name: 'Australian Motorcycle Grand Prix',
    circuit: 'Phillip Island',
    country: 'AU',
    date: new Date('2025-10-19T03:00:00Z'),
    sprintDate: new Date('2025-10-18T04:00:00Z'),
    round: 16,
    season: 2025
  },
  {
    name: 'Petronas Grand Prix of Malaysia',
    circuit: 'Sepang International Circuit',
    country: 'MY',
    date: new Date('2025-10-26T07:00:00Z'),
    sprintDate: new Date('2025-10-25T08:00:00Z'),
    round: 17,
    season: 2025
  },
  {
    name: 'Gran Premio de la Comunitat Valenciana',
    circuit: 'Circuit Ricardo Tormo',
    country: 'ES',
    date: new Date('2025-11-09T13:00:00Z'),
    sprintDate: new Date('2025-11-08T14:00:00Z'),
    round: 18,
    season: 2025
  }
];

async function seedRaces() {
  console.log('🏁 Caricamento calendario gare 2025...');
  
  try {
    // Elimina gare esistenti del 2025 (opzionale)
    await prisma.race.deleteMany({
      where: { season: 2025 }
    });
    
    // Inserisci nuove gare
    for (const race of races2025) {
      await prisma.race.create({
        data: race
      });
      console.log(`✅ Aggiunta gara: ${race.name}`);
    }
    
    console.log('🎉 Calendario 2025 caricato con successo!');
  } catch (error) {
    console.error('❌ Errore durante il caricamento del calendario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Esegui il seed
seedRaces();