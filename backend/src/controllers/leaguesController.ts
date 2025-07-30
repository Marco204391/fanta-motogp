// backend/src/controllers/leaguesController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth'; // Assicurati di importare AuthRequest

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
        members: {
          include: {
            user: {
              select: { id: true, username: true }
            }
          }
        },
        teams: {
          where: { userId },
          include: {
            scores: true
          }
        },
        _count: {
          select: { teams: true }
        }
      }
    });

    // Aggiungi info sulla posizione dell'utente
    const leaguesWithPosition = await Promise.all(
      leagues.map(async (league) => {
        const allTeams = await prisma.team.findMany({
          where: { leagueId: league.id },
          include: {
            user: {
              select: { id: true, username: true }
            },
            scores: true
          }
        });

        // Calcola classifica
        const standings = allTeams
          .map(team => ({
            teamId: team.id,
            userId: team.userId,
            username: team.user.username,
            totalPoints: team.scores.reduce((sum, s) => sum + s.totalPoints, 0)
          }))
          .sort((a, b) => b.totalPoints - a.totalPoints);

        const userPosition = standings.findIndex(s => s.userId === userId) + 1;
        const userPoints = standings.find(s => s.userId === userId)?.totalPoints || 0;

        return {
          ...league,
          userPosition: userPosition || null,
          userPoints,
          currentTeams: league._count.teams
        };
      })
    );

    res.json({ leagues: leaguesWithPosition });
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

    // Se è privata, verifica che l'utente sia membro
    if (league.isPrivate && userId) {
      const isMember = league.members.some(m => m.userId === userId);
      if (!isMember) {
        return res.status(403).json({ error: 'Non sei membro di questa lega' });
      }
    }

    // Calcola classifica
    const standings = league.teams
      .map(team => ({
        teamId: team.id,
        teamName: team.name,
        userId: team.userId,
        username: team.user.username,
        totalPoints: team.scores.reduce((sum, s) => sum + s.totalPoints, 0),
        riders: team.riders.map(tr => ({
          name: tr.rider.name,
          number: tr.rider.number,
          // CORREZIONE: Rimosso isCaptain da qui
        }))
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

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
      budget = 1000, // Budget aggiornato
      scoringRules,
      startDate,
      endDate
    } = req.body;

    // Genera codice unico
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

    // Crea la lega
    const league = await prisma.league.create({
      data: {
        name,
        code,
        isPrivate,
        maxTeams,
        budget,
        scoringRules: scoringRules || {
          // Qui puoi inserire le nuove regole di punteggio se vuoi
        },
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
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

    // Trova la lega
    const league = await prisma.league.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        _count: {
          select: { teams: true }
        }
      }
    });

    if (!league) {
      return res.status(404).json({ error: 'Lega non trovata' });
    }

    // Verifica se già membro
    const existingMember = await prisma.leagueMember.findUnique({
      where: {
        userId_leagueId: { userId, leagueId: league.id }
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'Sei già membro di questa lega' });
    }

    // Verifica se la lega è piena
    if (league._count.teams >= league.maxTeams) {
      return res.status(400).json({ error: 'La lega è piena' });
    }

    // Aggiungi come membro
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
      where: {
        userId_leagueId: { userId, leagueId: id }
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Non sei membro di questa lega' });
    }

    if (member.role === 'ADMIN') {
      // Verifica se ci sono altri admin
      const otherAdmins = await prisma.leagueMember.count({
        where: {
          leagueId: id,
          role: 'ADMIN',
          userId: { not: userId }
        }
      });

      if (otherAdmins === 0) {
        return res.status(400).json({ 
          error: 'Non puoi lasciare la lega come unico amministratore' 
        });
      }
    }

    // Rimuovi team e membership
    await prisma.$transaction([
      prisma.team.deleteMany({
        where: { userId, leagueId: id }
      }),
      prisma.leagueMember.delete({
        where: {
          userId_leagueId: { userId, leagueId: id }
        }
      })
    ]);

    res.json({
      success: true,
      message: 'Hai lasciato la lega con successo'
    });
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
        user: {
          select: { id: true, username: true }
        },
        riders: {
          include: {
            rider: true
          }
        },
        scores: {
          include: {
            race: true
          },
          orderBy: {
            race: { date: 'desc' }
          }
        }
      }
    });

    // Calcola statistiche per ogni team
    const standings = teams.map(team => {
      const totalPoints = team.scores.reduce((sum, s) => sum + s.totalPoints, 0);
      const raceCount = team.scores.length;
      const avgPoints = raceCount > 0 ? totalPoints / raceCount : 0;
      
      // Ultime 5 gare per il form
      const recentForm = team.scores.slice(0, 5).map(s => s.totalPoints);

      return {
        teamId: team.id,
        teamName: team.name,
        userId: team.userId,
        username: team.user.username,
        totalPoints,
        raceCount,
        avgPoints,
        recentForm,
        riders: team.riders.map(tr => ({
          name: tr.rider.name,
          number: tr.rider.number,
          category: tr.rider.category,
          // CORREZIONE: Rimosso isCaptain da qui
        }))
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((team, index) => ({
      ...team,
      position: index + 1,
      movement: 0 // TODO: Calcola movimento rispetto a classifica precedente
    }));

    res.json({ standings });
  } catch (error) {
    console.error('Errore recupero classifica:', error);
    res.status(500).json({ error: 'Errore nel recupero della classifica' });
  }
};