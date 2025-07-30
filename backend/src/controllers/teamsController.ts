// backend/src/controllers/teamsController.ts
import { Request, Response } from 'express';
import { PrismaClient, Category } from '@prisma/client';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();


// GET /api/teams/my-teams - I miei team
export const getMyTeams = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const teams = await prisma.team.findMany({
      where: { userId },
      include: {
        league: true,
        riders: {
          include: {
            rider: true
          }
        },
        scores: {
          orderBy: { race: { date: 'desc' } },
          take: 5,
          include: {
            race: true
          }
        }
      }
    });

    // Calcola statistiche per ogni team
    const teamsWithStats = teams.map(team => {
      const totalValue = team.riders.reduce((sum, tr) => sum + tr.rider.value, 0);
      const totalPoints = team.scores.reduce((sum, score) => sum + score.totalPoints, 0);
      // CORREZIONE: Usa team.league.budget invece di team.budget
      const remainingBudget = team.league.budget - totalValue;

      return {
        ...team,
        totalValue,
        totalPoints,
        remainingBudget,
        riderCount: team.riders.length
      };
    });

    res.json({ teams: teamsWithStats });
  } catch (error) {
    console.error('Errore recupero team:', error);
    res.status(500).json({ error: 'Errore nel recupero dei team' });
  }
};

// GET /api/teams/:id - Dettaglio team
export const getTeamById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const team = await prisma.team.findFirst({
      where: { 
        id,
        OR: [
          { userId }, // Il proprietario
          { league: { members: { some: { userId } } } } // Membro della lega
        ]
      },
      include: {
        user: {
          select: { id: true, username: true }
        },
        league: true,
        riders: {
          include: {
            rider: {
              include: {
                statistics: {
                  where: { season: new Date().getFullYear() },
                  take: 1
                }
              }
            }
          }
        },
        scores: {
          orderBy: { race: { date: 'desc' } },
          include: {
            race: true
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team non trovato o non autorizzato' });
    }

    res.json({ team });
  } catch (error) {
    console.error('Errore recupero dettaglio team:', error);
    res.status(500).json({ error: 'Errore nel recupero del team' });
  }
};


// POST /api/teams - Crea nuovo team
export const createTeam = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { name, leagueId, riderIds } = req.body;

  try {
    const newTeam = await prisma.$transaction(async (tx) => {
      // 1. Controlli preliminari
      const league = await tx.league.findUnique({ where: { id: leagueId } });
      if (!league) throw new Error('Lega non trovata');

      const leagueMember = await tx.leagueMember.findUnique({
        where: { userId_leagueId: { userId, leagueId } },
      });
      if (!leagueMember) throw new Error('Non sei membro di questa lega');

      const existingTeam = await tx.team.findUnique({
        where: { userId_leagueId: { userId, leagueId } },
      });
      if (existingTeam) throw new Error('Hai già un team in questa lega');

      // 2. Controllo Esclusività Piloti
      const alreadyPickedRiders = await tx.leagueRider.findMany({
        where: {
          leagueId: leagueId,
          riderId: { in: riderIds },
        },
      });

      if (alreadyPickedRiders.length > 0) {
        const riderNames = (await tx.rider.findMany({
          where: { id: { in: alreadyPickedRiders.map(r => r.riderId) } },
          select: { name: true }
        })).map(r => r.name).join(', ');
        throw new Error(`I seguenti piloti sono già stati scelti in questa lega: ${riderNames}`);
      }

      // 3. Controllo Budget e Composizione Team
      const riders = await tx.rider.findMany({ where: { id: { in: riderIds } } });
      if (riders.length !== riderIds.length) throw new Error('Uno o più piloti non validi');

      const totalValue = riders.reduce((sum, rider) => sum + rider.value, 0);
      if (totalValue > league.budget) {
        throw new Error(`Budget superato. Costo team: ${totalValue}, Budget: ${league.budget}`);
      }
      
      const categoryCounts = riders.reduce((acc, rider) => {
        acc[rider.category] = (acc[rider.category] || 0) + 1;
        return acc;
      }, {} as Record<Category, number>);

      if (categoryCounts.MOTOGP !== 3 || categoryCounts.MOTO2 !== 3 || categoryCounts.MOTO3 !== 3) {
        throw new Error('Devi scegliere 3 piloti per ogni categoria (MotoGP, Moto2, Moto3)');
      }

      // 4. Creazione del Team
      const team = await tx.team.create({
        data: {
          name,
          userId,
          leagueId,
          // CORREZIONE: Rimosso il campo 'budget' da qui
          riders: {
            create: riderIds.map((riderId: string) => ({
              riderId,
              purchasePrice: riders.find(r => r.id === riderId)!.value,
            })),
          },
        },
      });

      // 5. "Blocca" i piloti scelti per questa lega
      await tx.leagueRider.createMany({
        data: riderIds.map((riderId: string) => ({
          leagueId,
          riderId,
        })),
      });

      return tx.team.findUnique({
        where: { id: team.id },
        include: {
          league: true,
          riders: { include: { rider: true } }
        }
      });
    });

    res.status(201).json({ success: true, team: newTeam });

  } catch (error: any) {
    console.error('Errore creazione team:', error);
    res.status(400).json({ error: error.message || 'Errore nella creazione del team' });
  }
};


// PUT /api/teams/:id - Modifica team
export const updateTeam = async (req: AuthRequest, res: Response) => {
  res.status(501).json({ error: 'Funzionalità di mercato non ancora implementata.' });
};

// DELETE /api/teams/:id - Elimina team
export const deleteTeam = async (req: AuthRequest, res: Response) => {
  res.status(501).json({ error: 'Funzionalità non ancora implementata.' });
};

// GET /api/teams/:id/standings - Classifica del team nella lega
export const getTeamStandings = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        league: {
          include: {
            teams: {
              include: {
                user: {
                  select: { id: true, username: true }
                },
                scores: true
              }
            }
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team non trovato' });
    }

    // Calcola classifica
    const standings = team.league.teams
      .map(t => ({
        teamId: t.id,
        teamName: t.name,
        username: t.user.username,
        totalPoints: t.scores.reduce((sum, s) => sum + s.totalPoints, 0),
        isCurrentTeam: t.id === id
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((t, index) => ({
        ...t,
        position: index + 1
      }));

    res.json({ standings });
  } catch (error) {
    console.error('Errore recupero classifica:', error);
    res.status(500).json({ error: 'Errore nel recupero della classifica' });
  }
};