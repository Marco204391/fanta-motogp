// backend/src/controllers/adminController.ts
import { Request, Response } from 'express';
import { RaceResultsService } from '../services/raceResultsService';
import { AuthRequest } from '../middleware/auth';
import { Category } from '@prisma/client';

export const insertRaceResults = async (req: AuthRequest, res: Response) => {
  try {
    const { raceId, results } = req.body;
    
    if (!raceId || !results) {
        return res.status(400).json({ error: 'raceId e results sono obbligatori' });
    }

    const raceResults = await RaceResultsService.insertResults({
      raceId,
      results
    });
    
    res.status(201).json({
      success: true,
      message: 'Risultati inseriti e punteggi calcolati con successo',
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
    
    if (!Object.values(Category).includes(category as Category)) {
        return res.status(400).json({ error: 'Categoria non valida' });
    }

    const template = await RaceResultsService.getResultsTemplate(
      raceId, 
      category as Category
    );
    
    res.json({ template });
  } catch (error: any) {
    console.error('Errore recupero template:', error);
    res.status(500).json({ error: 'Errore nel recupero del template' });
  }
};