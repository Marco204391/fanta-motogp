// webapp/src/pages/LineupPage.tsx
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField,
  LinearProgress, Alert, Chip, Avatar, Switch, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails, Stack,
  Paper, List, ListItem, ListItemAvatar, ListItemText, CircularProgress,
  useTheme, useMediaQuery
} from '@mui/material';
import { Timer, Flag, ExpandMore, Save } from '@mui/icons-material';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [lineup, setLineupState] = useState<LineupData>({});

  // Query dati
  const { data: teamData, isLoading: loadingTeam } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => getTeamById(teamId!)
  });

  const { data: raceData, isLoading: loadingRace } = useQuery({
    queryKey: ['race', raceId],
    queryFn: () => getRaceById(raceId!)
  });

  const { data: lineupPayload } = useQuery({
    queryKey: ['lineup', teamId, raceId],
    queryFn: () => getLineup(teamId!, raceId!),
    enabled: !!teamId && !!raceId
  });
  
  const existingLineup = lineupPayload?.lineup;
  const practiceResults = lineupPayload?.practiceResults || {};

  // Inizializza lineup esistente
  React.useEffect(() => {
    if (existingLineup?.lineupRiders) {
      const lineupMap: LineupData = {};
      existingLineup.lineupRiders.forEach((item: any) => {
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
      queryClient.invalidateQueries({ queryKey: ['leagueRaceLineups', teamData?.team.leagueId, raceId] });
      navigate(-1);
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
    const ridersToSave = Object.keys(lineup)
      .filter(id => lineup[id].selected)
      .map(id => ({
        riderId: id,
        predictedPosition: parseInt(lineup[id].predictedPosition, 10),
      }));

    saveLineupMutation.mutate({
      teamId: teamId!,
      riders: ridersToSave,
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
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      {/* Header Gara - Responsive */}
      <Paper 
        sx={{ 
          p: isMobile ? 2 : 3, 
          mb: 2, 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white'
        }}
      >
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          gutterBottom
          sx={{ fontSize: isMobile ? '1.3rem' : '2rem' }}
        >
          {team.name}
        </Typography>
        <Typography 
          variant={isMobile ? "h6" : "h5"} 
          gutterBottom
          sx={{ fontSize: isMobile ? '1.1rem' : '1.5rem' }}
        >
          {race.name}
        </Typography>
        <Stack 
          direction={isMobile ? "column" : "row"} 
          spacing={1} 
          sx={{ mt: 2 }}
        >
          <Chip 
            icon={<Timer />}
            label={`Sprint: ${format(new Date(race.sprintDate), 'dd MMM', { locale: it })}`}
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              color: 'white',
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}
          />
          <Chip 
            icon={<Flag />}
            label={`Gara: ${format(new Date(race.gpDate), 'dd MMM', { locale: it })}`}
            sx={{ 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              color: 'white',
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}
          />
          {daysUntilRace > 0 && (
            <Chip 
              label={`${daysUntilRace} giorni rimanenti`}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }}
            />
          )}
        </Stack>
      </Paper>

      {/* Alert Deadline */}
      {isDeadlinePassed && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: isMobile ? '0.875rem' : '1rem' }}>
          La deadline per questa gara è scaduta. Non puoi più modificare il lineup.
        </Alert>
      )}

      {/* Progress Card - Responsive */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography variant={isMobile ? "subtitle1" : "h6"}>
              Piloti Selezionati
            </Typography>
            <Typography 
              variant={isMobile ? "subtitle1" : "h6"}
              color={lineupStats.selectedRiders.length === 6 ? 'success.main' : 'text.secondary'}
            >
              {lineupStats.selectedRiders.length}/6
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={(lineupStats.selectedRiders.length / 6) * 100}
            sx={{ height: isMobile ? 8 : 10, borderRadius: 5 }}
          />
          
          {/* Contatori per categoria - Responsive Grid */}
          <Grid container spacing={1} sx={{ mt: 2 }}>
            {Object.entries(lineupStats.categoryCounts).map(([category, count]) => (
              <Grid key={category} size={{ xs: 4 }}>
                <Box textAlign="center">
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                  >
                    {category}
                  </Typography>
                  <Typography 
                    variant={isMobile ? "body1" : "h6"}
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

      {/* Selezione Piloti per Categoria - Responsive */}
      {['MOTOGP', 'MOTO2', 'MOTO3'].map(category => {
        const categoryRiders = team.riders.filter((tr: any) => tr.rider.category === category);
        
        return (
          <Accordion key={category} defaultExpanded={!isMobile}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box 
                display="flex" 
                alignItems="center" 
                gap={isMobile ? 1 : 2} 
                width="100%"
                flexWrap={isMobile ? "wrap" : "nowrap"}
              >
                <Chip 
                  label={category}
                  size={isMobile ? "small" : "medium"}
                  sx={{ 
                    backgroundColor: categoryColors[category as keyof typeof categoryColors],
                    color: 'white',
                    fontSize: isMobile ? '0.7rem' : '0.875rem'
                  }}
                />
                <Typography 
                  sx={{ 
                    flexGrow: 1,
                    fontSize: isMobile ? '0.875rem' : '1rem'
                  }}
                >
                  Seleziona 2 piloti
                </Typography>
                <Chip 
                  label={`${lineupStats.categoryCounts[category]}/2`}
                  size={isMobile ? "small" : "medium"}
                  color={lineupStats.categoryCounts[category] === 2 ? 'success' : 'default'}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: isMobile ? 1 : 2 }}>
              <List sx={{ p: 0 }}>
                {categoryRiders.map((tr: any) => {
                  const isSelected = lineup[tr.rider.id]?.selected;
                  const riderPracticeResults = practiceResults[tr.rider.id];
                  
                  return (
                    <ListItem 
                      key={tr.rider.id}
                      sx={{ 
                        mb: isMobile ? 1 : 2,
                        border: isSelected ? 2 : 1,
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        borderRadius: 2,
                        backgroundColor: isSelected ? 'action.selected' : 'inherit',
                        p: isMobile ? 1 : 2,
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'stretch' : 'center'
                      }}
                    >
                      <Box 
                        display="flex" 
                        alignItems="center" 
                        width="100%"
                        mb={isMobile ? 1 : 0}
                      >
                        <FormControlLabel
                          control={
                            <Switch
                              checked={isSelected || false}
                              onChange={() => handleRiderToggle(tr.rider.id, category)}
                              disabled={isDeadlinePassed}
                              size={isMobile ? "small" : "medium"}
                            />
                          }
                          label=""
                        />
                        
                        <ListItemAvatar>
                          <Avatar 
                            sx={{ 
                              bgcolor: 'primary.main',
                              width: isMobile ? 32 : 40,
                              height: isMobile ? 32 : 40,
                              fontSize: isMobile ? '0.875rem' : '1.25rem'
                            }}
                          >
                            {tr.rider.number}
                          </Avatar>
                        </ListItemAvatar>
                        
                        <ListItemText
                          primary={
                            <Typography 
                              variant={isMobile ? "body2" : "body1"}
                              fontWeight="medium"
                            >
                              {tr.rider.name}
                            </Typography>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Stack 
                                direction="row" 
                                spacing={0.5} 
                                alignItems="center"
                                flexWrap="wrap"
                                sx={{ mb: 0.5 }}
                              >
                                {riderPracticeResults ? (
                                  <>
                                    <Chip 
                                      label={`FP1: ${riderPracticeResults.FP1 || 'N/D'}`} 
                                      size="small"
                                      variant="outlined"
                                      sx={{ 
                                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                                        height: isMobile ? 20 : 24
                                      }}
                                    />
                                    <Chip 
                                      label={`FP2: ${riderPracticeResults.FP2 || 'N/D'}`} 
                                      size="small"
                                      variant="outlined"
                                      sx={{ 
                                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                                        height: isMobile ? 20 : 24
                                      }}
                                    />
                                    <Chip 
                                      label={`Q: ${riderPracticeResults.Q || 'N/D'}`} 
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      sx={{ 
                                        fontSize: isMobile ? '0.7rem' : '0.75rem',
                                        height: isMobile ? 20 : 24
                                      }}
                                    />
                                  </>
                                ) : (
                                  <Typography 
                                    variant="caption" 
                                    color="text.secondary"
                                    sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                                  >
                                    Risultati prove non disponibili
                                  </Typography>
                                )}
                              </Stack>
                            </Box>
                          }
                        />
                      </Box>
                      
                      {isSelected && (
                        <Box 
                          display="flex" 
                          alignItems="center" 
                          gap={1}
                          width={isMobile ? "100%" : "auto"}
                          mt={isMobile ? 1 : 0}
                        >
                          <TextField
                            label="Posizione Prevista"
                            type="number"
                            size="small"
                            value={lineup[tr.rider.id]?.predictedPosition || ''}
                            onChange={(e) => handlePredictionChange(tr.rider.id, e.target.value)}
                            disabled={isDeadlinePassed}
                            InputProps={{
                              inputProps: { min: 1, max: 30 }
                            }}
                            sx={{ 
                              width: isMobile ? '100%' : 150,
                              '& .MuiInputBase-input': {
                                fontSize: isMobile ? '0.875rem' : '1rem'
                              }
                            }}
                          />
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

      {/* Riepilogo e Azioni - Responsive */}
      <Card sx={{ mt: 2 }}>
        <CardContent sx={{ p: isMobile ? 2 : 3 }}>
          <Typography 
            variant={isMobile ? "subtitle1" : "h6"} 
            gutterBottom
          >
            Riepilogo Lineup
          </Typography>
          
          {lineupStats.validationErrors.length > 0 && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 2,
                '& .MuiAlert-message': {
                  fontSize: isMobile ? '0.75rem' : '0.875rem'
                }
              }}
            >
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {lineupStats.validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          {lineupStats.selectedRiders.length > 0 && (
            <List dense sx={{ mb: 2 }}>
              {lineupStats.selectedRiders.map((rider, idx) => (
                <ListItem 
                  key={rider.id}
                  sx={{ 
                    py: isMobile ? 0.5 : 1,
                    px: isMobile ? 1 : 2
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        width: isMobile ? 24 : 32, 
                        height: isMobile ? 24 : 32,
                        fontSize: isMobile ? '0.75rem' : '0.875rem'
                      }}
                    >
                      {rider.number}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={
                      <Typography variant={isMobile ? "body2" : "body1"}>
                        {rider.name}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}>
                        {rider.category} • Posizione prevista: {rider.predictedPosition || 'non impostata'}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}

          <Stack 
            direction={isMobile ? "column" : "row"} 
            spacing={2} 
            justifyContent="flex-end"
          >
            <Button 
              variant="outlined" 
              onClick={() => navigate(-1)}
              fullWidth={isMobile}
              size={isMobile ? "medium" : "large"}
            >
              Annulla
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Save />}
              onClick={handleSaveLineup}
              disabled={!lineupStats.isValid || isDeadlinePassed || saveLineupMutation.isPending}
              fullWidth={isMobile}
              size={isMobile ? "medium" : "large"}
            >
              {saveLineupMutation.isPending ? 'Salvataggio...' : 'Salva Lineup'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

    </Box>
  );
}