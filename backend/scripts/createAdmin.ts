// backend/scripts/createAdmin.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@fantamotogp.com'; // Cambia con la tua email
  const password = 'Admin123!'; // Cambia con una password sicura
  const username = 'admin';

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        isAdmin: true
      },
      create: {
        email,
        username,
        password: hashedPassword,
        isAdmin: true,
        isActive: true
      }
    });

    console.log('✅ Admin creato/aggiornato:', admin.email);
    console.log('📝 Credenziali:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('⚠️  Cambia la password al primo accesso!');
    
  } catch (error) {
    console.error('❌ Errore creazione admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();