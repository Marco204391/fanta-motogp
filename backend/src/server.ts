// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { syncScheduler } from './cron/syncScheduler';

// Carica variabili ambiente
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Route di test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Fanta MotoGP API is running!' });
});

// Import routes
import authRoutes from './routes/auth';
import ridersRoutes from './routes/riders';
import teamsRoutes from './routes/teams';
import leaguesRoutes from './routes/leagues';
import racesRoutes from './routes/races';
import lineupsRoutes from './routes/lineups';
import syncRoutes from './routes/sync';

// Routes principali
app.use('/api/auth', authRoutes);
app.use('/api/riders', ridersRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/leagues', leaguesRoutes);
app.use('/api/races', racesRoutes);
app.use('/api/lineups', lineupsRoutes);
app.use('/api/sync', syncRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Qualcosa è andato storto!' });
});

// Avvia server
app.listen(PORT, () => {
  console.log(`🏍️  Fanta MotoGP Server running on port ${PORT}`);
  syncScheduler.start();
});

// Gestione chiusura
process.on('SIGTERM', async () => {
  syncScheduler.stop();
  await prisma.$disconnect();
  process.exit(0);
});