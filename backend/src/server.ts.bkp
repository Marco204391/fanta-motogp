import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Importa le tue rotte
import authRoutes from './routes/auth';
import leagueRoutes from './routes/leagues';
import teamRoutes from './routes/teams';
import riderRoutes from './routes/riders';
import raceRoutes from './routes/races';
import lineupRoutes from './routes/lineups';
import syncRoutes from './routes/sync';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
}));
app.use(express.json());

// Rotte API
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/races', raceRoutes);
app.use('/api/lineups', lineupRoutes);
app.use('/api/sync', syncRoutes);

// Rimuovi o commenta app.listen
/*
app.listen(PORT, () => {
  console.log(`🏍️  Fanta MotoGP Server running on port ${PORT}`);
});

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
*/

// Esporta l'app per Vercel
export default app;