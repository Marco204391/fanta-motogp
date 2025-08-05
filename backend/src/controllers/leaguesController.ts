// backend/src/controllers/leaguesController.ts
import { Request, Response } from 'express';
import { PrismaClient, TeamScore } from '@prisma/client';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Genera codice lega unico
const generateLeagueCode = (): string => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// GET /api/leagues/my-leagues - Le mie leghe
export const getMyLeagues = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const leagues = await prisma.league.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        _count: {
          select: { teams: true }
        },
        teams: {
          where: { userId },
          include: {
            scores: true
          }
        }
      }
    });

    const formattedLeagues = leagues.map(league => {
      const userTeam = league.teams[0];
      const userPoints = userTeam ? userTeam.scores.reduce((sum: number, s: TeamScore) => sum + s.totalPoints, 0) : 0;

      return {
        id: league.id,
        name: league.name,
        code: league.code,
        isPrivate: league.isPrivate,
        maxTeams: league.maxTeams,
        budget: league.budget,
        currentTeams: league._count.teams,
        userPoints: userPoints,
        userPosition: null
      };
    });

    res.json({ leagues: formattedLeagues });
  } catch (error) {
    console.error('Errore recupero leghe:', error);
    res.status(500).json({ error: 'Errore nel recupero delle leghe' });
  }
};


// GET /api/leagues/public - Leghe pubbliche
export const getPublicLeagues = async (req: Request, res: Response) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isPrivate: false,
      startDate: {
        gte: new Date() // Non ancora iniziate
      }
    };

    if (search) {
      where.name = {
        contains: String(search),
        mode: 'insensitive'
      };
    }

    const [leagues, total] = await Promise.all([
      prisma.league.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          _count: {
            select: { teams: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.league.count({ where })
    ]);

    const formattedLeagues = leagues.map(league => ({
      ...league,
      currentTeams: league._count.teams,
      isFull: league._count.teams >= league.maxTeams
    }));

    res.json({
      leagues: formattedLeagues,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Errore recupero leghe pubbliche:', error);
    res.status(500).json({ error: 'Errore nel recupero delle leghe pubbliche' });
  }
};

// GET /api/leagues/:id - Dettaglio lega
export const getLeagueById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const league = await prisma.league.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, createdAt: true }
            }
          }
        },
        teams: {
          include: {
            user: {
              select: { id: true, username: true }
            },
            riders: {
              include: {
                rider: true
              }
            },
            scores: true
          }
        }
      }
    });

    if (!league) {
      return res.status(404).json({ error: 'Lega non trovata' });
    }

    if (league.isPrivate && userId) {
      const isMember = league.members.some(m => m.userId === userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Non sei membro di questa lega' });
      }
    }

    const standings = league.teams
      .map(team => ({
        teamId: team.id,
        teamName: team.name,
        userId: team.userId,
        username: team.user.username,
        totalPoints: team.scores.reduce((sum: number, s: TeamScore) => sum + s.totalPoints, 0),
      }))
      .sort((a, b) => a.totalPoints - b.totalPoints); // Corretto per Fanta-MotoGP (meno punti è meglio)

    res.json({
      league: {
        ...league,
        standings,
        isMember: userId ? league.members.some(m => m.userId === userId) : false,
        isAdmin: userId ? league.members.some(m => m.userId === userId && m.role === 'ADMIN') : false
      }
    });
  } catch (error) {
    console.error('Errore recupero dettaglio lega:', error);
    res.status(500).json({ error: 'Errore nel recupero della lega' });
  }
};

// POST /api/leagues - Crea nuova lega
export const createLeague = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId!;
    const { 
      name, 
      isPrivate = true, 
      maxTeams = 10, 
      budget = 1000,
      scoringRules,
      startDate,
      endDate,
      lineupVisibility
    } = req.body;

    let code = generateLeagueCode();
    let codeExists = true;
    while (codeExists) {
      const existing = await prisma.league.findUnique({ where: { code } });
      if (!existing) {
        codeExists = false;
      } else {
        code = generateLeagueCode();
      }
    }

    const league = await prisma.league.create({
      data: {
        name,
        code,
        isPrivate,
        maxTeams,
        budget,
        scoringRules: scoringRules || {},
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        lineupVisibility: lineupVisibility || 'AFTER_DEADLINE',
        members: {
          create: {
            userId,
            role: 'ADMIN'
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      league
    });
  } catch (error) {
    console.error('Errore creazione lega:', error);
    res.status(500).json({ error: 'Errore nella creazione della lega' });
  }
};

// POST /api/leagues/join - Unisciti a lega con codice
export const joinLeague = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Codice lega richiesto' });
    }

    const league = await prisma.league.findUnique({
      where: { code: code.toUpperCase() },
      include: { _count: { select: { teams: true } } }
    });

    if (!league) {
      return res.status(404).json({ error: 'Lega non trovata' });
    }

    const existingMember = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId, leagueId: league.id } }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'Sei già membro di questa lega' });
    }

    if (league._count.teams >= league.maxTeams) {
      return res.status(400).json({ error: 'La lega è piena' });
    }

    await prisma.leagueMember.create({
      data: {
        userId,
        leagueId: league.id,
        role: 'MEMBER'
      }
    });

    res.json({
      success: true,
      message: 'Ti sei unito alla lega con successo',
      leagueId: league.id
    });
  } catch (error) {
    console.error('Errore unione lega:', error);
    res.status(500).json({ error: 'Errore nell\'unirsi alla lega' });
  }
};

