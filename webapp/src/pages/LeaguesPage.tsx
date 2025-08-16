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
  useTheme,
  useMediaQuery,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';
import {
  EmojiEvents,
  Groups,
  Add,
  Lock,
  Public,
  ContentCopy,
  Login,
  Code
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
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

function LeagueCard({ league, onJoin, onView, isMyLeague }: {
  league: League;
  onJoin?: () => void;
  onView: () => void;
  isMyLeague?: boolean;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(league.code);
    // In produzione useresti un toast/snackbar
    alert('Codice copiato!');
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1, p: isMobile ? 2 : 3 }}>
        <Stack 
          direction={isMobile ? "column" : "row"} 
          justifyContent="space-between" 
          alignItems={isMobile ? "flex-start" : "flex-start"} 
          mb={2}
          spacing={1}
        >
          <Box sx={{ width: '100%' }}>
            <Typography 
              variant={isMobile ? "subtitle1" : "h6"} 
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
              sx={{ mb: 1 }}
            >
              <Chip
                icon={league.isPrivate ? <Lock /> : <Public />}
                label={league.isPrivate ? 'Privata' : 'Pubblica'}
                size="small"
                color={league.isPrivate ? 'default' : 'primary'}
              />
              <Chip
                icon={<Groups />}
                label={`${league.currentTeams}/${league.maxTeams}`}
                size="small"
                color={league.currentTeams >= league.maxTeams ? 'error' : 'default'}
              />
            </Stack>
          </Box>
          {isMyLeague && (
            <Tooltip title="Copia codice lega">
              <IconButton 
                size="small" 
                onClick={handleCopyCode}
                sx={{ alignSelf: 'flex-start' }}
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={6}>
            <Box>
              <Typography 
                variant={isMobile ? "h6" : "h5"} 
                color="primary"
                sx={{ fontWeight: 'bold' }}
              >
                {league.budget}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Budget
              </Typography>
            </Box>
          </Grid>
          {isMyLeague && league.userPosition && (
            <Grid size={6}>
              <Box>
                <Typography 
                  variant={isMobile ? "h6" : "h5"} 
                  color="secondary"
                  sx={{ fontWeight: 'bold' }}
                >
                  {league.userPosition}°
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Posizione
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        {isMyLeague && (
          <Box 
            sx={{ 
              p: 1, 
              bgcolor: 'action.hover', 
              borderRadius: 1,
              mb: 1
            }}
          >
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}
            >
              Codice: <strong>{league.code}</strong>
            </Typography>
          </Box>
        )}
      </CardContent>
      
      <CardActions sx={{ p: isMobile ? 2 : 3, pt: 0 }}>
        {isMyLeague ? (
          <Button 
            fullWidth 
            variant="contained" 
            onClick={onView}
            size={isMobile ? "medium" : "large"}
          >
            Vai alla Lega
          </Button>
        ) : league.hasTeam ? (
          <Button 
            fullWidth 
            variant="outlined" 
            onClick={onView}
            size={isMobile ? "medium" : "large"}
          >
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
            size={isMobile ? "medium" : "large"}
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

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
      setTabValue(0);
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

  const speedDialActions = [
    { 
      icon: <Add />, 
      name: 'Crea Lega',
      action: () => navigate('/leagues/create')
    },
    { 
      icon: <Code />, 
      name: 'Inserisci Codice',
      action: () => setJoinDialogOpen(true)
    },
  ];

  return (
    <Box sx={{ pb: isMobile ? 10 : 2 }}>
      {/* Header - Responsive */}
      <Stack 
        direction={isMobile ? "column" : "row"} 
        justifyContent="space-between" 
        alignItems={isMobile ? "flex-start" : "center"} 
        mb={3}
        spacing={2}
      >
        <Box>
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            gutterBottom
            sx={{ fontWeight: 'bold' }}
          >
            Leghe
          </Typography>
          <Typography 
            variant={isMobile ? "body2" : "body1"} 
            color="text.secondary"
          >
            Gestisci le tue leghe e scoprine di nuove
          </Typography>
        </Box>
        
        {/* Desktop Actions */}
        {!isMobile && (
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
        )}
      </Stack>

      {/* Tabs - Responsive */}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, newValue) => setTabValue(newValue)}
          variant={isMobile ? "fullWidth" : "standard"}
        >
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant={isMobile ? "caption" : "body2"}>
                  Le mie leghe
                </Typography>
                <Chip 
                  label={myLeagues.length} 
                  size="small"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Box>
            }
          />
          <Tab 
            label={
              <Typography variant={isMobile ? "caption" : "body2"}>
                Leghe pubbliche
              </Typography>
            }
          />
        </Tabs>
      </Paper>

      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Tab: Le mie leghe */}
          <TabPanel value={tabValue} index={0}>
            {myLeagues.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: isMobile ? 3 : 4 }}>
                  <EmojiEvents 
                    sx={{ 
                      fontSize: isMobile ? 48 : 64, 
                      color: 'text.secondary', 
                      mb: 2 
                    }} 
                  />
                  <Typography 
                    variant={isMobile ? "subtitle1" : "h6"} 
                    gutterBottom
                  >
                    Non sei ancora in nessuna lega
                  </Typography>
                  <Typography 
                    variant={isMobile ? "caption" : "body2"} 
                    color="text.secondary" 
                    sx={{ mb: 3 }}
                  >
                    Unisciti a una lega pubblica o usa un codice invito per iniziare!
                  </Typography>
                  <Stack 
                    direction={isMobile ? "column" : "row"} 
                    spacing={2} 
                    justifyContent="center"
                  >
                    <Button
                      variant="outlined"
                      onClick={() => setJoinDialogOpen(true)}
                      fullWidth={isMobile}
                      size={isMobile ? "medium" : "large"}
                    >
                      Usa un codice
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => setTabValue(1)}
                      fullWidth={isMobile}
                      size={isMobile ? "medium" : "large"}
                    >
                      Esplora leghe pubbliche
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <Grid container spacing={isMobile ? 2 : 3}>
                {myLeagues.map((league) => (
                  <Grid 
                    key={league.id} 
                    size={{ 
                      xs: 12, 
                      sm: isTablet ? 6 : 6, 
                      md: 4 
                    }}
                  >
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

          {/* Tab: Leghe pubbliche */}
          <TabPanel value={tabValue} index={1}>
            {publicLeagues.length === 0 ? (
              <Alert severity="info">
                Nessuna lega pubblica disponibile al momento.
              </Alert>
            ) : (
              <Grid container spacing={isMobile ? 2 : 3}>
                {publicLeagues.map((league) => (
                  <Grid 
                    key={league.id} 
                    size={{ 
                      xs: 12, 
                      sm: isTablet ? 6 : 6, 
                      md: 4 
                    }}
                  >
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

      {/* Mobile Floating Action Button / SpeedDial */}
      {isMobile && (
        <SpeedDial
          ariaLabel="Azioni Lega"
          sx={{ position: 'fixed', bottom: 72, right: 16 }}
          icon={<SpeedDialIcon />}
          onClose={() => setSpeedDialOpen(false)}
          onOpen={() => setSpeedDialOpen(true)}
          open={speedDialOpen}
        >
          {speedDialActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={() => {
                action.action();
                setSpeedDialOpen(false);
              }}
            />
          ))}
        </SpeedDial>
      )}

      {/* Dialog per unirsi con codice - Responsive */}
      <Dialog 
        open={joinDialogOpen} 
        onClose={() => setJoinDialogOpen(false)} 
        maxWidth="xs" 
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>
          <Typography variant={isMobile ? "h6" : "h5"}>
            Unisciti a una Lega
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              autoFocus
              label="Codice Lega"
              fullWidth
              variant="outlined"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Inserisci il codice..."
              inputProps={{ maxLength: 8 }}
              size={isMobile ? "small" : "medium"}
            />
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ mt: 1, display: 'block' }}
            >
              Inserisci il codice di 8 caratteri fornito dal creatore della lega
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: isMobile ? 2 : 3 }}>
          <Button 
            onClick={() => setJoinDialogOpen(false)}
            size={isMobile ? "medium" : "large"}
          >
            Annulla
          </Button>
          <Button
            onClick={handleJoinWithCode}
            variant="contained"
            disabled={joinLeagueMutation.isPending}
            size={isMobile ? "medium" : "large"}
          >
            {joinLeagueMutation.isPending ? 'Unione in corso...' : 'Unisciti'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}