// backend/src/controllers/teamsController.ts
import { Request, Response } from 'express';
import { PrismaClient, Category, RiderType } from '@prisma/client';
import { validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// GET /api/teams/my-teams - I miei team
export const getMyTeams = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Trova la prossima gara utile per controllare lo schieramento
    const upcomingRace = await prisma.race.findFirst({
      where: { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
    });

    const teams = await prisma.team.findMany({
      where: { userId },
      include: {
        league: true,
        riders: {
          include: {
            rider: true,
          },
        },
        scores: {
          orderBy: { race: { date: 'desc' } },
          take: 5,
          include: {
            race: true,
          },
        },
      },
    });

    // Per ogni team, aggiungi le statistiche e lo stato dello schieramento
    const teamsWithData = await Promise.all(
      teams.map(async (team) => {
        let hasLineup = false;
        // Controlla se esiste uno schieramento per la prossima gara
        if (upcomingRace) {
          const lineup = await prisma.raceLineup.findUnique({
            where: { teamId_raceId: { teamId: team.id, raceId: upcomingRace.id } },
          });
          hasLineup = !!lineup;
        }

        const totalValue = team.riders.reduce((sum, tr) => sum + tr.rider.value, 0);
        const totalPoints = team.scores.reduce((sum, score) => sum + score.totalPoints, 0);
        const remainingBudget = team.league.budget - totalValue;

        return {
          ...team,
          totalValue,
          totalPoints,
          remainingBudget,
          riderCount: team.riders.length,
          hasLineup,
        };
      })
    );

    res.json({ teams: teamsWithData });
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
          { userId },
          { league: { members: { some: { userId } } } }
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
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, leagueId, riderIds } = req.body;

  try {
    const newTeam = await prisma.$transaction(async (tx) => {
      // 1. Verifica che l'utente sia membro della lega
      const membership = await tx.leagueMember.findUnique({
        where: { userId_leagueId: { userId, leagueId } }
      });

      if (!membership) {
        throw new Error('Non sei membro di questa lega');
      }

      // 2. Verifica che non abbia già un team in questa lega
      const existingTeam = await tx.team.findFirst({
        where: { userId, leagueId }
      });

      if (existingTeam) {
        throw new Error('Hai già un team in questa lega');
      }

      // 2.1 Verifica il numero massimo di team
      const league = await tx.league.findUnique({
        where: { id: leagueId },
        include: { _count: { select: { teams: true } } }
      });

      if (!league) {
        throw new Error('Lega non trovata');
      }

      if (league._count.teams >= league.maxTeams) {
        throw new Error(`La lega ha raggiunto il numero massimo di team (${league.maxTeams})`);
      }

      // 2.2 Verifica che siano esattamente 9 piloti
      if (!riderIds || riderIds.length !== 9) {
        throw new Error('Il team deve contenere esattamente 9 piloti (3 per categoria)');
      }

      // 3. Recupera info sui piloti
      const riders = await tx.rider.findMany({
        where: { id: { in: riderIds } }
      });

      if (riders.length !== riderIds.length) {
        throw new Error('Uno o più piloti non trovati');
      }
      
      // Assicura che tutti i piloti siano 'OFFICIAL'
      const nonOfficialRiders = riders.filter(r => r.riderType !== RiderType.OFFICIAL);
      if (nonOfficialRiders.length > 0) {
          throw new Error(`Puoi selezionare solo piloti ufficiali. I seguenti non sono validi: ${nonOfficialRiders.map(r => r.name).join(', ')}`);
      }

      // 3.1 Verifica che ci siano esattamente 3 piloti per categoria
      const ridersByCategory = riders.reduce((acc, rider) => {
        acc[rider.category] = (acc[rider.category] || 0) + 1;
        return acc;
      }, {} as Record<Category, number>);

      if (ridersByCategory.MOTOGP !== 3 ||
          ridersByCategory.MOTO2 !== 3 ||
          ridersByCategory.MOTO3 !== 3) {
        throw new Error('Devi selezionare esattamente 3 piloti per ogni categoria (MotoGP, Moto2, Moto3)');
      }

      // 3.2 NUOVA VERIFICA: Controlla se i piloti sono già stati presi in questa lega
      const alreadyTaken = await tx.teamRider.findMany({
          where: {
              team: {
                  leagueId: leagueId
              },
              riderId: {
                  in: riderIds
              }
          },
          include: {
              rider: true
          }
      });

      if (alreadyTaken.length > 0) {
        const takenNames = alreadyTaken.map(tr => tr.rider.name).join(', ');
        throw new Error(`I seguenti piloti sono già stati presi in questa lega: ${takenNames}`);
      }

      // 4. Verifica budget
      const totalCost = riders.reduce((sum, rider) => sum + rider.value, 0);
      if (totalCost > league.budget) {
        throw new Error(`Il costo totale (${totalCost}) supera il budget disponibile (${league.budget})`);
      }

      // 5. Creazione del Team
      const team = await tx.team.create({
        data: {
          name,
          userId,
          leagueId,
          riders: {
            create: riderIds.map((riderId: string) => ({
              riderId,
              purchasePrice: riders.find(r => r.id === riderId)!.value,
            })),
          },
        },
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

    // Calcola classifica - ORDINAMENTO CRESCENTE (vince chi ha meno punti)
    const standings = team.league.teams
      .map(t => ({
        teamId: t.id,
        teamName: t.name,
        username: t.user.username,
        totalPoints: t.scores.reduce((sum, s) => sum + s.totalPoints, 0),
        isCurrentTeam: t.id === id
      }))
      .sort((a, b) => a.totalPoints - b.totalPoints) // CORRETTO: crescente
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

// GET /api/teams/my-team/:leagueId - Ottieni il mio team in una lega specifica
export const getMyTeamInLeague = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { leagueId } = req.params;

  try {
    const team = await prisma.team.findFirst({
      where: {
        userId,
        leagueId,
      },
      include: {
        riders: {
          include: {
            rider: true,
          },
        },
        scores: {
          orderBy: { calculatedAt: 'desc' },
          take: 5, // Ultimi 5 punteggi
        },
      },
    });

    if (!team) {
      return res.status(404).json({ 
        error: 'Non hai un team in questa lega',
        hasTeam: false 
      });
    }

    // Calcola posizione attuale
    const allTeamScores = await prisma.teamScore.groupBy({
      by: ['teamId'],
      where: {
        team: { leagueId }
      },
      _sum: {
        totalPoints: true,
      },
    });

    const sortedTeams = allTeamScores
      .sort((a, b) => (a._sum.totalPoints || 0) - (b._sum.totalPoints || 0));
    
    const position = sortedTeams.findIndex(t => t.teamId === team.id) + 1;
    const totalPoints = sortedTeams.find(t => t.teamId === team.id)?._sum.totalPoints || 0;

    res.json({
      team: {
        ...team,
        position,
        totalPoints,
      },
      hasTeam: true,
    });
  } catch (error) {
    console.error('Errore recupero team in lega:', error);
    res.status(500).json({ error: 'Errore nel recupero del team' });
  }
};