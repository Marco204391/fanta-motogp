import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import delle rotte
import authRoutes from '../backend/src/routes/auth';
import leagueRoutes from '../backend/src/routes/leagues';
import teamRoutes from '../backend/src/routes/teams';
import riderRoutes from '../backend/src/routes/riders';
import raceRoutes from '../backend/src/routes/races';
import lineupRoutes from '../backend/src/routes/lineups';
import syncRoutes from '../backend/src/routes/sync';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// IMPORTANTE: Usa /api/* perché Vercel preserva il path completo
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/races', raceRoutes);
app.use('/api/lineups', lineupRoutes);
app.use('/api/sync', syncRoutes);

// Rotta di test per verificare che funzioni
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    path: req.path,
    originalUrl: req.originalUrl
  });
});

// Catch-all per debug
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    originalUrl: req.originalUrl,
    method: req.method
  });
});

export default app;