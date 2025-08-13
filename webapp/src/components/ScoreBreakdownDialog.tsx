// webapp/src/components/ScoreBreakdownDialog.tsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Box, Typography, Chip, Paper, Divider
} from '@mui/material';
import { EmojiEvents, TrendingUp } from '@mui/icons-material';

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
    predicted: l.predictedPosition,
    actual: 'N/A',
    base: '-',
    predictionBonus: '-',
    qualifyingBonus: '-',
    points: '-',
  }));


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
                <TableCell align="center">Pos. Prevista</TableCell>
                <TableCell align="center">Pos. Reale</TableCell>
                <TableCell align="right">Base</TableCell>
                <TableCell align="right">Bonus Prev.</TableCell>
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
                    {score.actual ? `${score.actual}°` : 'In attesa'}
                  </TableCell>
                  <TableCell align="right">{score.base}</TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={hasScores ? `+${score.predictionBonus}` : '-'}
                      size="small"
                      color={hasScores && score.predictionBonus > 0 ? "success" : "default"}
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
                  <TableCell colSpan={6} align="right">
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
        
        <Box mt={2} p={2} bgcolor="info.lighter" borderRadius={1}>
          <Typography variant="caption" component="div">
            <strong>Legenda:</strong><br/>
            • Base: Punti per posizione di arrivo<br/>
            • Bonus Prev.: Punti bonus per accuratezza previsione<br/>
            • Bonus Qual.: Punti extra per pole position o giro veloce
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}