// POST /api/leagues/:id/leave - Lascia lega
export const leaveLeague = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const member = await prisma.leagueMember.findUnique({
      where: { userId_leagueId: { userId, leagueId: id } }
    });

    if (!member) {
      return res.status(404).json({ error: 'Non sei membro di questa lega' });
    }

    if (member.role === 'ADMIN') {
      const otherAdmins = await prisma.leagueMember.count({
        where: { leagueId: id, role: 'ADMIN', userId: { not: userId } }
      });

      if (otherAdmins === 0) {
        return res.status(400).json({ error: 'Non puoi lasciare la lega come unico amministratore' });
      }
    }

    await prisma.$transaction([
      prisma.team.deleteMany({ where: { userId, leagueId: id } }),
      prisma.leagueMember.delete({ where: { userId_leagueId: { userId, leagueId: id } } })
    ]);

    res.json({ success: true, message: 'Hai lasciato la lega con successo' });
  } catch (error) {
    console.error('Errore uscita lega:', error);
    res.status(500).json({ error: 'Errore nell\'uscire dalla lega' });
  }
};

// GET /api/leagues/:id/standings - Classifica completa lega
export const getLeagueStandings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teams = await prisma.team.findMany({
      where: { leagueId: id },
      include: {
        user: { select: { id: true, username: true } },
        scores: { include: { race: true }, orderBy: { race: { gpDate: 'desc' } } }
      }
    });

    const standings = teams.map(team => {
      const totalPoints = team.scores.reduce((sum: number, s: TeamScore) => sum + s.totalPoints, 0);
      return {
        teamId: team.id,
        teamName: team.name,
        userId: team.userId,
        username: team.user.username,
        totalPoints,
        gamesPlayed: team.scores.length
      };
    })
    .sort((a, b) => a.totalPoints - b.totalPoints) // CORRETTO: Ordine crescente (vince chi ha meno punti)
    .map((team, index) => ({
      ...team,
      position: index + 1,
    }));

    res.json({ standings });
  } catch (error) {
    console.error('Errore recupero classifica:', error);
    res.status(500).json({ error: 'Errore nel recupero della classifica' });
  }
};

// GET /api/leagues/:id/race/:raceId/lineups - NUOVA FUNZIONE
export const getLeagueRaceLineups = async (req: AuthRequest, res: Response) => {
  try {
    const { id: leagueId, raceId } = req.params;

    // Controlla la regola di visibilità della lega prima di verificare la deadline
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { lineupVisibility: true },
    });

    if (!league) {
      return res.status(404).json({ error: 'Lega non trovata' });
    }

    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race) {
      return res.status(404).json({ error: 'Gara non trovata' });
    }

    const deadline = race.sprintDate || race.gpDate;
    if (league.lineupVisibility === 'AFTER_DEADLINE' && new Date() < new Date(deadline)) {
      return res.status(200).json({ lineups: [], message: 'Gli schieramenti saranno visibili dopo la deadline della gara.' });
    }

    // Trova tutti i team della lega
    const teams = await prisma.team.findMany({
      where: { leagueId },
      include: {
        user: { select: { username: true } },
        scores: { where: { raceId } },
        lineups: {
          where: { raceId },
          include: {
            lineupRiders: {
              include: {
                rider: true,
              },
              orderBy: { rider: { category: 'asc' } },
            },
          },
        },
      },
    });

    // Recupera i risultati reali della gara per confrontarli
    const raceResults = await prisma.raceResult.findMany({
      where: { raceId },
    });
    const resultsMap = new Map(raceResults.map(r => [r.riderId, { position: r.position, status: r.status }]));

    const formattedLineups = teams.map(team => {
      const lineup = team.lineups[0];
      const teamScore = team.scores[0];
      const lineupRiders = lineup?.lineupRiders.map(lr => ({
        ...lr,
        actualPosition: resultsMap.get(lr.riderId)?.position,
        actualStatus: resultsMap.get(lr.riderId)?.status,
      }));

      return {
        teamId: team.id,
        teamName: team.name,
        userName: team.user.username,
        totalPoints: teamScore?.totalPoints ?? null,
        lineup: lineupRiders || [],
        riderScores: teamScore?.riderScores ?? [],
      };
    });

    res.json({ lineups: formattedLineups });
  } catch (error) {
    console.error('Errore recupero schieramenti di lega:', error);
    res.status(500).json({ error: 'Errore nel recupero degli schieramenti' });
  }
};