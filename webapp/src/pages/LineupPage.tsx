// webapp/src/pages/LineupPage.tsx
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField,
  LinearProgress, Alert, Chip, Avatar, Switch, FormControlLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Accordion, AccordionSummary, AccordionDetails, Tooltip, Stack,
  Paper, Divider, List, ListItem, ListItemAvatar, ListItemText
} from '@mui/material';
import {
  SportsMotorsports, Timer, Flag, ExpandMore, Info, Save,
  CheckCircle, Warning, HelpOutline, TrendingUp, BarChart
} from '@mui/icons-material';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { getTeamById, getLineup, setLineup, getRaceById } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface LineupData {
  [riderId: string]: {
    selected: boolean;
    predictedPosition: string;
  };
}

export default function LineupPage() {
  const { teamId, raceId } = useParams<{ teamId: string; raceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotification();
  
  const [lineup, setLineupState] = useState<LineupData>({});
  const [showPredictionHelper, setShowPredictionHelper] = useState(false);

  // Query dati
  const { data: teamData, isLoading: loadingTeam } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => getTeamById(teamId!)
  });

  const { data: raceData, isLoading: loadingRace } = useQuery({
    queryKey: ['race', raceId],
    queryFn: () => getRaceById(raceId!)
  });

  const { data: existingLineup } = useQuery({
    queryKey: ['lineup', teamId, raceId],
    queryFn: () => getLineup(teamId!, raceId!),
    enabled: !!teamId && !!raceId
  });

  // Inizializza lineup esistente
  React.useEffect(() => {
    if (existingLineup?.lineup) {
      const lineupMap: LineupData = {};
      existingLineup.lineup.forEach((item: any) => {
        lineupMap[item.riderId] = {
          selected: true,
          predictedPosition: item.predictedPosition?.toString() || ''
        };
      });
      setLineupState(lineupMap);
    }
  }, [existingLineup]);

  // Mutation per salvare lineup
  const saveLineupMutation = useMutation({
    mutationFn: (data: any) => setLineup(raceId!, data),
    onSuccess: () => {
      notify('Lineup salvato con successo!', 'success');
      queryClient.invalidateQueries({ queryKey: ['lineup', teamId, raceId] });
      queryClient.invalidateQueries({ queryKey: ['myTeams'] });
      navigate(`/teams`);
    },
    onError: (error: any) => {
      notify(error.response?.data?.error || 'Errore nel salvataggio', 'error');
    }
  });

  // Gestione selezione piloti
  const handleRiderToggle = (riderId: string, category: string) => {
    const categoryCount = Object.entries(lineup).filter(([id, data]) => {
      const rider = teamData?.team.riders.find((r: any) => r.rider.id === id)?.rider;
      return data.selected && rider?.category === category;
    }).length;

    if (!lineup[riderId]?.selected && categoryCount >= 2) {
      notify(`Hai già selezionato 2 piloti ${category}`, 'warning');
      return;
    }

    setLineupState(prev => ({
      ...prev,
      [riderId]: {
        selected: !prev[riderId]?.selected,
        predictedPosition: prev[riderId]?.predictedPosition || ''
      }
    }));
  };

  // Gestione previsioni
  const handlePredictionChange = (riderId: string, position: string) => {
    setLineupState(prev => ({
      ...prev,
      [riderId]: {
        ...prev[riderId],
        predictedPosition: position
      }
    }));
  };

  // Validazione
  const lineupStats = useMemo(() => {
    const stats = {
      categoryCounts: { MOTOGP: 0, MOTO2: 0, MOTO3: 0 } as Record<string, number>,
      isValid: false,
      validationErrors: [] as string[],
      selectedRiders: [] as any[]
    };

    if (!teamData) return stats;

    Object.entries(lineup).forEach(([riderId, data]) => {
      if (data.selected) {
        const riderData = teamData.team.riders.find((r: any) => r.rider.id === riderId)?.rider;
        if (riderData) {
          stats.categoryCounts[riderData.category]++;
          stats.selectedRiders.push({
            ...riderData,
            predictedPosition: data.predictedPosition
          });
        }
      }
    });

    // Validazione regole
    if (stats.categoryCounts.MOTOGP !== 2) {
      stats.validationErrors.push(`MotoGP: ${stats.categoryCounts.MOTOGP}/2 piloti`);
    }
    if (stats.categoryCounts.MOTO2 !== 2) {
      stats.validationErrors.push(`Moto2: ${stats.categoryCounts.MOTO2}/2 piloti`);
    }
    if (stats.categoryCounts.MOTO3 !== 2) {
      stats.validationErrors.push(`Moto3: ${stats.categoryCounts.MOTO3}/2 piloti`);
    }

    // Validazione posizioni
    stats.selectedRiders.forEach(rider => {
      const pos = parseInt(rider.predictedPosition);
      if (!rider.predictedPosition || isNaN(pos) || pos < 1 || pos > 30) {
        stats.validationErrors.push(`Posizione non valida per ${rider.name}`);
      }
    });

    stats.isValid = stats.validationErrors.length === 0 && stats.selectedRiders.length === 6;
    return stats;
  }, [lineup, teamData]);

  // Salva lineup
  const handleSaveLineup = () => {
    const activeRiderIds = Object.entries(lineup)
      .filter(([_, data]) => data.selected)
      .map(([riderId, data]) => ({
        riderId,
        predictedPosition: parseInt(data.predictedPosition)
      }));

    saveLineupMutation.mutate({
      teamId: teamId!,
      lineupData: activeRiderIds
    });
  };

  if (loadingTeam || loadingRace) return <CircularProgress />;
  if (!teamData || !raceData) return <Alert severity="error">Dati non trovati</Alert>;

  const team = teamData.team;
  const race = raceData.race;
  const deadline = race.sprintDate || race.gpDate;
  const isDeadlinePassed = new Date() > new Date(deadline);
  const daysUntilRace = differenceInDays(new Date(race.gpDate), new Date());

  const categoryColors = {
    MOTOGP: '#E60023',
    MOTO2: '#FF6B00', 
    MOTO3: '#1976D2'
  };

  return (
    <Box>
      {/* Header Gara */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3, 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white'
        }}
      >
        <Typography variant="h4" gutterBottom>{team.name}</Typography>
        <Typography variant="h5" gutterBottom>{race.name}</Typography>
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Chip 
            icon={<Timer />}
            label={`Sprint: ${format(new Date(race.sprintDate), 'dd MMM', { locale: it })}`}
            sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
          <Chip 
            icon={<Flag />}
            label={`Gara: ${format(new Date(race.gpDate), 'dd MMM', { locale: it })}`}
            sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
          {daysUntilRace > 0 && (
            <Chip 
              label={`${daysUntilRace} giorni rimanenti`}
              sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
          )}
        </Stack>
      </Paper>

      {/* Alert Deadline */}
      {isDeadlinePassed && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          La deadline per questa gara è scaduta. Non puoi più modificare il lineup.
        </Alert>
      )}

      {/* Progress */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant="h6">Piloti Selezionati</Typography>
            <Typography 
              variant="h6" 
              color={lineupStats.selectedRiders.length === 6 ? 'success.main' : 'text.secondary'}
            >
              {lineupStats.selectedRiders.length}/6
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={(lineupStats.selectedRiders.length / 6) * 100}
            sx={{ height: 10, borderRadius: 5 }}
          />
          
          {/* Contatori per categoria */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {Object.entries(lineupStats.categoryCounts).map(([category, count]) => (
              <Grid item xs={4} key={category}>
                <Box textAlign="center">
                  <Typography variant="caption" color="text.secondary">
                    {category}
                  </Typography>
                  <Typography 
                    variant="h6" 
                    color={count === 2 ? 'success.main' : 'text.secondary'}
                  >
                    {count}/2
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Selezione Piloti per Categoria */}
      {['MOTOGP', 'MOTO2', 'MOTO3'].map(category => {
        const categoryRiders = team.riders.filter((tr: any) => tr.rider.category === category);
        
        return (
          <Accordion key={category} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <Chip 
                  label={category}
                  sx={{ 
                    backgroundColor: categoryColors[category as keyof typeof categoryColors],
                    color: 'white'
                  }}
                />
                <Typography sx={{ flexGrow: 1 }}>
                  Seleziona 2 piloti
                </Typography>
                <Chip 
                  label={`${lineupStats.categoryCounts[category]}/2`}
                  color={lineupStats.categoryCounts[category] === 2 ? 'success' : 'default'}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {categoryRiders.map((tr: any) => {
                  const isSelected = lineup[tr.rider.id]?.selected;
                  
                  return (
                    <ListItem 
                      key={tr.rider.id}
                      sx={{ 
                        mb: 2,
                        border: isSelected ? 2 : 1,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        borderRadius: 2,
                        backgroundColor: isSelected ? 'action.selected' : 'inherit'
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={isSelected || false}
                            onChange={() => handleRiderToggle(tr.rider.id, category)}
                            disabled={isDeadlinePassed}
                          />
                        }
                        label=""
                      />
                      
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {tr.rider.number}
                        </Avatar>
                      </ListItemAvatar>
                      
                      <ListItemText
                        primary={tr.rider.name}
                        secondary={`${tr.rider.team} • ${tr.rider.value}€`}
                      />
                      
                      {isSelected && (
                        <Box display="flex" alignItems="center" gap={2}>
                          <TextField
                            label="Posizione Prevista"
                            type="number"
                            size="small"
                            value={lineup[tr.rider.id]?.predictedPosition || ''}
                            onChange={(e) => handlePredictionChange(tr.rider.id, e.target.value)}
                            disabled={isDeadlinePassed}
                            inputProps={{ min: 1, max: 30 }}
                            sx={{ width: 120 }}
                            helperText="1-30"
                          />
                          <Tooltip title="Media punti">
                            <Chip 
                              icon={<TrendingUp />}
                              label={`${tr.rider.averagePoints?.toFixed(1) || 'N/D'} pt`}
                              size="small"
                            />
                          </Tooltip>
                        </Box>
                      )}
                    </ListItem>
                  );
                })}
              </List>
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Errori di Validazione */}
      {lineupStats.validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Correggere i seguenti errori:
          </Typography>
          <ul>
            {lineupStats.validationErrors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Azioni */}
      <Paper sx={{ p: 3, mt: 3, position: 'sticky', bottom: 0, zIndex: 10 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Button
            variant="outlined"
            startIcon={<HelpOutline />}
            onClick={() => setShowPredictionHelper(true)}
          >
            Come Funzionano le Previsioni
          </Button>
          
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              onClick={() => navigate(-1)}
            >
              Annulla
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveLineup}
              disabled={!lineupStats.isValid || isDeadlinePassed || saveLineupMutation.isPending}
            >
              {saveLineupMutation.isPending ? 'Salvataggio...' : 'Salva Lineup'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Dialog Helper Previsioni */}
      <Dialog 
        open={showPredictionHelper} 
        onClose={() => setShowPredictionHelper(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Info color="primary" />
            Sistema di Previsioni e Punteggio
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <Alert severity="info">
              Prevedi la posizione di arrivo di ogni pilota per guadagnare punti bonus!
            </Alert>
            
            <Box>
              <Typography variant="h6" gutterBottom>Sistema Punteggio:</Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Previsione Esatta"
                    secondary="+10 punti bonus"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Errore di 1 posizione"
                    secondary="+5 punti bonus"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Errore di 2-3 posizioni"
                    secondary="+2 punti bonus"
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Previsione DNF corretta"
                    secondary="+8 punti bonus"
                  />
                </ListItem>
              </List>
            </Box>
            
            <Box>
              <Typography variant="h6" gutterBottom>Suggerimenti:</Typography>
              <Typography variant="body2" component="div">
                • Analizza le performance recenti dei piloti<br/>
                • Considera le caratteristiche del circuito<br/>
                • Valuta le condizioni meteo previste<br/>
                • Tieni conto dello storico del pilota sul tracciato<br/>
                • Non sottovalutare i piloti delle categorie minori
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPredictionHelper(false)}>
            Chiudi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}