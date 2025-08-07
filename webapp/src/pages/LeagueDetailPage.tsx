// webapp/src/pages/LeagueDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Tooltip,
  LinearProgress,
  Badge
} from '@mui/material';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Remove,
  Groups,
  Settings,
  Share,
  Lock,
  LockOpen,
  ContentCopy,
  Notifications,
  NotificationsActive,
  EmojiEvents,
  Star,
  WorkspacePremium,
  BarChart,
  Info,
  CheckCircle,
  Warning,
  Add,
  Refresh,
  Visibility,
  VisibilityOff,
  Timer,
  Flag,
  SportsMotorsports
} from '@mui/icons-material';
import { format, isPast } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  getLeagueDetails, 
  getMyTeamInLeague, 
  updateLeagueSettings,
  getLeagueRaceLineups,
  getUpcomingRaces
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { ScoreBreakdownDialog } from '../components/ScoreBreakdownDialog';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';

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
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify } = useNotification();
  
  const [selectedTab, setSelectedTab] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [selectedLineup, setSelectedLineup] = useState<any>(null);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  
  // State per impostazioni lega
  const [teamsLocked, setTeamsLocked] = useState(false);
  const [lineupVisibility, setLineupVisibility] = useState('AFTER_DEADLINE');

  // Hook per real-time updates
  const { forceRefresh } = useRealTimeUpdates({
    enabled: true,
    endpoints: ['leagues', 'league-lineups'],
    pollingInterval: 30000
  });

  // Query dati lega
  const { data: leagueData, isLoading: loadingLeague, refetch: refetchLeague } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: () => getLeagueDetails(leagueId!),
    enabled: !!leagueId
  });

  // Query mio team nella lega
  const { data: myTeamData } = useQuery({
    queryKey: ['myTeamInLeague', leagueId],
    queryFn: () => getMyTeamInLeague(leagueId!),
    enabled: !!leagueId
  });

  // Query prossime gare
  const { data: racesData } = useQuery({
    queryKey: ['upcomingRaces'],
    queryFn: getUpcomingRaces
  });

  // Query lineup per gara selezionata
  const { data: lineupsData, isLoading: loadingLineups } = useQuery({
    queryKey: ['leagueRaceLineups', leagueId, selectedRaceId],
    queryFn: () => getLeagueRaceLineups(leagueId!, selectedRaceId!),
    enabled: !!leagueId && !!selectedRaceId
  });

  // Mutation per aggiornare settings
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: any) => updateLeagueSettings(leagueId!, settings),
    onSuccess: () => {
      notify('Impostazioni aggiornate con successo', 'success');
      queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
      setShowSettings(false);
    },
    onError: (error: any) => {
      notify(error.response?.data?.error || 'Errore aggiornamento impostazioni', 'error');
    }
  });

  // Inizializza settings da dati lega
  useEffect(() => {
    if (leagueData?.league) {
      setTeamsLocked(leagueData.league.teamsLocked || false);
      setLineupVisibility(leagueData.league.lineupVisibility || 'AFTER_DEADLINE');
    }
  }, [leagueData]);

  // Seleziona automaticamente la prossima gara
  useEffect(() => {
    if (racesData?.races && !selectedRaceId) {
      const nextRace = racesData.races.find((r: any) => !isPast(new Date(r.gpDate)));
      if (nextRace) {
        setSelectedRaceId(nextRace.id);
      }
    }
  }, [racesData, selectedRaceId]);

  if (loadingLeague) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!leagueData?.league) {
    return <Alert severity="error">Lega non trovata</Alert>;
  }

  const league = leagueData.league;
  const standings = leagueData.standings || [];
  const myTeam = myTeamData?.team;
  const isOwner = league.ownerId === user?.id;
  const userHasTeam = !!myTeam;
  const nextRace = racesData?.races?.[0];

  // Calcola posizione utente
  const myPosition = standings.findIndex((s: any) => s.userId === user?.id) + 1;

  const handleCreateTeam = () => {
    navigate(`/leagues/${leagueId}/create-team`);
  };

  const handleManageLineup = () => {
    if (myTeam && nextRace) {
      navigate(`/teams/${myTeam.id}/lineup/${nextRace.id}`);
    }
  };

  const handleShareCode = () => {
    navigator.clipboard.writeText(league.code);
    notify('Codice lega copiato negli appunti!', 'success');
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      teamsLocked,
      lineupVisibility
    });
  };

  const handleShowScoreBreakdown = (lineup: any) => {
    setSelectedLineup(lineup);
    setShowScoreBreakdown(true);
  };

  return (
    <Box>
      {/* Header Lega */}
      <Paper 
        sx={{ 
          p: 3, 
          mb: 3, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={12} md={8}>
            <Typography variant="h4" gutterBottom>
              {league.name}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Chip 
                icon={<ContentCopy sx={{ color: 'white !important' }} />}
                label={`Codice: ${league.code}`}
                onClick={handleShareCode}
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                }}
              />
              <Chip 
                icon={<Groups sx={{ color: 'white !important' }} />}
                label={`${league.currentTeams || 0}/${league.maxTeams} Team`}
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              <Chip 
                icon={<EmojiEvents sx={{ color: 'white !important' }} />}
                label={`Premio: ${league.prizePool || 0}€`}
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              {league.teamsLocked && (
                <Chip 
                  icon={<Lock sx={{ color: 'white !important' }} />}
                  label="Team Bloccati"
                  sx={{ backgroundColor: 'rgba(255,0,0,0.3)', color: 'white' }}
                />
              )}
            </Stack>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              {isOwner && (
                <Tooltip title="Impostazioni Lega">
                  <IconButton 
                    color="inherit" 
                    onClick={() => setShowSettings(true)}
                    sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  >
                    <Settings />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Aggiorna Dati">
                <IconButton 
                  color="inherit" 
                  onClick={forceRefresh}
                  sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Stack>
            {userHasTeam && myPosition > 0 && (
              <Box mt={2}>
                <Typography variant="h6">
                  La tua posizione: #{myPosition}
                </Typography>
                <Typography variant="body2">
                  {myTeam.totalPoints || 0} punti totali
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Alert per utente senza team */}
      {!userHasTeam && (
        <Alert 
          severity="warning" 
          action={
            <Button color="inherit" size="small" onClick={handleCreateTeam}>
              Crea Team
            </Button>
          }
          sx={{ mb: 3 }}
        >
          Non hai ancora un team in questa lega!
        </Alert>
      )}

      {/* Alert per lineup mancante */}
      {userHasTeam && nextRace && !myTeam.hasLineup && (
        <Alert 
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={handleManageLineup}>
              Imposta Lineup
            </Button>
          }
          sx={{ mb: 3 }}
        >
          Non hai ancora impostato il lineup per la prossima gara ({nextRace.name})
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={selectedTab} 
          onChange={(_, v) => setSelectedTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Classifica" icon={<Trophy />} iconPosition="start" />
          <Tab label="Lineup Gara" icon={<SportsMotorsports />} iconPosition="start" />
          <Tab label="Statistiche" icon={<BarChart />} iconPosition="start" />
          {isOwner && <Tab label="Gestione" icon={<Settings />} iconPosition="start" />}
        </Tabs>
      </Paper>

      {/* Tab: Classifica */}
      <TabPanel value={selectedTab} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Pos</TableCell>
                <TableCell>Team</TableCell>
                <TableCell>Manager</TableCell>
                <TableCell align="right">Punti Totali</TableCell>
                <TableCell align="right">Ultima Gara</TableCell>
                <TableCell align="center">Trend</TableCell>
                <TableCell align="center">Azioni</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {standings.map((standing: any, index: number) => {
                const position = index + 1;
                const isUserTeam = standing.userId === user?.id;
                
                return (
                  <TableRow 
                    key={standing.teamId}
                    sx={{ 
                      backgroundColor: isUserTeam ? 'action.selected' : 'inherit',
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {position === 1 && <WorkspacePremium sx={{ color: '#FFD700' }} />}
                        {position === 2 && <WorkspacePremium sx={{ color: '#C0C0C0' }} />}
                        {position === 3 && <WorkspacePremium sx={{ color: '#CD7F32' }} />}
                        <Typography variant="h6">{position}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={isUserTeam ? 'bold' : 'normal'}>
                        {standing.teamName}
                      </Typography>
                    </TableCell>
                    <TableCell>{standing.userName}</TableCell>
                    <TableCell align="right">
                      <Typography variant="h6">{standing.totalPoints || 0}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      {standing.lastRacePoints ? (
                        <Chip 
                          label={`+${standing.lastRacePoints}`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {standing.trend === 'up' && <TrendingUp color="success" />}
                      {standing.trend === 'down' && <TrendingDown color="error" />}
                      {standing.trend === 'same' && <Remove color="disabled" />}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Visualizza Team">
                        <IconButton 
                          size="small"
                          onClick={() => navigate(`/teams/${standing.teamId}`)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab: Lineup Gara */}
      <TabPanel value={selectedTab} index={1}>
        {/* Selettore Gara */}
        <Box mb={3}>
          <FormControl fullWidth>
            <InputLabel>Seleziona Gara</InputLabel>
            <Select
              value={selectedRaceId || ''}
              onChange={(e) => setSelectedRaceId(e.target.value)}
              label="Seleziona Gara"
            >
              {racesData?.races?.map((race: any) => (
                <MenuItem key={race.id} value={race.id}>
                  {race.name} - {format(new Date(race.gpDate), 'dd MMM yyyy', { locale: it })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {loadingLineups ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {lineupsData?.lineups?.map((teamLineup: any) => (
              <Grid item xs={12} md={6} key={teamLineup.teamId}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box>
                        <Typography variant="h6">{teamLineup.teamName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          di {teamLineup.userName}
                        </Typography>
                      </Box>
                      <Chip 
                        label={`${teamLineup.totalPoints || 0} pt`}
                        color="primary"
                      />
                    </Box>

                    {teamLineup.lineup && teamLineup.lineup.length > 0 ? (
                      <>
                        <List dense>
                          {teamLineup.lineup.slice(0, 6).map((lr: any, idx: number) => (
                            <ListItem key={lr.id}>
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                                  {lr.rider.number}
                                </Avatar>
                              </ListItemAvatar>
                              <ListItemText 
                                primary={lr.rider.name}
                                secondary={
                                  <Box component="span">
                                    Prev: {lr.predictedPosition || '-'}° • 
                                    Reale: {lr.actualPosition || lr.actualStatus || '-'}
                                  </Box>
                                }
                              />
                              <Chip 
                                label={`${lr.points || 0} pt`}
                                size="small"
                                variant="outlined"
                              />
                            </ListItem>
                          ))}
                        </List>
                        
                        {teamLineup.riderScores && (
                          <Button 
                            size="small"
                            fullWidth
                            variant="outlined"
                            onClick={() => handleShowScoreBreakdown(teamLineup)}
                            startIcon={<BarChart />}
                          >
                            Analisi Dettagliata Punti
                          </Button>
                        )}
                      </>
                    ) : (
                      <Alert severity="info" variant="outlined">
                        Lineup non ancora impostato
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {(!lineupsData?.lineups || lineupsData.lineups.length === 0) && !loadingLineups && (
          <Alert severity="info">
            Nessun lineup disponibile per questa gara
          </Alert>
        )}
      </TabPanel>

      {/* Tab: Statistiche */}
      <TabPanel value={selectedTab} index={2}>
        <Grid container spacing={3}>
          {/* Top Scorer per Gara */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Scorer per Gara
                </Typography>
                <List>
                  {leagueData.raceStats?.map((stat: any) => (
                    <ListItem key={stat.raceId}>
                      <ListItemText 
                        primary={stat.raceName}
                        secondary={`Winner: ${stat.topTeam} - ${stat.topPoints} pt`}
                      />
                      <Chip 
                        label={format(new Date(stat.raceDate), 'dd/MM', { locale: it })}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
                {(!leagueData.raceStats || leagueData.raceStats.length === 0) && (
                  <Typography variant="body2" color="text.secondary">
                    Nessuna statistica disponibile
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Piloti più Scelti */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Piloti più Scelti
                </Typography>
                <List>
                  {leagueData.popularRiders?.slice(0, 5).map((rider: any, idx: number) => (
                    <ListItem key={rider.riderId}>
                      <ListItemAvatar>
                        <Avatar>{idx + 1}</Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={rider.riderName}
                        secondary={
                          <Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={(rider.teamCount / league.currentTeams) * 100}
                              sx={{ mt: 1 }}
                            />
                            <Typography variant="caption">
                              {rider.teamCount}/{league.currentTeams} team ({Math.round((rider.teamCount / league.currentTeams) * 100)}%)
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                {(!leagueData.popularRiders || leagueData.popularRiders.length === 0) && (
                  <Typography variant="body2" color="text.secondary">
                    Nessuna statistica disponibile
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Media Punti per Categoria */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Media per Categoria
                </Typography>
                <Grid container spacing={2}>
                  {['MOTOGP', 'MOTO2', 'MOTO3'].map(category => {
                    const stats = leagueData.categoryStats?.[category] || { avg: 0, max: 0, min: 0 };
                    return (
                      <Grid item xs={12} md={4} key={category}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {category}
                          </Typography>
                          <Typography variant="h4" color="primary">
                            {stats.avg.toFixed(1)}
                          </Typography>
                          <Typography variant="caption" display="block">
                            Media punti
                          </Typography>
                          <Box display="flex" justifyContent="space-around" mt={2}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Min</Typography>
                              <Typography variant="body2">{stats.min}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Max</Typography>
                              <Typography variant="body2">{stats.max}</Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab: Gestione (solo per owner) */}
      {isOwner && (
        <TabPanel value={selectedTab} index={3}>
          <Grid container spacing={3}>
            {/* Impostazioni Lega */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Impostazioni Lega
                  </Typography>
                  
                  <Stack spacing={3}>
                    <Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={teamsLocked}
                            onChange={(e) => setTeamsLocked(e.target.checked)}
                          />
                        }
                        label="Blocca Modifiche Team"
                      />
                      <Typography variant="caption" color="text.secondary" display="block" ml={4}>
                        Impedisce ai membri di modificare i roster dei team
                      </Typography>
                    </Box>

                    <FormControl fullWidth>
                      <InputLabel>Visibilità Lineup</InputLabel>
                      <Select
                        value={lineupVisibility}
                        onChange={(e) => setLineupVisibility(e.target.value)}
                        label="Visibilità Lineup"
                      >
                        <MenuItem value="ALWAYS_VISIBLE">Sempre Visibile</MenuItem>
                        <MenuItem value="AFTER_DEADLINE">Solo dopo la deadline</MenuItem>
                      </Select>
                    </FormControl>

                    <Button
                      variant="contained"
                      onClick={handleSaveSettings}
                      disabled={updateSettingsMutation.isPending}
                    >
                      {updateSettingsMutation.isPending ? 'Salvataggio...' : 'Salva Impostazioni'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Azioni Rapide */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Azioni Rapide
                  </Typography>
                  
                  <Stack spacing={2}>
                    <Button
                      variant="outlined"
                      startIcon={<Share />}
                      onClick={handleShareCode}
                      fullWidth
                    >
                      Condividi Codice Lega
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<Groups />}
                      onClick={() => setShowInviteDialog(true)}
                      fullWidth
                    >
                      Invita Membri
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<NotificationsActive />}
                      onClick={() => notify('Funzione in sviluppo', 'info')}
                      fullWidth
                    >
                      Invia Notifica a Tutti
                    </Button>
                    
                    <Divider />
                    
                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<Lock />}
                      fullWidth
                      onClick={() => {
                        if (confirm('Sei sicuro di voler chiudere le iscrizioni?')) {
                          notify('Funzione in sviluppo', 'info');
                        }
                      }}
                    >
                      Chiudi Iscrizioni
                    </Button>
                    
                    <Button
                      variant="outlined"
                      color="error"
                      fullWidth
                      onClick={() => notify('Funzione in sviluppo', 'info')}
                    >
                      Elimina Lega
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Info Lega */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Informazioni Lega
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        Codice Lega
                      </Typography>
                      <Typography variant="h6">{league.code}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        Membri
                      </Typography>
                      <Typography variant="h6">
                        {league.currentTeams}/{league.maxTeams}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        Budget
                      </Typography>
                      <Typography variant="h6">{league.budget}€</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">
                        Premio Totale
                      </Typography>
                      <Typography variant="h6">{league.prizePool}€</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      )}

      {/* Dialog Impostazioni */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Impostazioni Lega</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={teamsLocked}
                  onChange={(e) => setTeamsLocked(e.target.checked)}
                />
              }
              label="Blocca modifiche ai team"
            />
            
            <FormControl fullWidth>
              <InputLabel>Visibilità Lineup</InputLabel>
              <Select
                value={lineupVisibility}
                onChange={(e) => setLineupVisibility(e.target.value)}
                label="Visibilità Lineup"
              >
                <MenuItem value="ALWAYS_VISIBLE">Sempre Visibile</MenuItem>
                <MenuItem value="AFTER_DEADLINE">Solo dopo la deadline</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>Annulla</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
          >
            Salva Modifiche
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Invita Membri */}
      <Dialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invita Membri</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Condividi questo codice con i tuoi amici per farli unire alla lega:
          </Typography>
          <Paper sx={{ p: 3, mt: 2, bgcolor: 'grey.100', textAlign: 'center' }}>
            <Typography variant="h4" fontFamily="monospace">
              {league.code}
            </Typography>
          </Paper>
          <Button
            fullWidth
            variant="contained"
            startIcon={<ContentCopy />}
            onClick={handleShareCode}
            sx={{ mt: 2 }}
          >
            Copia Codice
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInviteDialog(false)}>Chiudi</Button>
        </DialogActions>
      </Dialog>

      {/* Score Breakdown Dialog */}
      <ScoreBreakdownDialog
        open={showScoreBreakdown}
        onClose={() => setShowScoreBreakdown(false)}
        lineupData={selectedLineup}
      />
    </Box>
  );
}