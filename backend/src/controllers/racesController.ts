import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/races/upcoming
export const getUpcomingRaces = async (req: Request, res: Response) => {
  try {
    const races = await prisma.race.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      orderBy: {
        date: 'asc',
      },
      take: 5,
    });
    res.json({ races });
  } catch (error) {
    res.status(500).json({ error: 'Errore nel recupero delle prossime gare' });
  }
};

// GET /api/races/past
export const getPastRaces = async (req: Request, res: Response) => {
    try {
        const races = await prisma.race.findMany({
            where: {
                date: {
                    lt: new Date(),
                },
            },
            orderBy: {
                date: 'desc',
            },
            take: 10,
        });
        res.json({ races });
    } catch (error) {
        res.status(500).json({ error: 'Errore nel recupero delle gare passate' });
    }
};