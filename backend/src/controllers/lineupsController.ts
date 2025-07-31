// backend/src/controllers/lineupsController.ts
import { Response } from 'express';
import { PrismaClient, Category } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// GET /api/lineups/:raceId?teamId=... - Recupera schieramento per una gara
export const getLineup = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { raceId } = req.params;
  const { teamId } = req.query;

  if (!teamId) {
    return res.status(400).json({ error: 'ID del team mancante' });
  }

  try {
    const lineup = await prisma.raceLineup.findUnique({
      where: {
        teamId_raceId: {
          teamId: String(teamId),
          raceId,
        },
        team: {
          userId, // Assicura che l'utente possieda il team
        },
      },
      include: {
        lineupRiders: {
          include: {
            rider: true,
          },
        },
      },
    });

    if (!lineup) {
      return res.status(404).json({ message: 'Nessuno schieramento trovato per questa gara.' });
    }

    res.json({ lineup });
  } catch (error) {
    console.error("Errore nel recupero dello schieramento:", error);
    res.status(500).json({ error: "Errore nel recupero dello schieramento" });
  }
};

// POST /api/lineups/:raceId - Crea o aggiorna uno schieramento
export const setLineup = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { raceId } = req.params;
  const { teamId, riders } = req.body; // riders: [{ riderId: string, predictedPosition: number }]

  try {
    // 1. Validazione input base
    if (!teamId || !riders || !Array.isArray(riders) || riders.length !== 6) {
      return res.status(400).json({ 
        error: 'Dati dello schieramento non validi. Devi schierare 6 piloti (2 per categoria).' 
      });
    }

    // 2. Controlla la deadline della gara
    const race = await prisma.race.findUnique({ where: { id: raceId } });
    if (!race) {
      return res.status(404).json({ error: 'Gara non trovata' });
    }

    const deadline = race.sprintDate || race.date;
    if (new Date() > new Date(deadline)) {
      return res.status(403).json({ error: 'La deadline per schierare la formazione è passata.' });
    }

    // 3. Verifica che il team appartenga all'utente e ottieni i piloti
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId },
      include: { 
        riders: { 
          include: { 
            rider: true 
          } 
        } 
      },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team non trovato o non autorizzato.' });
    }

    // 4. Validazione dettagliata dello schieramento
    const schieratoPerCategoria: Record<Category, number> = { 
      MOTOGP: 0, 
      MOTO2: 0, 
      MOTO3: 0 
    };
    
    // Verifica che tutti i piloti schierati appartengano al team
    for (const riderLineup of riders) {
      const teamRider = team.riders.find(tr => tr.riderId === riderLineup.riderId);
      
      if (!teamRider) {
        return res.status(400).json({ 
          error: 'Uno dei piloti schierati non appartiene al tuo team' 
        });
      }
      
      // Conta piloti per categoria
      schieratoPerCategoria[teamRider.rider.category]++;
      
      // Verifica posizione prevista valida
      if (!riderLineup.predictedPosition || 
          riderLineup.predictedPosition < 1 || 
          riderLineup.predictedPosition > 30) {
        return res.status(400).json({ 
          error: `Posizione prevista non valida per ${teamRider.rider.name}. Deve essere tra 1 e 30.` 
        });
      }
    }

    // 5. Verifica esattamente 2 piloti per categoria
    if (schieratoPerCategoria.MOTOGP !== 2 || 
        schieratoPerCategoria.MOTO2 !== 2 || 
        schieratoPerCategoria.MOTO3 !== 2) {
      return res.status(400).json({ 
        error: 'Devi schierare esattamente 2 piloti per ogni categoria (2 MotoGP, 2 Moto2, 2 Moto3)' 
      });
    }

    // 6. Recupera schieramento precedente se esiste
    const existingLineup = await prisma.raceLineup.findUnique({
      where: {
        teamId_raceId: { teamId, raceId }
      }
    });

    // 7. Crea o aggiorna lo schieramento in una transazione
    const lineup = await prisma.$transaction(async (tx) => {
      // Se esiste già uno schieramento, elimina i piloti precedenti
      if (existingLineup) {
        await tx.lineupRider.deleteMany({
          where: { lineupId: existingLineup.id }
        });
      }

      // Crea o aggiorna lo schieramento
      const raceLineup = await tx.raceLineup.upsert({
        where: {
          teamId_raceId: { teamId, raceId }
        },
        update: {
          updatedAt: new Date()
        },
        create: {
          teamId,
          raceId
        }
      });

      // Aggiungi i nuovi piloti schierati
      await tx.lineupRider.createMany({
        data: riders.map((r: any) => ({
          lineupId: raceLineup.id,
          riderId: r.riderId,
          predictedPosition: r.predictedPosition
        }))
      });

      // Recupera lo schieramento completo
      return tx.raceLineup.findUnique({
        where: { id: raceLineup.id },
        include: {
          lineupRiders: {
            include: { rider: true }
          },
          race: true
        }
      });
    });

    res.json({ 
      success: true, 
      lineup,
      message: 'Schieramento salvato con successo!' 
    });

  } catch (error) {
    console.error('Errore salvataggio schieramento:', error);
    res.status(500).json({ error: 'Errore nel salvataggio dello schieramento' });
  }
};

// GET /api/lineups/last-valid/:teamId - Recupera l'ultimo schieramento valido
export const getLastValidLineup = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { teamId } = req.params;

  try {
    // Verifica che il team appartenga all'utente
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team non trovato o non autorizzato' });
    }

    // Trova l'ultimo schieramento fatto
    const lastLineup = await prisma.raceLineup.findFirst({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      include: {
        lineupRiders: {
          include: { rider: true }
        },
        race: true
      }
    });

    if (!lastLineup) {
      return res.status(404).json({ message: 'Nessuno schieramento precedente trovato' });
    }

    res.json({ lineup: lastLineup });
  } catch (error) {
    console.error('Errore recupero ultimo schieramento:', error);
    res.status(500).json({ error: 'Errore nel recupero dello schieramento' });
  }
};