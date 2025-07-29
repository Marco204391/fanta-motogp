// backend/src/controllers/teamsController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
}

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
      const remainingBudget = team.budget - totalValue;

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
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.userId!;
    const { name, leagueId, riderIds, captainId } = req.body;

    // Verifica che l'utente sia membro della lega
    const leagueMember = await prisma.leagueMember.findUnique({
      where: {
        userId_leagueId: { userId, leagueId }
      }
    });

    if (!leagueMember) {
      return res.status(403).json({ error: 'Non sei membro di questa lega' });
    }

    // Verifica che non abbia già un team in questa lega
    const existingTeam = await prisma.team.findUnique({
      where: {
        userId_leagueId: { userId, leagueId }
      }
    });

    if (existingTeam) {
      return res.status(400).json({ error: 'Hai già un team in questa lega' });
    }

    // Recupera info lega e piloti
    const [league, riders] = await Promise.all([
      prisma.league.findUnique({ where: { id: leagueId } }),
      prisma.rider.findMany({
        where: { id: { in: riderIds } }
      })
    ]);

    if (!league) {
      return res.status(404).json({ error: 'Lega non trovata' });
    }

    // Validazioni
    if (riders.length !== riderIds.length) {
      return res.status(400).json({ error: 'Uno o più piloti non trovati' });
    }

    if (riders.length > 5) {
      return res.status(400).json({ error: 'Massimo 5 piloti per team' });
    }

    const totalValue = riders.reduce((sum, rider) => sum + rider.value, 0);
    if (totalValue > league.budget) {
      return res.status(400).json({ 
        error: `Budget superato: ${totalValue} > ${league.budget}` 
      });
    }

    if (!riderIds.includes(captainId)) {
      return res.status(400).json({ error: 'Il capitano deve essere uno dei piloti del team' });
    }

    // Crea il team
    const team = await prisma.team.create({
      data: {
        name,
        userId,
        leagueId,
        budget: league.budget,
        riders: {
          create: riderIds.map((riderId: string) => ({
            riderId,
            purchasePrice: riders.find(r => r.id === riderId)!.value,
            isCaptain: riderId === captainId
          }))
        }
      },
      include: {
        league: true,
        riders: {
          include: {
            rider: true
          }
        }
      }
    });

    res.status(201).json({ 
      success: true,
      team 
    });
  } catch (error) {
    console.error('Errore creazione team:', error);
    res.status(500).json({ error: 'Errore nella creazione del team' });
  }
};

// PUT /api/teams/:id - Modifica team
export const updateTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { riderIds, captainId } = req.body;

    // Verifica proprietà del team
    const team = await prisma.team.findFirst({
      where: { id, userId },
      include: {
        league: true,
        riders: true
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team non trovato o non autorizzato' });
    }

    // TODO: Verifica se è possibile modificare (es. mercato aperto)

    if (riderIds) {
      // Recupera info nuovi piloti
      const newRiders = await prisma.rider.findMany({
        where: { id: { in: riderIds } }
      });

      if (newRiders.length !== riderIds.length) {
        return res.status(400).json({ error: 'Uno o più piloti non trovati' });
      }

      const totalValue = newRiders.reduce((sum, rider) => sum + rider.value, 0);
      if (totalValue > team.budget) {
        return res.status(400).json({ 
          error: `Budget superato: ${totalValue} > ${team.budget}` 
        });
      }

      // Aggiorna piloti (rimuovi vecchi, aggiungi nuovi)
      await prisma.$transaction([
        prisma.teamRider.deleteMany({
          where: { teamId: id }
        }),
        prisma.teamRider.createMany({
          data: riderIds.map((riderId: string) => ({
            teamId: id,
            riderId,
            purchasePrice: newRiders.find(r => r.id === riderId)!.value,
            isCaptain: riderId === (captainId || riderIds[0])
          }))
        })
      ]);
    } else if (captainId) {
      // Aggiorna solo capitano
      await prisma.$transaction([
        prisma.teamRider.updateMany({
          where: { teamId: id },
          data: { isCaptain: false }
        }),
        prisma.teamRider.update({
          where: {
            teamId_riderId: { teamId: id, riderId: captainId }
          },
          data: { isCaptain: true }
        })
      ]);
    }

    // Recupera team aggiornato
    const updatedTeam = await prisma.team.findUnique({
      where: { id },
      include: {
        league: true,
        riders: {
          include: {
            rider: true
          }
        }
      }
    });

    res.json({ 
      success: true,
      team: updatedTeam 
    });
  } catch (error) {
    console.error('Errore aggiornamento team:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del team' });
  }
};

// DELETE /api/teams/:id - Elimina team
export const deleteTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const team = await prisma.team.findFirst({
      where: { id, userId }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team non trovato o non autorizzato' });
    }

    // TODO: Verifica se è possibile eliminare (es. campionato non iniziato)

    await prisma.team.delete({
      where: { id }
    });

    res.json({ 
      success: true,
      message: 'Team eliminato con successo' 
    });
  } catch (error) {
    console.error('Errore eliminazione team:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del team' });
  }
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