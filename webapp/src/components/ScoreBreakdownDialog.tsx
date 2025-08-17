// webapp/src/components/ScoreBreakdownDialog.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Box, Typography, Chip, Paper, IconButton, Collapse
} from '@mui/material';
import { EmojiEvents, ExpandMore, ExpandLess, Info } from '@mui/icons-material';

interface ScoreBreakdownProps {
  open: boolean;
  onClose: () => void;
  lineupData: any;
}

export function ScoreBreakdownDialog({ open, onClose, lineupData }: ScoreBreakdownProps) {
  const [showHelp, setShowHelp] = useState(false);
  
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{teamName}</Typography>
          <Chip
            icon={<EmojiEvents />}
            label={`${totalPoints || '-'} pt`}
            color={totalPoints ? "primary" : "default"}
            size="small"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ px: { xs: 1, sm: 3 } }}>
        {/* Tabella compatta */}
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ px: 1 }}>Pilota</TableCell>
                <TableCell align="center" sx={{ px: 0.5 }}>Prev</TableCell>
                <TableCell align="center" sx={{ px: 0.5 }}>Gara</TableCell>
                {showSprintColumn && <TableCell align="center" sx={{ px: 0.5 }}>Sprint</TableCell>}
                <TableCell align="center" sx={{ px: 0.5 }}>Base</TableCell>
                <TableCell align="center" sx={{ px: 0.5 }}>Malus</TableCell>
                <TableCell align="center" sx={{ px: 0.5 }}>Qual</TableCell>
                <TableCell align="right" sx={{ px: 1 }}><strong>Tot</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayData.map((score: any, index: number) => (
                <TableRow key={index}>
                  <TableCell sx={{ px: 1 }}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        #{score.number || '-'}
                      </Typography>
                      <Typography variant="body2" noWrap>
                        {score.rider.split(' ').pop()} {/* Solo cognome per salvare spazio */}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <Typography variant="body2">{score.predicted}°</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <Typography variant="body2">
                      {typeof score.actual === 'number' ? `${score.actual}°` : score.actual || '-'}
                    </Typography>
                  </TableCell>
                  {showSprintColumn && (
                    <TableCell align="center" sx={{ px: 0.5 }}>
                      <Typography variant="body2">
                        {score.riderCategory === 'MOTOGP' 
                          ? (typeof score.sprintPosition === 'number' ? `${score.sprintPosition}°` : score.sprintPosition || '-')
                          : '-'}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    <Typography variant="body2">{score.base}</Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    {hasScores && score.predictionMalus !== '-' ? (
                      <Typography variant="body2" color="error">
                        +{score.predictionMalus}
                      </Typography>
                    ) : '-'}
                  </TableCell>
                  <TableCell align="center" sx={{ px: 0.5 }}>
                    {score.qualifyingBonus && score.qualifyingBonus < 0 ? (
                      <Typography variant="body2" color="success.main">
                        {score.qualifyingBonus}
                      </Typography>
                    ) : '0'}
                  </TableCell>
                  <TableCell align="right" sx={{ px: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {score.points}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              
              {/* Totale */}
              {hasScores && (
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell colSpan={showSprintColumn ? 7 : 6} align="right" sx={{ px: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      TOTALE
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ px: 1 }}>
                    <Typography variant="h6" color="primary">
                      {totalPoints}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Info collassabile */}
        <Box mt={2}>
          <Button
            size="small"
            onClick={() => setShowHelp(!showHelp)}
            startIcon={<Info />}
            endIcon={showHelp ? <ExpandLess /> : <ExpandMore />}
            sx={{ textTransform: 'none' }}
          >
            Come funziona
          </Button>
          
          <Collapse in={showHelp}>
            <Box mt={1} p={1.5} bgcolor="action.hover" borderRadius={1}>
              <Typography variant="caption" component="div" gutterBottom>
                <strong>Formula:</strong> Base + Malus + Bonus Qual = Totale
              </Typography>
              <Typography variant="caption" component="div" color="error" gutterBottom>
                ⚠️ <strong>Vince chi fa MENO punti</strong>
              </Typography>
              
              <Typography variant="caption" component="div" sx={{ mt: 1 }}>
                • <strong>Base:</strong> Pos. arrivo (Gara + Sprint per MotoGP)
              </Typography>
              <Typography variant="caption" component="div">
                • <strong>Malus:</strong> |Previsione - Reale| per ogni sessione
              </Typography>
              <Typography variant="caption" component="div">
                • <strong>Bonus Qual:</strong> 1°: -5 | 2°: -3 | 3°: -2
              </Typography>
              <Typography variant="caption" component="div">
                • <strong>Non partecipanti alla gara (non classificati):</strong> Ultimo + 1
              </Typography>
              
              <Box mt={1} p={1} bgcolor="background.paper" borderRadius={0.5}>
                <Typography variant="caption" color="text.secondary">
                  <strong>Nota:</strong> Una sola previsione vale per tutto il weekend (gara + sprint)
                </Typography>
              </Box>
            </Box>
          </Collapse>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} size="small">Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}