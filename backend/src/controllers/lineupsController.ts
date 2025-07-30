// backend/src/controllers/lineupsController.ts
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
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
    // 1. Validazione input
    if (!teamId || !riders || !Array.isArray(riders) || riders.length !== 6) {
      return res.status(400).json({ error: 'Dati dello schieramento non validi. Devi schierare 6 piloti.' });
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

    // 3. Verifica che il team appartenga all'utente
    const team = await prisma.team.findFirst({
      where: { id: teamId, userId },
      include: { riders: { select: { riderId: true } } },
    });

    if (!team) {
      return res.status(404).json({ error: 'Team non trovato o non autorizzato.' });
    }
    
    // 4. Inizia la transazione per garantire l'integrità dei dati
    const savedLineup = await prisma.$transaction(async (tx) => {
        // Logica per creare o aggiornare lo schieramento qui...
        // Per semplicità, la omettiamo in questa fase ma è importante per la robustezza
        
        // Prima si elimina il vecchio schieramento se esiste
        await tx.raceLineup.deleteMany({
            where: { teamId, raceId },
        });

        // E poi si crea quello nuovo
        return tx.raceLineup.create({
            data: {
                teamId,
                raceId,
                lineupRiders: {
                    create: riders.map((r: { riderId: string; predictedPosition: number }) => ({
                        riderId: r.riderId,
                        predictedPosition: r.predictedPosition,
                    })),
                },
            },
            include: {
                lineupRiders: { include: { rider: true } },
            },
        });
    });

    res.status(201).json({ success: true, lineup: savedLineup });

  } catch (error) {
    console.error("Errore nel salvataggio dello schieramento:", error);
    res.status(500).json({ error: "Errore nel salvataggio dello schieramento" });
  }
};