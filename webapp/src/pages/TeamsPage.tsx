// src/pages/TeamsPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyTeams, getUpcomingRaces } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  Chip,
  Stack,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Tooltip,
  Paper,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  SportsMotorsports,
  Groups,
  EmojiEvents,
  Edit,
  CalendarToday,
  Search,
  Lock,
  LockOpen,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Team {
  id: string;
  name: string;
  league: {
    id: string;
    name: string;
    budget: number;
    code: string;
    isPrivate: boolean;
    teamsLocked: boolean;
  };
  riders: Array<{
    rider: {
      id: string;
      name: string;
      number: number;
      category: string;
      value: number;
    };
  }>;
  totalPoints?: number;
  remainingBudget: number;
  hasLineup?: boolean;
}

const categoryColors = {
  MOTOGP: '#FF6B00',
  MOTO2: '#1976D2',
  MOTO3: '#388E3C',
};

export default function TeamsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: ['myTeams'],
    queryFn: getMyTeams,
  });

  const { data: racesData } = useQuery({
    queryKey: ['upcomingRaces'],
    queryFn: getUpcomingRaces,
  });

  const teams: Team[] = teamsData?.teams || [];
  const nextRace = racesData?.races?.[0];

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.league.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingTeams) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          I Miei Team
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestisci i tuoi team e schiera le formazioni per le prossime gare
        </Typography>
      </Box>

      {/* Prossima Gara */}
      {nextRace && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.main', color: 'white' }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <CalendarToday />
            <Box>
              <Typography variant="h6">
                Prossima Gara: {nextRace.name}
              </Typography>
              <Typography variant="body2">
                {format(new Date(nextRace.gpDate), 'EEEE d MMMM yyyy', { locale: it })}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Barra di ricerca */}
      <TextField
        fullWidth
        placeholder="Cerca team o lega..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
      />

      {/* Lista Team */}
      {filteredTeams.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <SportsMotorsports sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {searchQuery ? 'Nessun team trovato' : 'Non hai ancora creato nessun team'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchQuery ? 'Prova con una ricerca diversa' : 'Unisciti a una lega per iniziare a giocare!'}
            </Typography>
            {!searchQuery && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/leagues')}
              >
                Esplora Leghe
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredTeams.map((team) => (
            <Grid item xs={12} md={6} key={team.id}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {team.name}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          icon={<Groups />}
                          label={team.league.name}
                          size="small"
                          onClick={() => navigate(`/leagues/${team.league.id}`)}
                        />
                        {team.league.teamsLocked ? (
                          <Chip
                            icon={<Lock />}
                            label="Mercato chiuso"
                            size="small"
                            color="error"
                          />
                        ) : (
                          <Chip
                            icon={<LockOpen />}
                            label="Mercato aperto"
                            size="small"
                            color="success"
                          />
                        )}
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      {!team.league.teamsLocked && (
                        <Tooltip title="Modifica team">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/teams/${team.id}/edit`)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Stack>

                  {/* Statistiche */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <Typography variant="h5" color="primary">
                          {team.totalPoints || 0}
                        </Typography>
                        <Typography variant="caption">Punti Totali</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <Typography variant="h5" color="secondary">
                          {team.riders.length}
                        </Typography>
                        <Typography variant="caption">Piloti</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center">
                        <Typography variant="h5" color="success.main">
                          {team.remainingBudget}
                        </Typography>
                        <Typography variant="caption">Crediti</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Lista Piloti */}
                  <Typography variant="subtitle2" gutterBottom>
                    Piloti:
                  </Typography>
                  <List dense disablePadding>
                    {team.riders
                      .sort((a, b) => {
                        const categoryOrder = { MOTOGP: 0, MOTO2: 1, MOTO3: 2 };
                        return categoryOrder[a.rider.category as keyof typeof categoryOrder] - 
                               categoryOrder[b.rider.category as keyof typeof categoryOrder];
                      })
                      .map(({ rider }) => (
                        <ListItem key={rider.id} disablePadding>
                          <ListItemAvatar>
                            <Avatar
                              sx={{
                                bgcolor: categoryColors[rider.category as keyof typeof categoryColors],
                                width: 32,
                                height: 32,
                              }}
                            >
                              {rider.number}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={rider.name}
                            secondary={`${rider.category} - ${rider.value} crediti`}
                          />
                        </ListItem>
                      ))}
                  </List>
                </CardContent>
                <CardActions>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={<SportsMotorsports />}
                    onClick={() => navigate(`/teams/${team.id}/lineup`)}
                    disabled={!nextRace}
                  >
                    {team.hasLineup ? 'Modifica Formazione' : 'Schiera Formazione'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}