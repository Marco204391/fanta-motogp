// backend/src/controllers/racesController.ts
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
      take: 10, // Prossime 10 gare
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
        date: {
          lt: new Date(),
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 20, // Ultime 20 gare
      include: {
        results: {
          select: {
            id: true,
            riderId: true,
          },
        },
      },
    });

    // Aggiungi flag per indicare se ci sono risultati
    const racesWithStatus = races.map(race => ({
      ...race,
      hasResults: race.results.length > 0,
      results: undefined, // Non inviare i dettagli dei risultati
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
        lineups: {
          select: {
            id: true,
            teamId: true,
          },
        },
      },
    });

    if (!race) {
      return res.status(404).json({ error: 'Gara non trovata' });
    }

    // Calcola statistiche
    const stats = {
      totalLineups: race.lineups.length,
      hasResults: race.results.length > 0,
      categories: {
        MOTOGP: race.results.filter(r => r.rider.category === 'MOTOGP').length,
        MOTO2: race.results.filter(r => r.rider.category === 'MOTO2').length,
        MOTO3: race.results.filter(r => r.rider.category === 'MOTO3').length,
      },
    };

    res.json({ 
      race: {
        ...race,
        lineups: undefined, // Non inviare dettagli lineup
        stats,
      }
    });
  } catch (error) {
    console.error('Errore recupero dettagli gara:', error);
    res.status(500).json({ error: 'Errore nel recupero dei dettagli della gara' });
  }
};

// GET /api/races/:raceId/results
export const getRaceResults = async (req: Request, res: Response) => {
  const { raceId } = req.params;
  const { category } = req.query;

  try {
    const whereClause: any = { raceId };
    
    // Filtra per categoria se specificata
    if (category && ['MOTOGP', 'MOTO2', 'MOTO3'].includes(category as string)) {
      whereClause.rider = {
        category: category as string,
      };
    }

    const results = await prisma.raceResult.findMany({
      where: whereClause,
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
        { status: 'asc' }, // FINISHED prima
        { position: 'asc' },
      ],
    });

    // Raggruppa per categoria
    const resultsByCategory = results.reduce((acc: any, result) => {
      const cat = result.rider.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(result);
      return acc;
    }, {});

    res.json({ 
      results: category ? results : resultsByCategory,
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