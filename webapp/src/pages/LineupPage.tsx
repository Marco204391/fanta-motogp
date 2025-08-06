// webapp/src/pages/LineupPage.tsx
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  Grid,
  Paper,
  Stack,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Badge,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save,
  Cancel,
  EmojiEvents,
  SwapVert,
  ExpandMore,
  CheckCircle,
  Warning,
  Info,
  Timer,
  SportsMotorsports,
} from '@mui/icons-material';
import { format, isPast } from 'date-fns';
import { it } from 'date-fns/locale';
import { getTeamById, getRaceById, setLineup, getLineup } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

interface Rider {
  id: string;
  name: string;
  number: number;
  team: string;
  category: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  value: number;
}

const categoryColors = {
  MOTOGP: '#FF6B00',
  MOTO2: '#1976D2',
  MOTO3: '#388E3C',
};

export default function LineupPage() {
  const { teamId, raceId } = useParams<{ teamId: string; raceId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotification();

  const [activeRiders, setActiveRiders] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string>('');
  const [substitutions, setSubstitutions] = useState<Map<string, string>>(new Map());

  // Query dati
  const { data: teamData, isLoading: isLoadingTeam } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => getTeamById(teamId!),
  });

  const { data: raceData, isLoading: isLoadingRace } = useQuery({
    queryKey: ['race', raceId],
    queryFn: () => getRaceById(raceId!),
  });

  const { data: existingLineup } = useQuery({
    queryKey: ['lineup', teamId, raceId],
    queryFn: () => getLineup(teamId!, raceId!),
    enabled: !!teamId && !!raceId,
  });

  // Inizializza lineup esistente
  React.useEffect(() => {
    if (existingLineup) {
      setActiveRiders(existingLineup.activeRiderIds || []);
      setCaptainId(existingLineup.captainId || '');
    } else if (teamData?.team?.riders) {
      // Se non c'è lineup, usa i primi 6 piloti di default
      const defaultActive = teamData.team.riders.slice(0, 6).map((r: Rider) => r.id);
      setActiveRiders(defaultActive);
    }
  }, [existingLineup, teamData]);

  const saveLineupMutation = useMutation({
    mutationFn: (data: { activeRiderIds: string[]; captainId?: string }) =>
      setLineup(raceId!, { teamId: teamId!, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineup', teamId, raceId] });
      notify('Formazione salvata con successo!', 'success');
      navigate(-1);
    },
    onError: () => {
      notify('Errore nel salvataggio della formazione', 'error');
    },
  });

  const handleToggleRider = (riderId: string) => {
    setActiveRiders(prev => {
      if (prev.includes(riderId)) {
        // Rimuovi dalla formazione
        if (riderId === captainId) setCaptainId('');
        return prev.filter(id => id !== riderId);
      } else if (prev.length < 6) {
        // Aggiungi alla formazione
        return [...prev, riderId];
      }
      return prev;
    });
  };

  const handleSetCaptain = (riderId: string) => {
    if (activeRiders.includes(riderId)) {
      setCaptainId(riderId === captainId ? '' : riderId);
    }
  };

  const handleSave = () => {
    if (activeRiders.length !== 6) {
      notify('Devi schierare esattamente 6 piloti', 'warning');
      return;
    }
    if (!captainId) {
      notify('Devi selezionare un capitano', 'warning');
      return;
    }
    saveLineupMutation.mutate({ activeRiderIds: activeRiders, captainId });
  };

  const isDeadlinePassed = raceData?.race && isPast(new Date(raceData.race.qualifyingDate));

  const getRidersByCategory = useMemo(() => {
    if (!teamData?.team?.riders) return { MOTOGP: [], MOTO2: [], MOTO3: [] };
    
    return teamData.team.riders.reduce((acc: any, rider: Rider) => {
      if (!acc[rider.category]) acc[rider.category] = [];
      acc[rider.category].push(rider);
      return acc;
    }, { MOTOGP: [], MOTO2: [], MOTO3: [] });
  }, [teamData]);

  if (isLoadingTeam || isLoadingRace) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Schiera Formazione
        </Typography>
        {raceData?.race && (
          <Chip
            icon={<Timer />}
            label={`Deadline: ${format(new Date(raceData.race.qualifyingDate), 'dd MMM HH:mm', { locale: it })}`}
            color={isDeadlinePassed ? 'error' : 'success'}
          />
        )}
      </Stack>

      {isDeadlinePassed && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          La deadline per questa gara è scaduta. Non puoi più modificare la formazione.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Colonna sinistra: Selezione piloti */}
        <Grid item xs={12} md={7}>
          {Object.entries(getRidersByCategory).map(([category, riders]) => (
            <Accordion key={category} defaultExpanded={category === 'MOTOGP'}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip
                    label={category}
                    sx={{ 
                      backgroundColor: categoryColors[category as keyof typeof categoryColors],
                      color: 'white' 
                    }}
                  />
                  <Typography>
                    {(riders as Rider[]).filter(r => activeRiders.includes(r.id)).length}/{(riders as Rider[]).length} schierati
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {(riders as Rider[]).map((rider) => {
                    const isActive = activeRiders.includes(rider.id);
                    const isCaptain = rider.id === captainId;
                    
                    return (
                      <ListItem
                        key={rider.id}
                        sx={{
                          border: '1px solid',
                          borderColor: isActive ? 'primary.main' : 'divider',
                          borderRadius: 1,
                          mb: 1,
                          backgroundColor: isActive ? 'action.hover' : 'transparent',
                          opacity: !isActive && activeRiders.length >= 6 ? 0.5 : 1,
                        }}
                      >
                        <ListItemAvatar>
                          <Badge
                            invisible={!isCaptain}
                            badgeContent={<EmojiEvents sx={{ fontSize: 16 }} />}
                            color="warning"
                          >
                            <Avatar sx={{ bgcolor: categoryColors[category as keyof typeof categoryColors] }}>
                              {rider.number}
                            </Avatar>
                          </Badge>
                        </ListItemAvatar>
                        
                        <ListItemText
                          primary={
                            <Typography fontWeight={isActive ? 'bold' : 'normal'}>
                              {rider.name}
                            </Typography>
                          }
                          secondary={rider.team}
                        />
                        
                        <ListItemSecondaryAction>
                          <Stack direction="row" spacing={1}>
                            {isActive && (
                              <Tooltip title={isCaptain ? "Rimuovi capitano" : "Imposta come capitano"}>
                                <IconButton
                                  onClick={() => handleSetCaptain(rider.id)}
                                  disabled={isDeadlinePassed}
                                  color={isCaptain ? "warning" : "default"}
                                >
                                  <EmojiEvents />
                                </IconButton>
                              </Tooltip>
                            )}
                            <ToggleButton
                              value="active"
                              selected={isActive}
                              onChange={() => handleToggleRider(rider.id)}
                              disabled={isDeadlinePassed || (!isActive && activeRiders.length >= 6)}
                              size="small"
                            >
                              {isActive ? 'Schierato' : 'Panchina'}
                            </ToggleButton>
                          </Stack>
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  })}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </Grid>

        {/* Colonna destra: Riepilogo formazione */}
        <Grid item xs={12} md={5}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Formazione Schierata
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" spacing={2} mb={2}>
                  <Chip
                    icon={<CheckCircle />}
                    label={`${activeRiders.length}/6 Piloti`}
                    color={activeRiders.length === 6 ? 'success' : 'default'}
                  />
                  <Chip
                    icon={<EmojiEvents />}
                    label={captainId ? 'Capitano OK' : 'Manca Capitano'}
                    color={captainId ? 'warning' : 'default'}
                  />
                </Stack>

                <Divider sx={{ my: 2 }} />

                {['MOTOGP', 'MOTO2', 'MOTO3'].map(category => {
                  const categoryRiders = getRidersByCategory[category as keyof typeof getRidersByCategory]
                    .filter((r: Rider) => activeRiders.includes(r.id));
                  
                  return (
                    <Box key={category} sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {category}
                      </Typography>
                      {categoryRiders.length > 0 ? (
                        <Stack spacing={1}>
                          {categoryRiders.map((rider: Rider) => (
                            <Paper
                              key={rider.id}
                              sx={{
                                p: 1.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                borderLeft: '3px solid',
                                borderColor: categoryColors[category as keyof typeof categoryColors],
                              }}
                            >
                              <Stack direction="row" spacing={1} alignItems="center">
                                {rider.id === captainId && (
                                  <EmojiEvents sx={{ color: 'warning.main', fontSize: 20 }} />
                                )}
                                <Box>
                                  <Typography variant="body2" fontWeight="bold">
                                    {rider.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    #{rider.number} - {rider.team}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                          Nessun pilota schierato
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<Save />}
                  onClick={handleSave}
                  disabled={isDeadlinePassed || activeRiders.length !== 6 || !captainId || saveLineupMutation.isPending}
                >
                  Salva Formazione
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  startIcon={<Cancel />}
                  onClick={() => navigate(-1)}
                >
                  Annulla
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}