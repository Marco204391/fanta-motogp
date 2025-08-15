// backend/src/controllers/racesController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/races/upcoming
export const getUpcomingRaces = async (req: Request, res: Response) => {
  try {
    const races = await prisma.race.findMany({
      where: {
        gpDate: {
          gte: new Date(),
        },
      },
      orderBy: {
        gpDate: 'asc',
      },
      take: 10,
    });
    res.json({ races });
  } catch (error) {
    console.error('Errore recupero gare future:', error);
    res.status(500).json({ error: 'Errore nel recupero delle gare' });
  }
};

// GET /api/races/past
export const getPastRaces = async (req: Request, res: Response) => {
  try {
    const races = await prisma.race.findMany({
      where: {
        gpDate: {
          lt: new Date(),
        },
      },
      orderBy: {
        gpDate: 'desc',
      },
      take: 20,
      include: {
        results: {
          select: {
            id: true,
            riderId: true,
          },
        },
      },
    });

    const racesWithStatus = races.map(race => ({
      ...race,
      hasResults: race.results.length > 0,
      results: undefined,
    }));

    res.json({ races: racesWithStatus });
  } catch (error) {
    console.error('Errore recupero gare passate:', error);
    res.status(500).json({ error: 'Errore nel recupero delle gare passate' });
  }
};

// GET /api/races/:raceId
export const getRaceById = async (req: Request, res: Response) => {
  const { raceId } = req.params;

  try {
    const race = await prisma.race.findUnique({
      where: { id: raceId },
      include: {
        results: {
          include: {
            rider: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    if (!race) {
      return res.status(404).json({ error: 'Gara non trovata' });
    }
    
    res.json({ race });

  } catch (error) {
    console.error('Errore recupero dettagli gara:', error);
    res.status(500).json({ error: 'Errore nel recupero dei dettagli della gara' });
  }
};

// GET /api/races/:raceId/results
export const getRaceResults = async (req: Request, res: Response) => {
  const { raceId } = req.params;
  const { session } = req.query;

  try {
    // Se viene specificata una sessione specifica, filtra per quella
    let sessionFilter: any = { in: ['RACE', 'SPRINT', 'FP1', 'FP2', 'PR'] };
    
    if (session) {
      const sessionString = String(session);
      const validSessions = ['race', 'sprint', 'fp1', 'fp2', 'pr'];
      if (!validSessions.includes(sessionString.toLowerCase())) {
        return res.status(400).json({ error: 'Sessione non valida' });
      }
      sessionFilter = sessionString.toUpperCase();
    }

    const results = await prisma.raceResult.findMany({
      where: {
        raceId,
        session: sessionFilter
      },
      include: {
        rider: {
          select: {
            id: true,
            name: true,
            number: true,
            team: true,
            category: true,
            nationality: true,
            photoUrl: true,
          },
        },
      },
      orderBy: [
        { position: 'asc' },
      ],
    });

    // Organizza i risultati per sessione e categoria
    const resultsBySession = results.reduce((acc: any, result) => {
      const sess = result.session;
      const cat = result.rider.category;
      if (!acc[sess]) {
        acc[sess] = {};
      }
      if (!acc[sess][cat]) {
        acc[sess][cat] = [];
      }
      
      // Formatta il risultato con il campo bestLap nel formato corretto
      const formattedResult = {
        ...result,
        bestLap: result.bestLap ? 
          (typeof result.bestLap === 'object' ? result.bestLap : { time: result.bestLap, number: null }) : 
          null
      };
      
      acc[sess][cat].push(formattedResult);
      return acc;
    }, {});

    res.json({
      results: resultsBySession,
      total: results.length,
    });
  } catch (error) {
    console.error('Errore recupero risultati gara:', error);
    res.status(500).json({ error: 'Errore nel recupero dei risultati' });
  }
};

// GET /api/races/calendar/:year
export const getRaceCalendar = async (req: Request, res: Response) => {
  const { year } = req.params;
  const season = parseInt(year);

  if (isNaN(season)) {
    return res.status(400).json({ error: 'Anno non valido' });
  }

  try {
    const races = await prisma.race.findMany({
      where: { season },
      orderBy: { round: 'asc' },
      include: {
        results: {
          select: { id: true },
        },
      },
    });

    const calendar = races.map(race => ({
      ...race,
      hasResults: race.results.length > 0,
      results: undefined,
    }));

    res.json({ 
      season,
      races: calendar,
      total: calendar.length,
    });
  } catch (error) {
    console.error('Errore recupero calendario:', error);
    res.status(500).json({ error: 'Errore nel recupero del calendario' });
  }
};

// GET /api/races/:raceId/qualifying
export const getQualifyingResults = async (req: Request, res: Response) => {
  const { raceId } = req.params;

  try {
    const results = await prisma.raceResult.findMany({
      where: {
        raceId,
        session: 'QUALIFYING',
      },
      include: {
        rider: {
          select: {
            id: true,
            name: true,
            number: true,
            team: true,
            category: true,
            nationality: true,
            photoUrl: true,
          },
        },
      },
      orderBy: [
        { position: 'asc' },
      ],
    });

    // Raggruppa per categoria
    const resultsByCategory = results.reduce((acc: any, result) => {
      const cat = result.rider.category;
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(result);
      return acc;
    }, {});

    res.json({
      results: resultsByCategory,
      total: results.length,
    });
  } catch (error) {
    console.error('Errore recupero risultati qualifiche:', error);
    res.status(500).json({ error: 'Errore nel recupero dei risultati delle qualifiche' });
  }
};