// backend/prisma/seed.ts
import { PrismaClient, Category } from '@prisma/client';

const prisma = new PrismaClient();

// Dati piloti stagione 2024/2025
const riders = [
  // MOTOGP
  {
    name: 'Francesco Bagnaia',
    number: 1,
    team: 'Ducati Lenovo Team',
    category: Category.MOTOGP,
    nationality: 'IT',
    value: 35000000,
  },
  {
    name: 'Jorge Martin',
    number: 89,
    team: 'Prima Pramac Racing',
    category: Category.MOTOGP,
    nationality: 'ES',
    value: 32000000,
  },
  {
    name: 'Marc Marquez',
    number: 93,
    team: 'Gresini Racing MotoGP',
    category: Category.MOTOGP,
    nationality: 'ES',
    value: 30000000,
  },
  {
    name: 'Enea Bastianini',
    number: 23,
    team: 'Ducati Lenovo Team',
    category: Category.MOTOGP,
    nationality: 'IT',
    value: 28000000,
  },
  {
    name: 'Brad Binder',
    number: 33,
    team: 'Red Bull KTM Factory Racing',
    category: Category.MOTOGP,
    nationality: 'ZA',
    value: 25000000,
  },
  {
    name: 'Aleix Espargaro',
    number: 41,
    team: 'Aprilia Racing',
    category: Category.MOTOGP,
    nationality: 'ES',
    value: 22000000,
  },
  {
    name: 'Maverick Viñales',
    number: 12,
    team: 'Aprilia Racing',
    category: Category.MOTOGP,
    nationality: 'ES',
    value: 24000000,
  },
  {
    name: 'Fabio Quartararo',
    number: 20,
    team: 'Monster Energy Yamaha MotoGP',
    category: Category.MOTOGP,
    nationality: 'FR',
    value: 26000000,
  },
  {
    name: 'Marco Bezzecchi',
    number: 72,
    team: 'Mooney VR46 Racing Team',
    category: Category.MOTOGP,
    nationality: 'IT',
    value: 20000000,
  },
  {
    name: 'Luca Marini',
    number: 10,
    team: 'Mooney VR46 Racing Team',
    category: Category.MOTOGP,
    nationality: 'IT',
    value: 18000000,
  },
  {
    name: 'Johann Zarco',
    number: 5,
    team: 'Prima Pramac Racing',
    category: Category.MOTOGP,
    nationality: 'FR',
    value: 16000000,
  },
  {
    name: 'Alex Marquez',
    number: 73,
    team: 'Gresini Racing MotoGP',
    category: Category.MOTOGP,
    nationality: 'ES',
    value: 15000000,
  },
  {
    name: 'Franco Morbidelli',
    number: 21,
    team: 'Monster Energy Yamaha MotoGP',
    category: Category.MOTOGP,
    nationality: 'IT',
    value: 14000000,
  },
  {
    name: 'Fabio Di Giannantonio',
    number: 49,
    team: 'Gresini Racing MotoGP',
    category: Category.MOTOGP,
    nationality: 'IT',
    value: 12000000,
  },
  {
    name: 'Miguel Oliveira',
    number: 88,
    team: 'CryptoDATA RNF MotoGP Team',
    category: Category.MOTOGP,
    nationality: 'PT',
    value: 13000000,
  },
  {
    name: 'Augusto Fernandez',
    number: 37,
    team: 'GASGAS Factory Racing Tech3',
    category: Category.MOTOGP,
    nationality: 'ES',
    value: 10000000,
  },
  {
    name: 'Raul Fernandez',
    number: 25,
    team: 'CryptoDATA RNF MotoGP Team',
    category: Category.MOTOGP,
    nationality: 'ES',
    value: 11000000,
  },
  {
    name: 'Takaaki Nakagami',
    number: 30,
    team: 'LCR Honda IDEMITSU',
    category: Category.MOTOGP,
    nationality: 'JP',
    value: 8000000,
  },
  {
    name: 'Alex Rins',
    number: 42,
    team: 'LCR Honda CASTROL',
    category: Category.MOTOGP,
    nationality: 'ES',
    value: 12000000,
  },
  {
    name: 'Joan Mir',
    number: 36,
    team: 'Repsol Honda Team',
    category: Category.MOTOGP,
    nationality: 'ES',
    value: 14000000,
  },
  {
    name: 'Pol Espargaro',
    number: 44,
    team: 'GASGAS Factory Racing Tech3',
    category: Category.MOTOGP,
    nationality: 'ES',
    value: 9000000,
  },
  {
    name: 'Jack Miller',
    number: 43,
    team: 'Red Bull KTM Factory Racing',
    category: Category.MOTOGP,
    nationality: 'AU',
    value: 16000000,
  },

  // MOTO2 - Alcuni esempi
  {
    name: 'Pedro Acosta',
    number: 51,
    team: 'Red Bull KTM Ajo',
    category: Category.MOTO2,
    nationality: 'ES',
    value: 8000000,
  },
  {
    name: 'Tony Arbolino',
    number: 14,
    team: 'Elf Marc VDS Racing Team',
    category: Category.MOTO2,
    nationality: 'IT',
    value: 6000000,
  },
  {
    name: 'Celestino Vietti',
    number: 13,
    team: 'Fantic Racing',
    category: Category.MOTO2,
    nationality: 'IT',
    value: 5500000,
  },
  {
    name: 'Fermin Aldeguer',
    number: 54,
    team: 'MB Conveyors SpeedUp',
    category: Category.MOTO2,
    nationality: 'ES',
    value: 5000000,
  },
  {
    name: 'Jake Dixon',
    number: 87,
    team: 'GASGAS Aspar Team',
    category: Category.MOTO2,
    nationality: 'GB',
    value: 4500000,
  },

  // MOTO3 - Alcuni esempi
  {
    name: 'David Alonso',
    number: 80,
    team: 'GASGAS Aspar Team',
    category: Category.MOTO3,
    nationality: 'CO',
    value: 3000000,
  },
  {
    name: 'Daniel Holgado',
    number: 66,
    team: 'Red Bull KTM Tech3',
    category: Category.MOTO3,
    nationality: 'ES',
    value: 2800000,
  },
  {
    name: 'Diogo Moreira',
    number: 11,
    team: 'MT Helmets - MSI',
    category: Category.MOTO3,
    nationality: 'BR',
    value: 2500000,
  },
  {
    name: 'Ayumu Sasaki',
    number: 71,
    team: 'Liqui Moly Husqvarna Intact GP',
    category: Category.MOTO3,
    nationality: 'JP',
    value: 2600000,
  },
  {
    name: 'Jaume Masia',
    number: 7,
    team: 'Leopard Racing',
    category: Category.MOTO3,
    nationality: 'ES',
    value: 2700000,
  }
];

