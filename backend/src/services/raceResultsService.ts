// backend/src/services/raceResultsService.ts
import { PrismaClient, Category } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

interface RaceResultInput {
  raceId: string;
  results: Array<{
    riderId: string;
    position: number | null; // null se non ha finito la gara
    status: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ';
    points?: number;
  }>;
}

// Servizio per inserire manualmente i risultati
export class RaceResultsService {
  
  // Metodo per inserire i risultati manualmente (admin)
  static async insertResults(data: RaceResultInput) {
    const { raceId, results } = data;
    
    return await prisma.$transaction(async (tx) => {
      // Verifica che la gara esista
      const race = await tx.race.findUnique({
        where: { id: raceId }
      });
      
      if (!race) {
        throw new Error('Gara non trovata');
      }
      
      // Elimina risultati esistenti per questa gara
      await tx.raceResult.deleteMany({
        where: { raceId }
      });
      
      // Inserisci nuovi risultati
      const raceResults = await Promise.all(
        results.map(result => 
          tx.raceResult.create({
            data: {
              raceId,
              riderId: result.riderId,
              position: result.position,
              status: result.status,
              points: result.points || 0
            }
          })
        )
      );
      
      // Calcola i punteggi per tutti i team che hanno schierato piloti
      await this.calculateTeamScores(tx, raceId);
      
      return raceResults;
    });
  }
  
  // Calcola i punteggi dei team basandosi sugli schieramenti
  private static async calculateTeamScores(tx: any, raceId: string) {
    // Ottieni tutti gli schieramenti per questa gara
    const lineups = await tx.raceLineup.findMany({
      where: { raceId },
      include: {
        lineupRiders: {
          include: {
            rider: true
          }
        },
        team: {
          include: {
            league: true
          }
        }
      }
    });
    
    // Ottieni i risultati della gara
    const raceResults = await tx.raceResult.findMany({
      where: { raceId }
    });
    
    // Mappa riderId -> posizione reale
    const resultMap = new Map(
      raceResults.map(r => [r.riderId, r.position || 99]) // 99 punti se non finisce
    );
    
    // Calcola punteggi per ogni team
    for (const lineup of lineups) {
      let totalPoints = 0;
      const riderScores: any[] = [];
      
      for (const lineupRider of lineup.lineupRiders) {
        const actualPosition = resultMap.get(lineupRider.riderId) || 99;
        const predictedPosition = lineupRider.predictedPosition;
        
        // Calcolo punti secondo il regolamento:
        // Punti base = posizione di arrivo (1° = 1 punto, 2° = 2 punti, ecc)
        // Bonus/Malus = differenza tra posizione prevista e reale
        const basePoints = actualPosition;
        const bonus = Math.abs(predictedPosition - actualPosition);
        const points = basePoints + bonus;
        
        riderScores.push({
          riderId: lineupRider.riderId,
          predictedPosition,
          actualPosition,
          points
        });
        
        totalPoints += points;
      }
      
      // Salva il punteggio del team
      await tx.teamScore.create({
        data: {
          teamId: lineup.teamId,
          raceId,
          totalPoints,
          riderScores // JSON field con il dettaglio
        }
      });
    }
  }
  
  // Metodo helper per importare risultati da CSV o JSON
  static async importResultsFromFile(filePath: string, raceId: string) {
    // Implementazione per importare da file
    // Questo è un esempio, adattalo al formato che preferisci
    const fs = require('fs').promises;
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    return this.insertResults({
      raceId,
      results: data.results
    });
  }
  
  // Metodo per ottenere un template di inserimento risultati
  static async getResultsTemplate(raceId: string, category: Category) {
    const riders = await prisma.rider.findMany({
      where: { 
        category,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        number: true
      },
      orderBy: {
        number: 'asc'
      }
    });
    
    return riders.map(rider => ({
      riderId: rider.id,
      riderName: rider.name,
      riderNumber: rider.number,
      position: null,
      status: 'FINISHED'
    }));
  }
}

// Controller per gestire i risultati (admin only)
// backend/src/controllers/adminController.ts
import { Request, Response } from 'express';
import { RaceResultsService } from '../services/raceResultsService';
import { AuthRequest } from '../middleware/auth';

export const insertRaceResults = async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Verificare che l'utente sia admin
    const { raceId, results } = req.body;
    
    const raceResults = await RaceResultsService.insertResults({
      raceId,
      results
    });
    
    res.json({
      success: true,
      message: 'Risultati inseriti con successo',
      results: raceResults
    });
  } catch (error: any) {
    console.error('Errore inserimento risultati:', error);
    res.status(400).json({ 
      error: error.message || 'Errore nell\'inserimento dei risultati' 
    });
  }
};

export const getResultsTemplate = async (req: Request, res: Response) => {
  try {
    const { raceId, category } = req.params;
    
    const template = await RaceResultsService.getResultsTemplate(
      raceId, 
      category as any
    );
    
    res.json({ template });
  } catch (error: any) {
    console.error('Errore recupero template:', error);
    res.status(500).json({ error: 'Errore nel recupero del template' });
  }
};

// Route per admin
// backend/src/routes/admin.ts
import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import * as adminController from '../controllers/adminController';

const router = Router();

router.use(authenticate);
router.use(requireAdmin); // Middleware per verificare ruolo admin

router.post('/race-results', adminController.insertRaceResults);
router.get('/race-results/template/:raceId/:category', adminController.getResultsTemplate);

export default router;