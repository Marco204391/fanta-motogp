import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Importa le tue rotte
// Assicurati che i percorsi siano corretti dopo aver spostato il file!
import authRoutes from '../backend/src/routes/auth';
import leagueRoutes from '../backend/src/routes/leagues';
import teamRoutes from '../backend/src/routes/teams';
import riderRoutes from '../backend/src/routes/riders';
import raceRoutes from '../backend/src/routes/races';
import lineupRoutes from '../backend/src/routes/lineups';
import syncRoutes from '../backend/src/routes/sync';

dotenv.config();

const app = express();
const prisma = new PrismaClient(); // Prisma gestisce il connection pooling automaticamente

// Middleware essenziali
app.use(cors());
app.use(express.json());

// Vercel reindirizza già /api a questo file.
app.use('/auth', authRoutes);
app.use('/leagues', leagueRoutes);
app.use('/teams', teamRoutes);
app.use('/riders', riderRoutes);
app.use('/races', raceRoutes);
app.use('/lineups', lineupRoutes);
app.use('/sync', syncRoutes);

// Esporta l'app per Vercel
export default app;