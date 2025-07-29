// backend/src/controllers/ridersController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

// GET /api/riders - Lista piloti con filtri
export const getRiders = async (req: Request, res: Response) => {
  try {
    const { 
      category, 
      search, 
      sortBy = 'value',
      sortOrder = 'desc',
      page = 1,
      limit = 20 
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Costruisci filtri
    const where: any = {
      isActive: true
    };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { team: { contains: String(search), mode: 'insensitive' } },
        { number: Number(search) || undefined }
      ].filter(Boolean);
    }

    // Determina ordinamento
    let orderBy: any = {};
    switch (sortBy) {
      case 'value':
        orderBy = { value: sortOrder };
        break;
      case 'points':
        orderBy = { statistics: { _max: { points: sortOrder } } };
        break;
      case 'name':
        orderBy = { name: sortOrder };
        break;
      default:
        orderBy = { value: 'desc' };
    }

    // Query piloti
    const [riders, total] = await Promise.all([
      prisma.rider.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy,
        include: {
          statistics: {
            where: { season: new Date().getFullYear() },
            take: 1
          }
        }
      }),
      prisma.rider.count({ where })
    ]);

    // Formatta risposta
    const formattedRiders = riders.map(rider => ({
      id: rider.id,
      name: rider.name,
      number: rider.number,
      team: rider.team,
      category: rider.category,
      nationality: rider.nationality,
      value: rider.value,
      photoUrl: rider.photoUrl,
      statistics: rider.statistics[0] || null
    }));

    res.json({
      riders: formattedRiders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Errore recupero piloti:', error);
    res.status(500).json({ error: 'Errore nel recupero dei piloti' });
  }
};

// GET /api/riders/:id - Dettaglio pilota
export const getRiderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rider = await prisma.rider.findUnique({
      where: { id },
      include: {
        statistics: {
          orderBy: { season: 'desc' },
          take: 3 // Ultime 3 stagioni
        },
        raceResults: {
          orderBy: { race: { date: 'desc' } },
          take: 5, // Ultime 5 gare
          include: {
            race: true
          }
        }
      }
    });

    if (!rider) {
      return res.status(404).json({ error: 'Pilota non trovato' });
    }

    res.json({ rider });
  } catch (error) {
    console.error('Errore recupero dettaglio pilota:', error);
    res.status(500).json({ error: 'Errore nel recupero del pilota' });
  }
};

// GET /api/riders/:id/stats - Statistiche pilota
export const getRiderStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { season } = req.query;

    const currentSeason = season ? Number(season) : new Date().getFullYear();

    // Statistiche stagione corrente
    const seasonStats = await prisma.riderStats.findFirst({
      where: {
        riderId: id,
        season: currentSeason
      }
    });

    // Risultati gare stagione corrente
    const raceResults = await prisma.raceResult.findMany({
      where: {
        riderId: id,
        race: {
          season: currentSeason
        }
      },
      include: {
        race: true
      },
      orderBy: {
        race: { date: 'desc' }
      }
    });

    // Calcola statistiche aggiuntive
    const positions = raceResults
      .filter(r => r.position !== null)
      .map(r => r.position!);

    const stats = {
      seasonStats,
      totalRaces: raceResults.length,
      finishedRaces: positions.length,
      dnf: raceResults.filter(r => r.dnf).length,
      averagePosition: positions.length > 0 
        ? positions.reduce((a, b) => a + b, 0) / positions.length 
        : null,
      bestPosition: positions.length > 0 ? Math.min(...positions) : null,
      worstPosition: positions.length > 0 ? Math.max(...positions) : null,
      recentForm: raceResults.slice(0, 5).map(r => ({
        race: r.race.name,
        position: r.position,
        points: r.points,
        dnf: r.dnf
      }))
    };

    res.json({ stats });
  } catch (error) {
    console.error('Errore recupero statistiche pilota:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
};

// GET /api/riders/values - Valori di mercato
export const getRiderValues = async (req: Request, res: Response) => {
  try {
    const values = await prisma.rider.groupBy({
      by: ['category'],
      where: { isActive: true },
      _avg: { value: true },
      _min: { value: true },
      _max: { value: true },
      _count: true
    });

    res.json({ values });
  } catch (error) {
    console.error('Errore recupero valori:', error);
    res.status(500).json({ error: 'Errore nel recupero dei valori' });
  }
};

// PUT /api/riders/:id/value - Aggiorna valore pilota (ADMIN)
export const updateRiderValue = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { value } = req.body;

    // TODO: Verifica permessi admin

    const updatedRider = await prisma.rider.update({
      where: { id },
      data: { value: Number(value) }
    });

    res.json({ 
      success: true,
      rider: updatedRider 
    });
  } catch (error) {
    console.error('Errore aggiornamento valore:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del valore' });
  }
};