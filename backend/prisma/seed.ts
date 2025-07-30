// backend/prisma/seed.ts
import { PrismaClient, Category } from '@prisma/client';

const prisma = new PrismaClient();

// Dati piloti con valori aggiornati per un budget di 1000
const riders = [
  // MOTOGP (valori ~100-200)
  { name: 'Francesco Bagnaia', number: 1, team: 'Ducati Lenovo Team', category: Category.MOTOGP, nationality: 'IT', value: 200 },
  { name: 'Jorge Martin', number: 89, team: 'Prima Pramac Racing', category: Category.MOTOGP, nationality: 'ES', value: 190 },
  { name: 'Marc Marquez', number: 93, team: 'Gresini Racing MotoGP', category: Category.MOTOGP, nationality: 'ES', value: 180 },
  { name: 'Enea Bastianini', number: 23, team: 'Ducati Lenovo Team', category: Category.MOTOGP, nationality: 'IT', value: 170 },
  { name: 'Brad Binder', number: 33, team: 'Red Bull KTM Factory Racing', category: Category.MOTOGP, nationality: 'ZA', value: 160 },
  { name: 'Fabio Quartararo', number: 20, team: 'Monster Energy Yamaha MotoGP', category: Category.MOTOGP, nationality: 'FR', value: 150 },
  { name: 'Maverick Viñales', number: 12, team: 'Aprilia Racing', category: Category.MOTOGP, nationality: 'ES', value: 145 },
  { name: 'Aleix Espargaro', number: 41, team: 'Aprilia Racing', category: Category.MOTOGP, nationality: 'ES', value: 140 },
  { name: 'Marco Bezzecchi', number: 72, team: 'Mooney VR46 Racing Team', category: Category.MOTOGP, nationality: 'IT', value: 135 },
  { name: 'Luca Marini', number: 10, team: 'Mooney VR46 Racing Team', category: Category.MOTOGP, nationality: 'IT', value: 130 },
  { name: 'Johann Zarco', number: 5, team: 'Prima Pramac Racing', category: Category.MOTOGP, nationality: 'FR', value: 125 },
  { name: 'Alex Marquez', number: 73, team: 'Gresini Racing MotoGP', category: Category.MOTOGP, nationality: 'ES', value: 120 },
  
  // MOTO2 (valori ~50-90)
  { name: 'Pedro Acosta', number: 51, team: 'Red Bull KTM Ajo', category: Category.MOTO2, nationality: 'ES', value: 90 },
  { name: 'Tony Arbolino', number: 14, team: 'Elf Marc VDS Racing Team', category: Category.MOTO2, nationality: 'IT', value: 85 },
  { name: 'Celestino Vietti', number: 13, team: 'Fantic Racing', category: Category.MOTO2, nationality: 'IT', value: 80 },
  { name: 'Fermin Aldeguer', number: 54, team: 'MB Conveyors SpeedUp', category: Category.MOTO2, nationality: 'ES', value: 75 },
  { name: 'Jake Dixon', number: 87, team: 'GASGAS Aspar Team', category: Category.MOTO2, nationality: 'GB', value: 70 },
  { name: 'Ai Ogura', number: 79, team: 'IDEMITSU Honda Team Asia', category: Category.MOTO2, nationality: 'JP', value: 65 },
  { name: 'Aron Canet', number: 40, team: 'Pons Wegow Los40', category: Category.MOTO2, nationality: 'ES', value: 60 },
  { name: 'Alonso Lopez', number: 21, team: 'MB Conveyors SpeedUp', category: Category.MOTO2, nationality: 'ES', value: 55 },
  { name: 'Somkiat Chantra', number: 35, team: 'IDEMITSU Honda Team Asia', category: Category.MOTO2, nationality: 'TH', value: 50 },

  // MOTO3 (valori ~20-40)
  { name: 'David Alonso', number: 80, team: 'GASGAS Aspar Team', category: Category.MOTO3, nationality: 'CO', value: 40 },
  { name: 'Daniel Holgado', number: 66, team: 'Red Bull KTM Tech3', category: Category.MOTO3, nationality: 'ES', value: 38 },
  { name: 'Jaume Masia', number: 7, team: 'Leopard Racing', category: Category.MOTO3, nationality: 'ES', value: 36 },
  { name: 'Ayumu Sasaki', number: 71, team: 'Liqui Moly Husqvarna Intact GP', category: Category.MOTO3, nationality: 'JP', value: 34 },
  { name: 'Deniz Öncü', number: 53, team: 'Red Bull KTM Ajo', category: Category.MOTO3, nationality: 'TR', value: 32 },
  { name: 'Ivan Ortolá', number: 48, team: 'Angeluss MTA Team', category: Category.MOTO3, nationality: 'ES', value: 30 },
  { name: 'Diogo Moreira', number: 11, team: 'MT Helmets - MSI', category: Category.MOTO3, nationality: 'BR', value: 28 },
  { name: 'David Muñoz', number: 64, team: 'BOE Motorsports', category: Category.MOTO3, nationality: 'ES', value: 25 },
  { name: 'José Antonio Rueda', number: 99, team: 'Red Bull KTM Ajo', category: Category.MOTO3, nationality: 'ES', value: 20 },
];

async function main() {
  console.log('🏍️  Inizio seed database Fanta MotoGP...');
  
  // Invece di pulire tutto, usiamo `upsert` per creare o aggiornare i piloti
  // Questo evita errori se le relazioni esistono già
  console.log('🔄 Aggiornamento o creazione piloti...');
  for (const rider of riders) {
    await prisma.rider.upsert({
      where: { number: rider.number }, // Usa un campo unico per trovare il pilota
      update: {
        name: rider.name,
        team: rider.team,
        category: rider.category,
        nationality: rider.nationality,
        value: rider.value
      },
      create: {
        ...rider,
        isActive: true,
      },
    });
  }
  console.log('✅ Piloti sincronizzati.');

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