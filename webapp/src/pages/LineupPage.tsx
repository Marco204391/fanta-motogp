// src/pages/LineupPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeamById, getUpcomingRaces, getLineup, setLineup } from '../services/api';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button,
  Grid,
  Stack,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Paper,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import {
  SportsMotorsports,
  Star,
  StarBorder,
  Save,
  Check,
  Info,
  Timer,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Rider {
  id: string;
  name: string;
  number: number;
  category: string;
  value: number;
}

interface TeamRider {
  rider: Rider;
}

interface Team {
  id: string;
  name: string;
  league: {
    id: string;
    name: string;
    budget: number;
    teamsLocked: boolean;
  };
  riders: TeamRider[];
  remainingBudget: number;
}

interface LineupData {
  activeRiderIds: string[];
  captainId?: string;
}

const categoryColors = {
  MOTOGP: '#FF6B00',
  MOTO2: '#1976D2',
  MOTO3: '#388E3C',
};

function RiderCard({ 
  rider, 
  isActive, 
  isCaptain, 
  onToggle, 
  onSetCaptain,
  disabled 
}: {
  rider: Rider;
  isActive: boolean;
  isCaptain: boolean;
  onToggle: () => void;
  onSetCaptain: () => void;
  disabled?: boolean;
}) {
  return (
    <Card sx={{ mb: 2, opacity: disabled ? 0.6 : 1 }}>
      <ListItemButton 
        onClick={onToggle} 
        disabled={disabled}
        sx={{ 
          bgcolor: isActive ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: isActive ? 'action.selected' : 'action.hover' }
        }}
      >
        <ListItemAvatar>
          <Avatar
            sx={{
              bgcolor: categoryColors[rider.category as keyof typeof categoryColors],
              width: 48,
              height: 48,
            }}
          >
            {rider.number}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="subtitle1" fontWeight="medium">
                {rider.name}
              </Typography>
              {isCaptain && (
                <Chip
                  icon={<Star />}
                  label="Capitano"
                  size="small"
                  color="warning"
                />
              )}
            </Stack>
          }
          secondary={
            <Stack direction="row" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {rider.category}
              </Typography>
              <Typography variant="body2" color="primary">
                {rider.value} crediti
              </Typography>
            </Stack>
          }
        />
        <Stack direction="row" spacing={1}>
          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                color="primary"
              />
            }
            label={isActive ? 'Attivo' : 'Panchina'}
            onClick={(e) => e.stopPropagation()}
          />
          {isActive && (
            <Button
              size="small"
              variant={isCaptain ? "contained" : "outlined"}
              color="warning"
              onClick={(e) => {
                e.stopPropagation();
                onSetCaptain();
              }}
              startIcon={isCaptain ? <Star /> : <StarBorder />}
            >
              {isCaptain ? 'Capitano' : 'Nomina'}
            </Button>
          )}
        </Stack>
      </ListItemButton>
    </Card>
  );
}

