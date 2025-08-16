// webapp/src/components/ScoreBreakdownDialog.tsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Box, Typography, Chip, Paper, Tooltip, Alert
} from '@mui/material';
import { EmojiEvents, HelpOutline, Info } from '@mui/icons-material';

interface ScoreBreakdownProps {
  open: boolean;
  onClose: () => void;
  lineupData: any;
}

export function ScoreBreakdownDialog({ open, onClose, lineupData }: ScoreBreakdownProps) {
  if (!lineupData) return null;

  const { teamName, totalPoints, riderScores = [], lineup = [] } = lineupData;
  const hasScores = riderScores && riderScores.length > 0;

  const displayData = hasScores ? riderScores : lineup.map((l: any) => ({
    rider: l.rider.name,
    number: l.rider.number,
    riderCategory: l.rider.category,
    predicted: l.predictedPosition,
    actual: 'N/A',
    sprintPosition: 'N/A',
    base: '-',
    predictionMalus: '-',
    qualifyingBonus: '-',
    points: '-',
  }));

  const showSprintColumn = displayData.some((score: any) => score.riderCategory === 'MOTOGP');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Dettaglio Punti - {teamName}</Typography>
          <Chip
            icon={<EmojiEvents />}
            label={totalPoints ? `${totalPoints} pt totali` : 'Punteggio in attesa'}
            color={totalPoints ? "primary" : "default"}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {/* Alert informativo sulla previsione unica */}
        <Alert severity="info" icon={<Info />} sx={{ mb: 2 }}>
          <Typography variant="caption">
            <strong>Nota:</strong> Fai una sola previsione per pilota valida per l'intero weekend. 
            Per i piloti MotoGP, questa viene confrontata sia con il risultato della gara che della sprint.
          </Typography>
        </Alert>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Pilota</TableCell>
                <TableCell align="center">
                  <Tooltip title="La tua previsione unica per il weekend">
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help' }}>
                      Prevista <HelpOutline sx={{ fontSize: 14, ml: 0.5 }} />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">Gara</TableCell>
                {showSprintColumn && <TableCell align="center">Sprint</TableCell>}
                <TableCell align="right">
                  <Tooltip title="Punti Base = Posizione Gara + Posizione Sprint (solo MotoGP). I piloti ritirati prendono una penalità (ultimo classificato + 1 per ogni sessione).">
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'help' }}>
                      Base <HelpOutline sx={{ fontSize: 14, ml: 0.5 }} />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Malus = |Prevista - Pos. Gara| + |Prevista - Pos. Sprint| (solo MotoGP). La tua previsione unica viene confrontata con entrambi i risultati.">
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'help' }}>
                      Malus Prev. <HelpOutline sx={{ fontSize: 14, ml: 0.5 }} />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Bonus per le prime 3 posizioni in qualifica: 1° = -5pt, 2° = -3pt, 3° = -1pt">
                    <Box component="span" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', cursor: 'help' }}>
                      Bonus Qual. <HelpOutline sx={{ fontSize: 14, ml: 0.5 }} />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell align="right"><strong>Totale</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.map((score: any, index: number) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label={score.number || lineup.find((l: any) => l.rider.name === score.rider)?.rider.number} 
                        size="small" 
                        color={score.riderCategory === 'MOTOGP' ? 'primary' : score.riderCategory === 'MOTO2' ? 'secondary' : 'default'}
                        variant="outlined"
                      />
                      <Typography variant="body2">
                        {score.rider}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({score.riderCategory})
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight="medium">{score.predicted}°</Typography>
                  </TableCell>
                  <TableCell align="center">
                    {typeof score.actual === 'number' ? `${score.actual}°` : score.actual || '-'}
                  </TableCell>
                  {showSprintColumn && (
                    <TableCell align="center">
                      {score.riderCategory === 'MOTOGP' 
                        ? (typeof score.sprintPosition === 'number' ? `${score.sprintPosition}°` : score.sprintPosition || '-')
                        : <Typography variant="caption" color="text.disabled">N/D</Typography>}
                    </TableCell>
                  )}
                  <TableCell align="right">{score.base}</TableCell>
                  <TableCell align="right">
                    {hasScores && score.predictionMalus !== '-' ? (
                      <Chip
                        label={`+${score.predictionMalus}`}
                        size="small"
                        color={score.predictionMalus > 0 ? "error" : "default"}
                        variant="outlined"
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell align="right">
                    {score.qualifyingBonus && score.qualifyingBonus < 0 ? (
                      <Chip
                        label={score.qualifyingBonus}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    ) : score.qualifyingBonus || 0}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" fontWeight="bold" color="primary">
                      {score.points}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Riga del totale */}
              {hasScores && (
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell colSpan={showSprintColumn ? 6 : 5} align="right">
                    <Typography variant="subtitle1" fontWeight="bold">
                      TOTALE
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6" color="primary">
                      {totalPoints}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Box informativo con la formula */}
        <Box mt={2} p={2} bgcolor="action.hover" borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <HelpOutline fontSize="small" sx={{ mr: 1 }} />
            <strong>Come funziona il punteggio:</strong>
          </Typography>
          
          <Box mt={1}>
            <Typography variant="caption" component="div" gutterBottom>
              <strong>Formula:</strong> Punti Totali = Base + Malus Previsione + Bonus Qualifica
            </Typography>
            <Typography variant="caption" component="div" color="error" gutterBottom>
              <strong>⚠️ Vince chi fa MENO punti</strong> (sistema a punti inversi)
            </Typography>
          </Box>

          <Box mt={1.5}>
            <Typography variant="caption" component="div" sx={{ pl: 2, mb: 0.5 }}>
              <strong>• Punti Base:</strong> Posizione di arrivo del pilota
            </Typography>
            <Typography variant="caption" component="div" sx={{ pl: 4, mb: 0.5, color: 'text.secondary' }}>
              - MotoGP: Pos. Gara + Pos. Sprint
            </Typography>
            <Typography variant="caption" component="div" sx={{ pl: 4, mb: 0.5, color: 'text.secondary' }}>
              - Moto2/Moto3: Solo Pos. Gara
            </Typography>
            
            <Typography variant="caption" component="div" sx={{ pl: 2, mb: 0.5 }}>
              <strong>• Malus Previsione:</strong> Penalità per errore di previsione
            </Typography>
            <Typography variant="caption" component="div" sx={{ pl: 4, mb: 0.5, color: 'text.secondary' }}>
              - Una sola previsione per tutto il weekend
            </Typography>
            <Typography variant="caption" component="div" sx={{ pl: 4, mb: 0.5, color: 'text.secondary' }}>
              - MotoGP: |Prev - Gara| + |Prev - Sprint|
            </Typography>
            <Typography variant="caption" component="div" sx={{ pl: 4, mb: 0.5, color: 'text.secondary' }}>
              - Moto2/Moto3: |Prev - Gara|
            </Typography>
            
            <Typography variant="caption" component="div" sx={{ pl: 2, mb: 0.5 }}>
              <strong>• Bonus Qualifica:</strong> Premio per le qualifiche (punti negativi)
            </Typography>
            <Typography variant="caption" component="div" sx={{ pl: 4, mb: 0.5, color: 'text.secondary' }}>
              - Pole (1°): -5 punti
            </Typography>
            <Typography variant="caption" component="div" sx={{ pl: 4, mb: 0.5, color: 'text.secondary' }}>
              - 2° posto: -3 punti
            </Typography>
            <Typography variant="caption" component="div" sx={{ pl: 4, mb: 0.5, color: 'text.secondary' }}>
              - 3° posto: -1 punto
            </Typography>
            
            <Typography variant="caption" component="div" sx={{ pl: 2, mt: 1 }}>
              <strong>• Piloti ritirati:</strong> Ultimo classificato + 1 come penalità
            </Typography>
          </Box>
        </Box>

        {/* Esempio pratico */}
        <Box mt={2} p={2} bgcolor="info.main" bgcolor-opacity={0.1} borderRadius={1}>
          <Typography variant="subtitle2" gutterBottom>
            💡 Esempio pratico (Pilota MotoGP):
          </Typography>
          <Typography variant="caption" component="div" sx={{ pl: 2 }}>
            Previsione: 5° | Gara: 3° | Sprint: 7° | Qualifica: Pole
          </Typography>
          <Typography variant="caption" component="div" sx={{ pl: 2, mt: 0.5 }}>
            • Base: 3 + 7 = 10
          </Typography>
          <Typography variant="caption" component="div" sx={{ pl: 2 }}>
            • Malus: |5-3| + |5-7| = 2 + 2 = 4
          </Typography>
          <Typography variant="caption" component="div" sx={{ pl: 2 }}>
            • Bonus: -5 (pole)
          </Typography>
          <Typography variant="caption" component="div" sx={{ pl: 2, fontWeight: 'bold' }}>
            • Totale: 10 + 4 - 5 = 9 punti
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}