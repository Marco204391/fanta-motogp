// src/pages/LeaguesPage.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyLeagues, getPublicLeagues, joinLeague } from '../services/api';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  EmojiEvents,
  Groups,
  Add,
  Lock,
  Public,
  ContentCopy,
  Login,
} from '@mui/icons-material';

interface League {
  id: string;
  name: string;
  code: string;
  isPrivate: boolean;
  maxTeams: number;
  currentTeams: number;
  budget: number;
  userPosition?: number;
  userPoints?: number;
  hasTeam?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`league-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function LeagueCard({ league, onJoin, onView, isMyLeague }: {
  league: League;
  onJoin?: () => void;
  onView: () => void;
  isMyLeague?: boolean;
}) {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(league.code);
    // In produzione useresti un toast/snackbar
    alert('Codice copiato!');
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {league.name}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                icon={league.isPrivate ? <Lock /> : <Public />}
                label={league.isPrivate ? 'Privata' : 'Pubblica'}
                size="small"
                color={league.isPrivate ? 'default' : 'primary'}
              />
              <Chip
                icon={<Groups />}
                label={`${league.currentTeams}/${league.maxTeams} team`}
                size="small"
              />
            </Stack>
          </Box>
          {isMyLeague && (
            <Tooltip title="Copia codice lega">
              <IconButton size="small" onClick={handleCopyCode}>
                <ContentCopy />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6}}>
            <Box>
              <Typography variant="h6" color="primary">
                {league.budget}
              </Typography>
              <Typography variant="caption">Budget</Typography>
            </Box>
          </Grid>
          {isMyLeague && league.userPosition && (
            <Grid size={{ xs: 6}}>
              <Box>
                <Typography variant="h6" color="secondary">
                  {league.userPosition}°
                </Typography>
                <Typography variant="caption">Posizione</Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        {isMyLeague && (
          <Typography variant="body2" color="text.secondary">
            Codice: <strong>{league.code}</strong>
          </Typography>
        )}
      </CardContent>
      <CardActions>
        {isMyLeague ? (
          <Button fullWidth variant="contained" onClick={onView}>
            Vai alla Lega
          </Button>
        ) : league.hasTeam ? (
          <Button fullWidth variant="outlined" onClick={onView}>
            Visualizza
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<Login />}
            onClick={onJoin}
            disabled={league.currentTeams >= league.maxTeams}
          >
            {league.currentTeams >= league.maxTeams ? 'Lega Piena' : 'Unisciti'}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}

export default function LeaguesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const { data: myLeaguesData, isLoading: loadingMyLeagues } = useQuery({
    queryKey: ['myLeagues'],
    queryFn: getMyLeagues,
  });

  const { data: publicLeaguesData, isLoading: loadingPublicLeagues } = useQuery({
    queryKey: ['publicLeagues'],
    queryFn: getPublicLeagues,
    enabled: tabValue === 1,
  });

  const joinLeagueMutation = useMutation({
    mutationFn: joinLeague,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myLeagues'] });
      queryClient.invalidateQueries({ queryKey: ['publicLeagues'] });
      setJoinDialogOpen(false);
      setJoinCode('');
      setTabValue(0); // Torna a "Le mie leghe"
      alert('Ti sei unito alla lega con successo!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Errore durante l\'iscrizione alla lega');
    },
  });

  const myLeagues: League[] = myLeaguesData?.leagues || [];
  const publicLeagues: League[] = publicLeaguesData?.leagues || [];

  const handleJoinWithCode = () => {
    if (!joinCode.trim()) {
      alert('Inserisci un codice valido');
      return;
    }
    joinLeagueMutation.mutate(joinCode.trim());
  };

  const isLoading = loadingMyLeagues || (tabValue === 1 && loadingPublicLeagues);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Leghe
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gestisci le tue leghe e scoprine di nuove
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Login />}
            onClick={() => setJoinDialogOpen(true)}
          >
            Inserisci Codice
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/leagues/create')}
          >
            Crea Lega
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label={`Le mie leghe (${myLeagues.length})`} />
          <Tab label="Leghe pubbliche" />
        </Tabs>
      </Paper>

      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TabPanel value={tabValue} index={0}>
            {myLeagues.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <EmojiEvents sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Non sei ancora in nessuna lega
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Unisciti a una lega pubblica o usa un codice invito per iniziare!
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                      variant="outlined"
                      onClick={() => setJoinDialogOpen(true)}
                    >
                      Usa un codice
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => setTabValue(1)}
                    >
                      Esplora leghe pubbliche
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <Grid container spacing={3}>
                {myLeagues.map((league) => (
                  <Grid key={league.id} size={{ xs: 12, sm: 6, md: 4}}>
                    <LeagueCard
                      league={league}
                      onView={() => navigate(`/leagues/${league.id}`)}
                      isMyLeague
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {publicLeagues.length === 0 ? (
              <Alert severity="info">
                Nessuna lega pubblica disponibile al momento.
              </Alert>
            ) : (
              <Grid container spacing={3}>
                {publicLeagues.map((league) => (
                  <Grid key={league.id} size={{ xs: 12, sm: 6, md: 4}}>
                    <LeagueCard
                      league={league}
                      onJoin={!league.hasTeam ? () => {
                        if (league.currentTeams < league.maxTeams) {
                          joinLeagueMutation.mutate(league.code);
                        }
                      } : undefined}
                      onView={() => navigate(`/leagues/${league.id}`)}
                      isMyLeague={false}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>
        </>
      )}

      {/* Dialog per unirsi con codice */}
      <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Unisciti a una Lega</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Codice Lega"
            fullWidth
            variant="outlined"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Inserisci il codice..."
            inputProps={{ maxLength: 8 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialogOpen(false)}>Annulla</Button>
          <Button
            onClick={handleJoinWithCode}
            variant="contained"
            disabled={joinLeagueMutation.isPending}
          >
            {joinLeagueMutation.isPending ? 'Unione in corso...' : 'Unisciti'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}