async function main() {
  console.log('🏍️  Inizio seed database Fanta MotoGP...');

  // Pulisci database esistente
  await prisma.riderStats.deleteMany();
  await prisma.teamRider.deleteMany();
  await prisma.raceResult.deleteMany();
  await prisma.rider.deleteMany();
  console.log('✅ Database pulito');

  // Inserisci piloti
  for (const rider of riders) {
    await prisma.rider.create({
      data: {
        ...rider,
        isActive: true,
      },
    });
    console.log(`✅ Creato pilota: ${rider.number} - ${rider.name}`);
  }

  // Crea statistiche di esempio per alcuni piloti
  const topRiders = await prisma.rider.findMany({
    where: { category: Category.MOTOGP },
    take: 10,
  });

  for (const rider of topRiders) {
    await prisma.riderStats.create({
      data: {
        riderId: rider.id,
        season: 2024,
        races: Math.floor(Math.random() * 20) + 10,
        wins: Math.floor(Math.random() * 5),
        podiums: Math.floor(Math.random() * 10),
        poles: Math.floor(Math.random() * 4),
        fastestLaps: Math.floor(Math.random() * 3),
        points: Math.floor(Math.random() * 300) + 50,
        avgPosition: Math.random() * 10 + 1,
      },
    });
  }

  console.log('✅ Create statistiche di esempio');

  // Crea alcune gare di esempio
  const races = [
    { name: 'Gran Premio del Qatar', circuit: 'Losail International Circuit', country: 'Qatar', round: 1 },
    { name: 'Gran Premio del Portogallo', circuit: 'Algarve International Circuit', country: 'Portogallo', round: 2 },
    { name: 'Gran Premio delle Americhe', circuit: 'Circuit of the Americas', country: 'USA', round: 3 },
    { name: 'Gran Premio di Spagna', circuit: 'Circuito de Jerez', country: 'Spagna', round: 4 },
    { name: 'Gran Premio di Francia', circuit: 'Le Mans', country: 'Francia', round: 5 },
  ];

  for (const race of races) {
    await prisma.race.create({
      data: {
        ...race,
        season: 2025,
        date: new Date(2025, race.round - 1, 15 + race.round * 2),
      },
    });
  }

  console.log('✅ Create gare di esempio');
  console.log('🎉 Seed completato con successo!');
}

main()
  .catch((e) => {
    console.error('❌ Errore durante il seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });