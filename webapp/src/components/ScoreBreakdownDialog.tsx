import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  useTheme,
  Avatar,
  Stack,
  Divider
} from '@mui/material';
import { EmojiEvents, TrendingUp, Speed } from '@mui/icons-material';

interface RiderScore {
  riderId: string;
  riderName: string;
  riderNumber: number;
  category: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  isCaptain: boolean;
  basePoints: number;
  predictionDiff: number;
  qualifyingBonus: number;
  totalPoints: number;
}

interface ScoreBreakdownDialogProps {
  open: boolean;
  onClose: () => void;
  teamName: string;
  raceName: string;
  riderScores: RiderScore[];
  totalPoints: number;
}

export default function ScoreBreakdownDialog({
  open,
  onClose,
  teamName,
  raceName,
  riderScores,
  totalPoints
}: ScoreBreakdownDialogProps) {
  const theme = useTheme();

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MOTOGP': return '#FF6B00';
      case 'MOTO2': return '#1976D2';
      case 'MOTO3': return '#388E3C';
      default: return theme.palette.grey[500];
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack spacing={1}>
          <Typography variant="h5" fontWeight="bold">
            Dettaglio Punti
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip label={teamName} color="primary" size="small" />
            <Typography variant="body2" color="text.secondary">
              {raceName}
            </Typography>
          </Stack>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
                <TableCell>Pilota</TableCell>
                <TableCell align="center">Cat.</TableCell>
                <TableCell align="right">Arrivo</TableCell>
                <TableCell align="right">Prev.</TableCell>
                <TableCell align="right">Qual.</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Totale</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {riderScores.map((score) => (
                <TableRow 
                  key={score.riderId}
                  sx={{ 
                    backgroundColor: score.isCaptain ? alpha(theme.palette.warning.main, 0.1) : 'transparent'
                  }}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {score.isCaptain && (
                        <EmojiEvents sx={{ color: 'warning.main', fontSize: 18 }} />
                      )}
                      <Box>
                        <Typography variant="body2" fontWeight={score.isCaptain ? 'bold' : 'normal'}>
                          {score.riderName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          #{score.riderNumber}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={score.category} 
                      size="small"
                      sx={{ 
                        backgroundColor: getCategoryColor(score.category),
                        color: 'white',
                        fontSize: '0.7rem'
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">{score.basePoints}</TableCell>
                  <TableCell align="right">
                    <Typography 
                      color={score.predictionDiff > 0 ? 'success.main' : 'text.secondary'}
                    >
                      +{score.predictionDiff}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {score.qualifyingBonus > 0 && (
                      <Typography color="info.main">+{score.qualifyingBonus}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold" color="primary">
                      {score.totalPoints}
                      {score.isCaptain && ' (x2)'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 3, p: 2, backgroundColor: theme.palette.primary.main, borderRadius: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" color="white">
              Punteggio Totale
            </Typography>
            <Typography variant="h4" color="white" fontWeight="bold">
              {totalPoints}
            </Typography>
          </Stack>
        </Box>

        <Box sx={{ mt: 2, p: 2, backgroundColor: theme.palette.grey[50], borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            <strong>Legenda:</strong><br/>
            • Arrivo: Punti base per posizione di arrivo<br/>
            • Prev.: Bonus per differenza tra previsione e risultato reale<br/>
            • Qual.: Bonus qualifica (Top 3)<br/>
            • Capitano: Punti raddoppiati (indicato con trofeo)
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Chiudi</Button>
      </DialogActions>
    </Dialog>
  );
}