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

// GET /api/riders/:riderId - Ottieni dettagli di un pilota
export const getRiderById = async (req: Request, res: Response) => {
  const { riderId } = req.params;

  try {
    const rider = await prisma.rider.findUnique({
      where: { id: riderId },
      include: {
        statistics: {
          where: {
            season: new Date().getFullYear(),
          },
        },
        raceResults: {
          take: 10,
          orderBy: {
            race: {
              date: 'desc',
            },
          },
          include: {
            race: {
              select: {
                id: true,
                name: true,
                circuit: true,
                date: true,
              },
            },
          },
        },
      },
    });

    if (!rider) {
      return res.status(404).json({ error: 'Pilota non trovato' });
    }

    res.json({ rider });
  } catch (error) {
    console.error('Errore recupero dettagli pilota:', error);
    res.status(500).json({ error: 'Errore nel recupero dei dettagli del pilota' });
  }
};

// GET /api/riders/:riderId/stats - Ottieni statistiche di un pilota
export const getRiderStats = async (req: Request, res: Response) => {
  const { riderId } = req.params;
  const { season } = req.query;
  const targetSeason = season ? parseInt(season as string) : new Date().getFullYear();

  try {
    // Statistiche stagionali
    const seasonStats = await prisma.riderStats.findUnique({
      where: {
        riderId_season: {
          riderId,
          season: targetSeason,
        },
      },
    });

    // Risultati della stagione
    const seasonResults = await prisma.raceResult.findMany({
      where: {
        riderId,
        race: {
          season: targetSeason,
        },
      },
      include: {
        race: {
          select: {
            id: true,
            name: true,
            circuit: true,
            date: true,
            round: true,
          },
        },
      },
      orderBy: {
        race: {
          round: 'asc',
        },
      },
    });

    // Calcola statistiche aggiuntive
    const stats = {
      season: targetSeason,
      races: seasonResults.length,
      wins: seasonResults.filter(r => r.position === 1).length,
      podiums: seasonResults.filter(r => r.position && r.position <= 3).length,
      top10: seasonResults.filter(r => r.position && r.position <= 10).length,
      dnf: seasonResults.filter(r => r.status === 'DNF').length,
      avgPosition: seasonStats?.avgPosition || 0,
      points: seasonStats?.points || 0,
      bestResult: Math.min(...seasonResults.filter(r => r.position).map(r => r.position!)),
      worstResult: Math.max(...seasonResults.filter(r => r.position).map(r => r.position!)),
    };

    // Grafico posizioni
    const positionChart = seasonResults.map(result => ({
      round: result.race.round,
      race: result.race.name,
      position: result.position || null,
      status: result.status,
    }));

    res.json({
      rider: riderId,
      season: targetSeason,
      stats,
      positionChart,
      results: seasonResults,
    });
  } catch (error) {
    console.error('Errore recupero statistiche pilota:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
};

// GET /api/riders/by-category/:category - Ottieni piloti per categoria
export const getRidersByCategory = async (req: Request, res: Response) => {
  const { category } = req.params;

  if (!['MOTOGP', 'MOTO2', 'MOTO3'].includes(category)) {
    return res.status(400).json({ error: 'Categoria non valida' });
  }

  try {
    const riders = await prisma.rider.findMany({
      where: {
        category: category as any,
        isActive: true,
      },
      orderBy: [
        { value: 'desc' },
        { number: 'asc' },
      ],
    });

    res.json({ 
      category,
      riders,
      total: riders.length,
    });
  } catch (error) {
    console.error('Errore recupero piloti per categoria:', error);
    res.status(500).json({ error: 'Errore nel recupero dei piloti' });
  }
};