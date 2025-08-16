// webapp/src/components/ScoreBreakdownDialog.tsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Box, Typography, Chip, Paper
} from '@mui/material';
import { EmojiEvents, HelpOutline } from '@mui/icons-material';

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

  // Determina se almeno un pilota è MotoGP per mostrare la colonna Sprint
  const showSprintColumn = displayData.some((score: any) => score.riderCategory === 'MOTOGP');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
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
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Pilota</TableCell>
                <TableCell align="center">Prevista</TableCell>
                <TableCell align="center">Gara</TableCell>
                {showSprintColumn && <TableCell align="center">Sprint</TableCell>}
                <TableCell align="right">Base</TableCell>
                <TableCell align="right">Malus Prev.</TableCell>
                <TableCell align="right">Bonus Qual.</TableCell>
                <TableCell align="right"><strong>Totale</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.map((score: any, index: number) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label={score.number || lineup.find((l:any) => l.rider.name === score.rider)?.rider.number} size="small" />
                      {score.rider}
                    </Box>
                  </TableCell>
                  <TableCell align="center">{score.predicted}°</TableCell>
                  <TableCell align="center">
                    {score.actual || '-'}
                  </TableCell>
                  {showSprintColumn && (
                    <TableCell align="center">
                      {score.riderCategory === 'MOTOGP' ? (score.sprintPosition || '-') : 'N/D'}
                    </TableCell>
                  )}
                  <TableCell align="right">{score.base}</TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={hasScores ? `+${score.predictionMalus}` : '-'}
                      size="small"
                      color={hasScores && score.predictionMalus > 0 ? "error" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">{score.qualifyingBonus || 0}</TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" fontWeight="bold">
                      {score.points}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              
              {hasScores && (
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell colSpan={showSprintColumn ? 7 : 6} align="right">
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
        
        <Box mt={2} p={1.5} bgcolor="action.hover" borderRadius={1}>
          <Typography variant="caption" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <HelpOutline fontSize="small" sx={{ mr: 1 }} />
            <strong>Legenda:</strong>&nbsp; Punti = Base + Malus Prev. + Bonus Qual.&nbsp;<strong>(vince chi fa meno punti)</strong>
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}