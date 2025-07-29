// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

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

// Routes principali
app.use('/api/auth', require('./routes/auth'));
app.use('/api/riders', require('./routes/riders'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/leagues', require('./routes/leagues'));
app.use('/api/races', require('./routes/races'));

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Qualcosa è andato storto!' });
});

// Avvia server
app.listen(PORT, () => {
  console.log(`🏍️  Fanta MotoGP Server running on port ${PORT}`);
});

// Gestione chiusura
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});