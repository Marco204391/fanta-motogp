// backend/src/controllers/lineupsController.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getLineup = async (req: AuthRequest, res: Response) => {
    // Logica per recuperare lo schieramento di un utente per una data gara
};

export const setLineup = async (req: AuthRequest, res: Response) => {
    // Logica per creare o aggiornare uno schieramento
    // Controlla la scadenza (race.sprintDate)
    // Valida la composizione (2 piloti per categoria)
};