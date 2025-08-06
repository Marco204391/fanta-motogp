// src/pages/LeagueDetailPage.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLeagueDetails, getMyTeamInLeague } from '../services/api';
import {
  Box,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Tabs,
  Tab,
  Grid,
  Alert,
} from '@mui/material';
import {
  EmojiEvents,
  Groups,
  Lock,
  Public,
  ContentCopy,
  Add,
  TrendingUp,
  TrendingDown,
  Remove,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface Standing {
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  totalPoints: number;
  lastRacePoints?: number;
  position?: number;
  trend?: 'up' | 'down' | 'same';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function StandingsTable({ standings }: { standings: Standing[] }) {
  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="success" fontSize="small" />;
      case 'down':
        return <TrendingDown color="error" fontSize="small" />;
      default:
        return <Remove color="disabled" fontSize="small" />;
    }
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return undefined;
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Pos</TableCell>
            <TableCell>Team</TableCell>
            <TableCell>Manager</TableCell>
            <TableCell align="right">Ultima Gara</TableCell>
            <TableCell align="right">Punti Totali</TableCell>
            <TableCell align="center">Trend</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {standings.map((standing, index) => (
            <TableRow key={standing.teamId} hover>
              <TableCell>
                <Stack direction="row" alignItems="center" spacing={1}>
                  {index < 3 ? (
                    <Avatar
                      sx={{
                        width: 24,
                        height: 24,
                        bgcolor: getMedalColor(index + 1),
                        fontSize: 14,
                      }}
                    >
                      {index + 1}
                    </Avatar>
                  ) : (
                    <Typography>{index + 1}</Typography>
                  )}
                </Stack>
              </TableCell>
              <TableCell>
                <Typography fontWeight="medium">{standing.teamName}</Typography>
              </TableCell>
              <TableCell>{standing.userName}</TableCell>
              <TableCell align="right">
                {standing.lastRacePoints !== undefined ? (
                  <Chip label={`+${standing.lastRacePoints}`} size="small" color="primary" />
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight="bold">{standing.totalPoints}</Typography>
              </TableCell>
              <TableCell align="center">{getTrendIcon(standing.trend)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  const { data: leagueData, isLoading: loadingLeague } = useQuery({
    queryKey: ['leagueDetails', leagueId],
    queryFn: () => getLeagueDetails(leagueId!),
  });

  const { data: teamData } = useQuery({
    queryKey: ['myTeamInLeague', leagueId],
    queryFn: () => getMyTeamInLeague(leagueId!),
    enabled: !!leagueId,
  });

  if (loadingLeague) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!leagueData) {
    return <Alert severity="error">Lega non trovata</Alert>;
  }

  const { league } = leagueData;
  const { standings } = league;
  const myTeam = teamData?.team;
  const isOwner = league.ownerId === user?.id;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(league.code);
    alert('Codice copiato!');
  };

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h4" gutterBottom>
                {league.name}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  icon={league.isPrivate ? <Lock /> : <Public />}
                  label={league.isPrivate ? 'Lega Privata' : 'Lega Pubblica'}
                  color={league.isPrivate ? 'default' : 'primary'}
                />
                <Chip
                  icon={<Groups />}
                  label={`${league.currentTeams}/${league.maxTeams} team`}
                />
                {isOwner && (
                  <Chip label="Proprietario" color="secondary" variant="outlined" />
                )}
              </Stack>
            </Box>
            <Stack spacing={1}>
              <Button
                variant="outlined"
                startIcon={<ContentCopy />}
                onClick={handleCopyCode}
                size="small"
              >
                Copia Codice: {league.code}
              </Button>
              {!myTeam && league.currentTeams < league.maxTeams && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate(`/leagues/${leagueId}/create-team`)}
                >
                  Crea Team
                </Button>
              )}
            </Stack>
          </Stack>

          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h5" color="primary">
                  {league.budget}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Budget
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h5" color="secondary">
                  {league.currentRound || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Round Attuale
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h5" color="success.main">
                  {league.totalPrizePool || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Montepremi
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Il mio team */}
      {myTeam && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'white' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Il Mio Team: {myTeam.name}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="body2">Posizione</Typography>
                <Typography variant="h5">
                  {standings.findIndex(s => s.teamId === myTeam.id) + 1}°
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2">Punti Totali</Typography>
                <Typography variant="h5">{myTeam.totalPoints || 0}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2">Ultima Gara</Typography>
                <Typography variant="h5">
                  {myTeam.lastRacePoints ? `+${myTeam.lastRacePoints}` : '-'}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Classifica" />
          <Tab label="Calendario" />
          <Tab label="Regolamento" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <StandingsTable standings={standings} />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Alert severity="info">Calendario gare in arrivo!</Alert>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Regolamento
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2">Budget</Typography>
                <Typography variant="body2" color="text.secondary">
                  Ogni team ha {league.budget} crediti per acquistare i piloti
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Formazione</Typography>
                <Typography variant="body2" color="text.secondary">
                  Seleziona 2 piloti MotoGP, 1 pilota Moto2 e 1 pilota Moto3
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2">Punteggi</Typography>
                <Typography variant="body2" color="text.secondary">
                  I punti vengono assegnati in base ai risultati delle gare
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </TabPanel>
    </Box>
  );
}