export default function LineupPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeRiderIds, setActiveRiderIds] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | undefined>();

  const { data: teamData, isLoading: loadingTeam } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => getTeamById(teamId!),
  });

  const { data: racesData } = useQuery({
    queryKey: ['upcomingRaces'],
    queryFn: getUpcomingRaces,
  });

  const nextRace = racesData?.races?.[0];

  const { data: lineupData, isLoading: loadingLineup } = useQuery({
    queryKey: ['lineup', teamId, nextRace?.id],
    queryFn: () => getLineup(teamId!, nextRace!.id),
    enabled: !!teamId && !!nextRace,
  });

  const { mutate: saveLineup, isPending: savingLineup } = useMutation({
    mutationFn: (data: LineupData) => setLineup(nextRace!.id, { 
      teamId: teamId!, 
      ...data 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineup', teamId, nextRace?.id] });
      alert('Formazione salvata con successo!');
    },
    onError: (error: any) => {
      alert(`Errore: ${error.response?.data?.error || 'Impossibile salvare la formazione'}`);
    },
  });

  useEffect(() => {
    if (lineupData?.lineup) {
      setActiveRiderIds(lineupData.lineup.activeRiderIds || []);
      setCaptainId(lineupData.lineup.captainId);
    } else if (teamData?.team) {
      // Default: tutti attivi, primo pilota capitano
      const allRiderIds = teamData.team.riders.map((r: TeamRider) => r.rider.id);
      setActiveRiderIds(allRiderIds);
      if (allRiderIds.length > 0) {
        setCaptainId(allRiderIds[0]);
      }
    }
  }, [lineupData, teamData]);

  const team: Team | undefined = teamData?.team;

  const handleToggleRider = (riderId: string) => {
    if (activeRiderIds.includes(riderId)) {
      setActiveRiderIds(prev => prev.filter(id => id !== riderId));
      if (captainId === riderId) {
        setCaptainId(activeRiderIds.find(id => id !== riderId));
      }
    } else {
      setActiveRiderIds(prev => [...prev, riderId]);
    }
  };

  const handleSetCaptain = (riderId: string) => {
    if (activeRiderIds.includes(riderId)) {
      setCaptainId(riderId);
    }
  };

  const handleSave = () => {
    if (activeRiderIds.length === 0) {
      alert('Devi schierare almeno un pilota!');
      return;
    }
    saveLineup({ activeRiderIds, captainId });
  };

  if (loadingTeam || loadingLineup) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!team) {
    return <Alert severity="error">Team non trovato</Alert>;
  }

  if (!nextRace) {
    return (
      <Alert severity="info">
        Nessuna gara in programma. Torna più tardi per schierare la formazione.
      </Alert>
    );
  }

  const raceDate = new Date(nextRace.gpDate);
  const isDeadlinePassed = new Date() > raceDate;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Schiera Formazione
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {team.name} - {team.league.name}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
        >
          Torna Indietro
        </Button>
      </Stack>

      {/* Info Gara */}
      <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'white' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6">
                {nextRace.name} - Round {nextRace.round}
              </Typography>
              <Typography variant="body1">
                {nextRace.circuit}, {nextRace.country}
              </Typography>
              <Typography variant="body2">
                {format(raceDate, 'EEEE d MMMM yyyy HH:mm', { locale: it })}
              </Typography>
            </Box>
            {isDeadlinePassed ? (
              <Chip
                icon={<Timer />}
                label="Formazioni Chiuse"
                color="error"
                sx={{ bgcolor: 'white', color: 'error.main' }}
              />
            ) : (
              <Chip
                icon={<Check />}
                label="Formazioni Aperte"
                color="success"
                sx={{ bgcolor: 'white', color: 'success.main' }}
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Info Regole */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle2">Regole Formazione:</Typography>
          <Typography variant="body2">
            • Puoi mettere in panchina i piloti che non vuoi schierare
          </Typography>
          <Typography variant="body2">
            • Il capitano ottiene punti doppi (bonus x2)
          </Typography>
          <Typography variant="body2">
            • Le formazioni si chiudono all'inizio delle qualifiche
          </Typography>
        </Stack>
      </Alert>

      <Grid container spacing={3}>
        {/* Colonna sinistra: Piloti */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom>
            I tuoi Piloti
          </Typography>
          <List disablePadding>
            {team.riders
              .sort((a, b) => {
                const categoryOrder = { MOTOGP: 0, MOTO2: 1, MOTO3: 2 };
                return categoryOrder[a.rider.category as keyof typeof categoryOrder] - 
                       categoryOrder[b.rider.category as keyof typeof categoryOrder];
              })
              .map(({ rider }) => (
                <RiderCard
                  key={rider.id}
                  rider={rider}
                  isActive={activeRiderIds.includes(rider.id)}
                  isCaptain={captainId === rider.id}
                  onToggle={() => handleToggleRider(rider.id)}
                  onSetCaptain={() => handleSetCaptain(rider.id)}
                  disabled={isDeadlinePassed}
                />
              ))}
          </List>
        </Grid>

        {/* Colonna destra: Riepilogo */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 16 }}>
            <Typography variant="h6" gutterBottom>
              Riepilogo Formazione
            </Typography>

            <Stack spacing={2} divider={<Divider />}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Piloti Attivi ({activeRiderIds.length})
                </Typography>
                {activeRiderIds.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Nessun pilota schierato
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {team.riders
                      .filter(({ rider }) => activeRiderIds.includes(rider.id))
                      .map(({ rider }) => (
                        <ListItem key={rider.id} dense>
                          <ListItemText
                            primary={
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="body2">{rider.name}</Typography>
                                {captainId === rider.id && (
                                  <Star fontSize="small" color="warning" />
                                )}
                              </Stack>
                            }
                            secondary={rider.category}
                          />
                        </ListItem>
                      ))}
                  </List>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Capitano
                </Typography>
                {captainId ? (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Star color="warning" />
                    <Typography variant="body2">
                      {team.riders.find(({ rider }) => rider.id === captainId)?.rider.name}
                    </Typography>
                    <Chip label="x2 punti" size="small" color="warning" />
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nessun capitano selezionato
                  </Typography>
                )}
              </Box>
            </Stack>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={isDeadlinePassed || savingLineup || activeRiderIds.length === 0}
              sx={{ mt: 3 }}
            >
              {savingLineup ? 'Salvataggio...' : 'Salva Formazione'}
            </Button>

            {isDeadlinePassed && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Le formazioni sono chiuse per questa gara
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}