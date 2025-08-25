// webapp/src/pages/LeagueDetailPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Avatar, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert,
  CircularProgress, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, Switch, FormControlLabel, Select, MenuItem, FormControl,
  InputLabel, Stack, Divider, List, ListItem, ListItemText, ListItemAvatar,
  IconButton, Tooltip, LinearProgress, useTheme, useMediaQuery, Collapse
} from '@mui/material';
import {
  TrendingUp, TrendingDown, Remove, Groups, Settings, Share, Lock,
  ContentCopy, NotificationsActive, EmojiEvents, WorkspacePremium,
  BarChart, Refresh, SportsMotorsports, Timer, ExpandMore, ExpandLess, Info
} from '@mui/icons-material';
import { format, isPast, differenceInDays, differenceInHours } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  getLeagueDetails,
  getMyTeamInLeague,
  updateLeagueSettings,
  getLeagueRaceLineups,
  getAllRaces
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
      {value === index && <Box sx={{ py: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

// Componente Mobile per visualizzare una posizione in classifica
function MobileStandingCard({ standing, position, isUserTeam, gapPrev, gapNext }: {
  standing: any;
  position: number;
  isUserTeam: boolean;
  gapPrev: number | null;
  gapNext: number | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPodium = position <= 3;

  return (
    <Card
      sx={{
        mb: 1,
        borderLeft: isPodium ? 4 : 0,
        borderColor: isPodium ?
          (position === 1 ? '#FFD700' : position === 2 ? '#C0C0C0' : '#CD7F32')
          : 'transparent',
        backgroundColor: isUserTeam ? 'action.selected' : 'inherit'
      }}
    >
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Posizione */}
        <Box
          sx={{
            minWidth: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {isPodium && (
            <WorkspacePremium
              sx={{
                fontSize: 20,
                color: position === 1 ? '#FFD700' :
                       position === 2 ? '#C0C0C0' : '#CD7F32'
              }}
            />
          )}
          <Typography
            variant={isPodium ? "h6" : "body1"}
            fontWeight={isPodium ? "bold" : "medium"}
          >
            {position}
          </Typography>
        </Box>

        {/* Nome Team e Manager */}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" fontWeight="medium">
            {standing.teamName}
            {isUserTeam && (
              <Chip
                label="Tu"
                size="small"
                color="primary"
                sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
              />
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {standing.userName}
          </Typography>
        </Box>

        {/* Punti */}
        <Box sx={{ textAlign: 'right', mr: 1 }}>
          <Typography variant="h6" fontWeight="bold" color="primary">
            {standing.totalPoints || 0}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            punti
          </Typography>
        </Box>

        {/* Expand Icon */}
        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* Dettagli Espansi */}
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 1.5, backgroundColor: 'action.hover' }}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 4}}>
              <Typography variant="caption" color="text.secondary">
                Ultima Gara
              </Typography>
              <Typography variant="body2">
                {standing.lastRacePoints ? `+${standing.lastRacePoints} pt` : '-'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4}}>
              <Typography variant="caption" color="text.secondary">
                Gap Prec.
              </Typography>
              <Typography variant="body2" color={gapPrev !== null ? 'error.main' : 'text.secondary'}>
                {gapPrev !== null ? `+${gapPrev}` : '-'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4}}>
              <Typography variant="caption" color="text.secondary">
                Gap Succ.
              </Typography>
               <Typography variant="body2" color={gapNext !== null ? 'success.main' : 'text.secondary'}>
                {gapNext !== null ? `-${gapNext}` : '-'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Card>
  );
}

export default function LeagueDetailPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { notify } = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

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

  // Query per tutte le gare della stagione
  const { data: racesData } = useQuery({
    queryKey: ['allRaces', new Date().getFullYear()],
    queryFn: () => getAllRaces(new Date().getFullYear()),
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

  // Seleziona automaticamente la gara più recente o la prossima
  useEffect(() => {
    if (racesData?.races && !selectedRaceId) {
        const races = racesData.races.sort((a: any, b: any) => new Date(a.gpDate).getTime() - new Date(b.gpDate).getTime());
        const now = new Date();
        
        // Trova l'indice della prossima gara
        const nextRaceIndex = races.findIndex((race: any) => !isPast(new Date(race.gpDate)));

        if (nextRaceIndex !== -1) {
            // Se c'è una gara imminente, controlla se quella precedente è appena finita
            const previousRaceIndex = nextRaceIndex - 1;
            if (previousRaceIndex >= 0) {
                const previousRace = races[previousRaceIndex];
                // Se la gara precedente è finita negli ultimi 3 giorni, la seleziona
                if (differenceInDays(now, new Date(previousRace.gpDate)) <= 3) {
                    setSelectedRaceId(previousRace.id);
                    return;
                }
            }
            setSelectedRaceId(races[nextRaceIndex].id);
        } else if (races.length > 0) {
            // Se non ci sono gare imminenti, seleziona l'ultima gara della stagione
            setSelectedRaceId(races[races.length - 1].id);
        }
    }
  }, [racesData, selectedRaceId]);

  const league = leagueData?.league;
  const standings = league?.standings || [];
  const myTeam = myTeamData?.team;
  const isAdmin = league?.isAdmin;
  const userHasTeam = !!myTeam;
  const allRaces = racesData?.races || [];
  const nextRace = allRaces.find((r: any) => !isPast(new Date(r.gpDate)));
  const deadline = nextRace ? new Date(nextRace.sprintDate || nextRace.gpDate) : null;
  const daysUntilDeadline = deadline ? differenceInDays(deadline, new Date()) : null;
  const hoursUntilDeadline = deadline ? differenceInHours(deadline, new Date()) : null;

  const hasLineupForNextRace = useMemo(() => {
    if (!lineupsData?.lineups || !myTeam) {
      return false;
    }
    const currentUserLineup = lineupsData.lineups.find((l: any) => l.teamId === myTeam.id);
    return !!currentUserLineup && currentUserLineup.lineup && currentUserLineup.lineup.length > 0;
  }, [lineupsData, myTeam]);

  // Calcola posizione utente
  const myPosition = standings.findIndex((s: any) => s.userId === user?.id) + 1;

  if (loadingLeague) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!league) {
    return <Alert severity="error">Lega non trovata</Alert>;
  }

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
    <Box sx={{ pb: isMobile ? 2 : 0 }}>
      {/* Header Lega - Responsive */}
      <Paper
        sx={{
          p: isMobile ? 2 : 3,
          mb: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Grid container alignItems="center" spacing={2}>
          <Grid size={{ xs: 12, md: 8}}>
            <Typography
              variant={isMobile ? "h5" : "h4"}
              gutterBottom
              sx={{ fontWeight: 'bold' }}
            >
              {league.name}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
            >
              <Chip
                icon={<ContentCopy sx={{ color: 'white !important' }} />}
                label={`Codice: ${league.code}`}
                onClick={handleShareCode}
                size={isMobile ? "small" : "medium"}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: isMobile ? '0.7rem' : '0.875rem',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' }
                }}
              />
              <Chip
                icon={<Groups sx={{ color: 'white !important' }} />}
                label={`${league.teams?.length || 0}/${league.maxTeams}`}
                size={isMobile ? "small" : "medium"}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: isMobile ? '0.7rem' : '0.875rem'
                }}
              />
              <Chip
                icon={<EmojiEvents sx={{ color: 'white !important' }} />}
                label={`Premio: ${league.prizePool || 0}€`}
                size={isMobile ? "small" : "medium"}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: isMobile ? '0.7rem' : '0.875rem'
                }}
              />
              {league.teamsLocked && (
                <Chip
                  icon={<Lock sx={{ color: 'white !important' }} />}
                  label="Team Bloccati"
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    backgroundColor: 'rgba(255,0,0,0.3)',
                    color: 'white',
                    fontSize: isMobile ? '0.7rem' : '0.875rem'
                  }}
                />
              )}
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4}} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Stack
              direction="row"
              spacing={1}
              justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
              alignItems="center"
            >
              <Tooltip title="Aggiorna Dati">
                <IconButton
                  color="inherit"
                  onClick={() => forceRefresh()}
                  sx={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                  size={isMobile ? "small" : "medium"}
                >
                  <Refresh />
                </IconButton>
              </Tooltip>

              {/* Posizione Mobile */}
              {isMobile && userHasTeam && myPosition > 0 && (
                <Box
                  sx={{
                    ml: 'auto',
                    p: 1,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    borderRadius: 1
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    Posizione
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    #{myPosition}
                  </Typography>
                </Box>
              )}
            </Stack>

            {/* Posizione Desktop */}
            {!isMobile && userHasTeam && myPosition > 0 && (
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

      {/* Box Scadenza Gara - Responsive */}
      {nextRace && deadline && (
        <Paper sx={{ p: isMobile ? 1.5 : 2, mb: 2, bgcolor: 'action.hover' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            spacing={{ xs: 2, sm: 3 }}
            justifyContent="space-between"
          >
            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
              >
                Prossimo Evento
              </Typography>
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                sx={{ fontWeight: 'bold' }}
              >
                {nextRace.name}
              </Typography>
            </Box>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: 'none', sm: 'block' } }}
            />

            <Box>
              <Typography
                variant="overline"
                color="text.secondary"
                sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
              >
                Deadline Schieramento
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Timer color="primary" fontSize={isMobile ? "small" : "medium"} />
                <Typography
                  variant={isMobile ? "body2" : "h6"}
                  color="primary.main"
                  sx={{ fontWeight: 'medium' }}
                >
                  {format(deadline, isMobile ? 'dd MMM HH:mm' : 'eeee dd MMMM HH:mm', { locale: it })}
                </Typography>
              </Stack>
            </Box>

            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />

            {daysUntilDeadline !== null && daysUntilDeadline >= 0 && (
              <Chip
                label={
                  daysUntilDeadline > 0
                    ? `${daysUntilDeadline} giorni`
                    : (hoursUntilDeadline != null && hoursUntilDeadline > 0)
                    ? `${hoursUntilDeadline} ore`
                    : 'In scadenza!'
                }
                color={
                  daysUntilDeadline < 1
                    ? 'error'
                    : daysUntilDeadline <= 3
                    ? 'warning'
                    : 'success'
                }
                size={isMobile ? "small" : "medium"}
                sx={{ fontWeight: 'bold' }}
              />
            )}

            <Button
              variant="contained"
              onClick={handleManageLineup}
              disabled={!userHasTeam}
              fullWidth={isMobile}
              size={isMobile ? "small" : "medium"}
            >
              {hasLineupForNextRace ? 'Modifica' : 'Schiera'}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Alert per utente senza team */}
      {!userHasTeam && (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleCreateTeam}
            >
              Crea Team
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Non hai ancora un team in questa lega!
        </Alert>
      )}

      {/* Alert per lineup mancante */}
      {userHasTeam && nextRace && selectedRaceId === nextRace.id && !hasLineupForNextRace && !loadingLineups && (
        <Alert
          severity="info"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleManageLineup}
            >
              Imposta Lineup
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Non hai ancora impostato il lineup per la prossima gara ({nextRace.name})
        </Alert>
      )}

      {/* Tabs - Responsive */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={(_, v) => setSelectedTab(v)}
          variant={isMobile ? "scrollable" : "standard"}
          scrollButtons={isMobile ? "auto" : false}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EmojiEvents fontSize="small" />
                {!isMobile && <Typography variant="body2">Classifica</Typography>}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SportsMotorsports fontSize="small" />
                {!isMobile && <Typography variant="body2">Lineup</Typography>}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BarChart fontSize="small" />
                {!isMobile && <Typography variant="body2">Stats</Typography>}
              </Box>
            }
          />
          {isAdmin && (
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Settings fontSize="small" />
                  {!isMobile && <Typography variant="body2">Admin</Typography>}
                </Box>
              }
            />
          )}
        </Tabs>
      </Paper>

      {/* Tab: Classifica - Responsive */}
      <TabPanel value={selectedTab} index={0}>
        {isMobile ? (
          // Layout Mobile - Cards
          <Box>
            {standings.map((standing: any, index: number) => {
              const position = index + 1;
              const isUserTeam = standing.userId === user?.id;
              const prevPoints = index > 0 ? standings[index - 1].totalPoints : null;
              const nextPoints = index < standings.length - 1 ? standings[index + 1].totalPoints : null;
              const gapPrev = prevPoints !== null ? standing.totalPoints - prevPoints : null;
              const gapNext = nextPoints !== null ? nextPoints - standing.totalPoints : null;

              return (
                <MobileStandingCard
                  key={standing.teamId}
                  standing={standing}
                  position={position}
                  isUserTeam={isUserTeam}
                  gapPrev={gapPrev}
                  gapNext={gapNext}
                />
              );
            })}
          </Box>
        ) : (
          // Layout Desktop - Tabella
          <TableContainer component={Paper}>
            <Table size={isTablet ? "small" : "medium"}>
              <TableHead>
                <TableRow>
                  <TableCell>Pos</TableCell>
                  <TableCell>Team</TableCell>
                  <TableCell>Manager</TableCell>
                  <TableCell align="right">Punti Totali</TableCell>
                  <TableCell align="right">Ultima Gara</TableCell>
                  <TableCell align="right">Gap Prec.</TableCell>
                  <TableCell align="right">Gap Succ.</TableCell>
                  <TableCell align="center">Trend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {standings.map((standing: any, index: number) => {
                  const position = index + 1;
                  const isUserTeam = standing.userId === user?.id;
                  const prevPoints = index > 0 ? standings[index - 1].totalPoints : null;
                  const nextPoints = index < standings.length - 1 ? standings[index + 1].totalPoints : null;
                  const gapPrev = prevPoints !== null ? standing.totalPoints - prevPoints : null;
                  const gapNext = nextPoints !== null ? nextPoints - standing.totalPoints : null;

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
                      <TableCell align="right">
                        {gapPrev !== null ? (
                          <Typography variant="body2" color="error.main">
                            +{gapPrev}
                          </Typography>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {gapNext !== null ? (
                           <Typography variant="body2" color="success.main">
                           -{gapNext}
                         </Typography>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {standing.trend === 'up' && <TrendingUp color="success" />}
                        {standing.trend === 'down' && <TrendingDown color="error" />}
                        {standing.trend === 'same' && <Remove color="disabled" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </TabPanel>

      {/* Tab: Lineup Gara - Responsive */}
      <TabPanel value={selectedTab} index={1}>
        {/* Selettore Gara */}
        <Box mb={3}>
          <FormControl fullWidth size={isMobile ? "small" : "medium"}>
            <InputLabel>Seleziona Gara</InputLabel>
            <Select
              value={selectedRaceId || ''}
              onChange={(e) => setSelectedRaceId(e.target.value)}
              label="Seleziona Gara"
            >
              {allRaces?.map((race: any) => (
                <MenuItem key={race.id} value={race.id}>
                  {race.name} - {format(new Date(race.gpDate), 'dd MMM', { locale: it })}
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
          <Grid container spacing={isMobile ? 2 : 3}>
            {lineupsData?.lineups?.map((teamLineup: any) => (
              <Grid key={teamLineup.teamId} size={{ xs: 12, md: 6}}>
                <Card>
                  <CardContent sx={{ p: isMobile ? 2 : 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography
                            variant={isMobile ? "subtitle1" : "h6"}
                            fontWeight="bold"
                          >
                            {teamLineup.teamName}
                          </Typography>
                          {teamLineup.isFallback && (
                            <Tooltip title="Formazione applicata d'ufficio dalla gara precedente">
                              <Info color="warning" fontSize="small" />
                            </Tooltip>
                          )}
                        </Stack>
                        <Typography
                          variant={isMobile ? "caption" : "body2"}
                          color="text.secondary"
                        >
                          di {teamLineup.userName}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${teamLineup.totalPoints ?? 'N/D'} pt`}
                        color="primary"
                        size={isMobile ? "small" : "medium"}
                      />
                    </Box>
                    {teamLineup.lineup && teamLineup.lineup.length > 0 ? (
                      <>
                        <List dense sx={{ p: 0 }}>
                          {teamLineup.lineup.map((lr: any) => {
                            const riderScore = teamLineup.riderScores?.find(
                              (rs: any) => rs.rider === lr.rider.name
                            );
                            
                            return (
                              <ListItem key={lr.id} sx={{ px: 0 }}>
                                <ListItemAvatar>
                                  <Avatar
                                    sx={{
                                      bgcolor: 'primary.main',
                                      width: isMobile ? 28 : 32,
                                      height: isMobile ? 28 : 32,
                                      fontSize: isMobile ? '0.75rem' : '0.875rem'
                                    }}
                                  >
                                    {lr.rider.number}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={
                                    <Typography variant={isMobile ? "body2" : "body1"}>
                                      {lr.rider.name}
                                    </Typography>
                                  }
                                  secondary={
                                    <Box component="span">
                                      <Typography
                                        component="span"
                                        variant="caption"
                                        sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
                                      >
                                        Prev: {lr.predictedPosition || '-'}°
                                        {riderScore && riderScore.actual && (
                                          <> | Arr: {typeof riderScore.actual === 'number' ? `${riderScore.actual}°` : riderScore.actual}</>
                                        )}
                                      </Typography>
                                    </Box>
                                  }
                                />
                                <Chip
                                  label={riderScore ? `${riderScore.points}` : '0'}
                                  size="small"
                                  variant={riderScore && riderScore.points ? "filled" : "outlined"}
                                  color={riderScore && riderScore.points ? "primary" : "default"}
                                  sx={{ 
                                    fontSize: isMobile ? '0.65rem' : '0.75rem',
                                    fontWeight: riderScore && riderScore.points ? 'bold' : 'normal'
                                  }}
                                />
                              </ListItem>
                            );
                          })}
                        </List>

                        {teamLineup.riderScores && teamLineup.riderScores.length > 0 && (
                          <Button
                            size="small"
                            fullWidth
                            variant="outlined"
                            onClick={() => handleShowScoreBreakdown(teamLineup)}
                            startIcon={<BarChart />}
                            sx={{ mt: 2 }}
                          >
                            Analisi Punti
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
      </TabPanel>

      {/* Tab: Statistiche - Responsive */}
      <TabPanel value={selectedTab} index={2}>
        <Grid container spacing={isMobile ? 2 : 3}>
          {/* Top Scorer per Gara */}
          <Grid size={{ xs: 12, md: 6}}>
            <Card>
              <CardContent>
                <Typography
                  variant={isMobile ? "subtitle1" : "h6"}
                  gutterBottom
                  fontWeight="bold"
                >
                  Top Scorer per Gara
                </Typography>
                <List dense={isMobile}>
                  {leagueData?.raceStats?.map((stat: any) => (
                    <ListItem key={stat.raceId}>
                      <ListItemText
                        primary={stat.raceName}
                        secondary={`Winner: ${stat.topTeam} - ${stat.topPoints} pt`}
                        primaryTypographyProps={{
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      />
                      <Chip
                        label={format(new Date(stat.raceDate), 'dd/MM', { locale: it })}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
                {(!leagueData?.raceStats || leagueData.raceStats.length === 0) && (
                  <Typography variant="body2" color="text.secondary">
                    Nessuna statistica disponibile
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Piloti più Scelti */}
          <Grid size={{ xs: 12, md: 6}}>
            <Card>
              <CardContent>
                <Typography
                  variant={isMobile ? "subtitle1" : "h6"}
                  gutterBottom
                  fontWeight="bold"
                >
                  Piloti più Scelti
                </Typography>
                <List dense={isMobile}>
                  {leagueData?.popularRiders?.slice(0, 5).map((rider: any, idx: number) => (
                    <ListItem key={rider.riderId}>
                      <ListItemAvatar>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                          {idx + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={rider.riderName}
                        secondary={
                          <Box>
                            <LinearProgress
                              variant="determinate"
                              value={(rider.teamCount / league.currentTeams) * 100}
                              sx={{ mt: 1, height: 6 }}
                            />
                            <Typography
                              variant="caption"
                              sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
                            >
                              {rider.teamCount}/{league.currentTeams} team ({Math.round((rider.teamCount / league.currentTeams) * 100)}%)
                            </Typography>
                          </Box>
                        }
                        primaryTypographyProps={{
                          fontSize: isMobile ? '0.875rem' : '1rem'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Media Punti per Categoria */}
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography
                  variant={isMobile ? "subtitle1" : "h6"}
                  gutterBottom
                  fontWeight="bold"
                >
                  Performance Media per Categoria
                </Typography>
                <Grid container spacing={2}>
                  {['MOTOGP', 'MOTO2', 'MOTO3'].map(category => {
                    const stats = leagueData?.categoryStats?.[category] || { avg: 0, max: 0, min: 0 };
                    return (
                      <Grid key={category} size={{ xs: 12, sm: 4}}>
                        <Paper sx={{ p: isMobile ? 1.5 : 2, textAlign: 'center' }}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                            sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
                          >
                            {category}
                          </Typography>
                          <Typography
                            variant={isMobile ? "h5" : "h4"}
                            color="primary"
                          >
                            {stats.avg.toFixed(1)}
                          </Typography>
                          <Typography
                            variant="caption"
                            display="block"
                            sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem' }}
                          >
                            Media punti
                          </Typography>
                          <Box display="flex" justifyContent="space-around" mt={1}>
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

      {/* Tab: Gestione (solo per admin) - Responsive */}
      {isAdmin && (
        <TabPanel value={selectedTab} index={3}>
          <Grid container spacing={isMobile ? 2 : 3}>
            {/* Impostazioni Lega */}
            <Grid size={{ xs: 12, md: 6}}>
              <Card>
                <CardContent>
                  <Typography
                    variant={isMobile ? "subtitle1" : "h6"}
                    gutterBottom
                    fontWeight="bold"
                  >
                    Impostazioni Lega
                  </Typography>

                  <Stack spacing={3}>
                    <Box>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={teamsLocked}
                            onChange={(e) => setTeamsLocked(e.target.checked)}
                            size={isMobile ? "small" : "medium"}
                          />
                        }
                        label={
                          <Typography variant={isMobile ? "body2" : "body1"}>
                            Blocca Modifiche Team
                          </Typography>
                        }
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        ml={isMobile ? 5 : 7}
                        sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                      >
                        Impedisce ai membri di modificare i roster
                      </Typography>
                    </Box>

                    <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                      <InputLabel>Visibilità Lineup</InputLabel>
                      <Select
                        value={lineupVisibility}
                        onChange={(e) => setLineupVisibility(e.target.value)}
                        label="Visibilità Lineup"
                      >
                        <MenuItem value="ALWAYS_VISIBLE">Sempre Visibile</MenuItem>
                        <MenuItem value="AFTER_DEADLINE">Solo dopo deadline</MenuItem>
                      </Select>
                    </FormControl>

                    <Button
                      variant="contained"
                      onClick={handleSaveSettings}
                      disabled={updateSettingsMutation.isPending}
                      size={isMobile ? "small" : "medium"}
                    >
                      {updateSettingsMutation.isPending ? 'Salvataggio...' : 'Salva'}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Azioni Rapide */}
            <Grid size={{ xs: 12, md: 6}}>
              <Card>
                <CardContent>
                  <Typography
                    variant={isMobile ? "subtitle1" : "h6"}
                    gutterBottom
                    fontWeight="bold"
                  >
                    Azioni Rapide
                  </Typography>

                  <Stack spacing={2}>
                    <Button
                      variant="outlined"
                      startIcon={<Share />}
                      onClick={handleShareCode}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                    >
                      Condividi Codice
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<Groups />}
                      onClick={() => setShowInviteDialog(true)}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                    >
                      Invita Membri
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<NotificationsActive />}
                      onClick={() => notify('Funzione in sviluppo', 'info')}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                    >
                      Invia Notifica
                    </Button>

                    <Divider />

                    <Button
                      variant="outlined"
                      color="warning"
                      startIcon={<Lock />}
                      fullWidth
                      size={isMobile ? "small" : "medium"}
                      onClick={() => {
                        if (confirm('Sei sicuro di voler chiudere le iscrizioni?')) {
                          notify('Funzione in sviluppo', 'info');
                        }
                      }}
                    >
                      Chiudi Iscrizioni
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Info Lega */}
            <Grid size={12}>
              <Card>
                <CardContent>
                  <Typography
                    variant={isMobile ? "subtitle1" : "h6"}
                    gutterBottom
                    fontWeight="bold"
                  >
                    Informazioni Lega
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6, sm: 3}}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                      >
                        Codice Lega
                      </Typography>
                      <Typography variant={isMobile ? "body1" : "h6"}>
                        {league.code}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3}}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                      >
                        Membri
                      </Typography>
                      <Typography variant={isMobile ? "body1" : "h6"}>
                        {league.currentTeams}/{league.maxTeams}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3}}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                      >
                        Budget
                      </Typography>
                      <Typography variant={isMobile ? "body1" : "h6"}>
                        {league.budget}€
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6, sm: 3}}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
                      >
                        Premio
                      </Typography>
                      <Typography variant={isMobile ? "body1" : "h6"}>
                        {league.prizePool}€
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      )}

      {/* Dialog Invita Membri - Responsive */}
      <Dialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
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