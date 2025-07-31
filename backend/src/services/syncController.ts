// backend/src/controllers/syncController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { motogpApi } from '../services/motogpApiService';
import { PrismaClient, SyncType, SyncStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware per verificare ruolo admin
export const requireAdmin = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Non autorizzato' });
    }

    // Per ora assumiamo che ci sia un campo isAdmin nell'utente
    // In produzione dovresti gestire i ruoli in modo più sofisticato
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Accesso negato. Solo gli admin possono eseguire questa operazione.' });
    }

    next();
  } catch (error) {
    console.error('Errore verifica admin:', error);
    res.status(500).json({ error: 'Errore server' });
  }
};

// POST /api/sync/riders - Sincronizza piloti
export const syncRiders = async (req: AuthRequest, res: Response) => {
  let syncLog;
  
  try {
    // Crea log di sincronizzazione
    syncLog = await prisma.syncLog.create({
      data: {
        type: SyncType.RIDERS,
        status: SyncStatus.IN_PROGRESS
      }
    });

    // Esegui sincronizzazione
    const result = await motogpApi.syncRiders();

    // Aggiorna log con successo
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.COMPLETED,
        completedAt: new Date(),
        message: result.message
      }
    });

    res.json({
      success: true,
      message: result.message,
      syncLogId: syncLog.id
    });

  } catch (error: any) {
    console.error('Errore sincronizzazione piloti:', error);
    
    // Aggiorna log con errore
    if (syncLog) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: SyncStatus.FAILED,
          completedAt: new Date(),
          message: error.message,
          details: { error: error.stack }
        }
      });
    }

    res.status(500).json({
      error: 'Errore durante la sincronizzazione dei piloti',
      details: error.message
    });
  }
};

// POST /api/sync/calendar - Sincronizza calendario
export const syncCalendar = async (req: AuthRequest, res: Response) => {
  let syncLog;
  
  try {
    const { year } = req.body;
    const seasonYear = year || new Date().getFullYear();

    // Crea log di sincronizzazione
    syncLog = await prisma.syncLog.create({
      data: {
        type: SyncType.CALENDAR,
        status: SyncStatus.IN_PROGRESS,
        details: { year: seasonYear }
      }
    });

    // Esegui sincronizzazione
    const result = await motogpApi.syncRaceCalendar(seasonYear);

    // Aggiorna log con successo
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.COMPLETED,
        completedAt: new Date(),
        message: result.message
      }
    });

    res.json({
      success: true,
      message: result.message,
      syncLogId: syncLog.id
    });

  } catch (error: any) {
    console.error('Errore sincronizzazione calendario:', error);
    
    if (syncLog) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: SyncStatus.FAILED,
          completedAt: new Date(),
          message: error.message,
          details: { error: error.stack }
        }
      });
    }

    res.status(500).json({
      error: 'Errore durante la sincronizzazione del calendario',
      details: error.message
    });
  }
};

// POST /api/sync/race-results/:raceId - Sincronizza risultati gara
export const syncRaceResults = async (req: AuthRequest, res: Response) => {
  let syncLog;
  
  try {
    const { raceId } = req.params;

    // Verifica che la gara esista
    const race = await prisma.race.findUnique({
      where: { id: raceId }
    });

    if (!race) {
      return res.status(404).json({ error: 'Gara non trovata' });
    }

    // Crea log di sincronizzazione
    syncLog = await prisma.syncLog.create({
      data: {
        type: SyncType.RACE_RESULTS,
        status: SyncStatus.IN_PROGRESS,
        details: { raceId, raceName: race.name }
      }
    });

    // Esegui sincronizzazione
    const result = await motogpApi.syncRaceResults(raceId);

    // Aggiorna log con successo
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.COMPLETED,
        completedAt: new Date(),
        message: result.message
      }
    });

    // Notifica tutti i team della lega che i risultati sono disponibili
    // TODO: Implementare sistema di notifiche

    res.json({
      success: true,
      message: result.message,
      syncLogId: syncLog.id
    });

  } catch (error: any) {
    console.error('Errore sincronizzazione risultati:', error);
    
    if (syncLog) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: SyncStatus.FAILED,
          completedAt: new Date(),
          message: error.message,
          details: { error: error.stack }
        }
      });
    }

    res.status(500).json({
      error: 'Errore durante la sincronizzazione dei risultati',
      details: error.message
    });
  }
};

// GET /api/sync/logs - Ottieni log sincronizzazioni
export const getSyncLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { type, status, limit = 50 } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const logs = await prisma.syncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit)
    });

    res.json({ logs });
  } catch (error) {
    console.error('Errore recupero log:', error);
    res.status(500).json({ error: 'Errore nel recupero dei log' });
  }
};

// GET /api/sync/status - Stato generale sincronizzazioni
export const getSyncStatus = async (req: AuthRequest, res: Response) => {
  try {
    // Ultima sincronizzazione per tipo
    const lastSyncs = await prisma.$queryRaw`
      SELECT DISTINCT ON (type) 
        type, status, message, "completedAt", "createdAt"
      FROM "SyncLog"
      ORDER BY type, "createdAt" DESC
    `;

    // Conta gare senza risultati
    const racesWithoutResults = await prisma.race.count({
      where: {
        date: { lt: new Date() },
        results: { none: {} }
      }
    });

    // Prossima gara
    const nextRace = await prisma.race.findFirst({
      where: { date: { gt: new Date() } },
      orderBy: { date: 'asc' }
    });

    res.json({
      lastSyncs,
      racesWithoutResults,
      nextRace
    });
  } catch (error) {
    console.error('Errore stato sync:', error);
    res.status(500).json({ error: 'Errore nel recupero dello stato' });
  }
};