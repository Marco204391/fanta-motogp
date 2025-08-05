// src/pages/HomePage.tsx
import { useQuery } from '@tanstack/react-query';
import { getMyLeagues, getMyTeams, getUpcomingRaces } from '../services/api';
import { Box, Typography, CircularProgress, Alert, Card, CardContent, Button, Grid, Paper, Stack, Icon, Chip, Fade, Zoom, IconButton } from '@mui/material';
import { SportsMotorsports, Groups, CalendarToday, ArrowForward, Close, Notifications, Speed, Timer, EmojiEvents } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useState } from 'react';

function NextRaceCard({ race }: { race: any }) {
    const navigate = useNavigate();
    if (!race) return <Card><CardContent><Typography>Nessuna gara in programma.</Typography></CardContent></Card>;

    const raceDate = new Date(race.gpDate);

    return (
        <Paper 
            sx={{ 
                p: 3, 
                backgroundColor: 'primary.main', 
                color: 'primary.contrastText',
                position: 'relative',
                overflow: 'hidden'
            }} 
            elevation={4}
        >
            <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1, fontSize: '150px' }}>
                <CalendarToday sx={{ fontSize: 'inherit' }} />
            </Box>
            <Typography variant="overline">Prossima Gara</Typography>
            <Typography variant="h4" gutterBottom>{race.name}</Typography>
            <Typography variant="h6">{race.circuit}, {race.country}</Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
                {format(raceDate, 'EEEE d MMMM yyyy', { locale: it })}
            </Typography>
            <Button 
                variant="contained" 
                color="secondary" 
                endIcon={<ArrowForward />}
                onClick={() => navigate(`/races/${race.id}`)}
            >
                Dettagli Gara
            </Button>
        </Paper>
    );
}

function MyLeagues({ leagues }: { leagues: any[] }) {
    const navigate = useNavigate();
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="h5" gutterBottom>Le mie Leghe</Typography>
                {leagues.length > 0 ? (
                    <Stack spacing={2}>
                        {leagues.slice(0, 3).map(league => (
                            <Paper key={league.id} variant="outlined" sx={{ p: 2 }}>
                                <Typography variant="h6">{league.name}</Typography>
                                <Chip label={`${league.currentTeams}/${league.maxTeams} team`} size="small" sx={{ mt: 1 }} />
                            </Paper>
                        ))}
                    </Stack>
                ) : (
                    <Typography>Non sei ancora in nessuna lega.</Typography>
                )}
                <Button sx={{mt: 2}} onClick={() => navigate('/leagues')} endIcon={<ArrowForward />}>Vedi tutte</Button>
            </CardContent>
        </Card>
    );
}

function MyTeams({ teams }: { teams: any[] }) {
    const navigate = useNavigate();
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="h5" gutterBottom>I miei Team</Typography>
                 {teams.length > 0 ? (
                    <Stack spacing={2}>
                    {teams.slice(0, 3).map(team => (
                        <Paper key={team.id} variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="h6">{team.name}</Typography>
                            <Typography component="span" color="text.secondary">({team.league.name})</Typography>
                        </Paper>
                    ))}
                    </Stack>
                ) : (
                    <Typography>Non hai ancora creato nessun team.</Typography>
                )}
                 <Button sx={{mt: 2}} onClick={() => navigate('/teams')} endIcon={<ArrowForward />}>Gestisci i team</Button>
            </CardContent>
        </Card>
    );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [showBanner, setShowBanner] = useState(true);
  
  const { data: racesData, isLoading: isLoadingRaces } = useQuery({
    queryKey: ['upcomingRaces'],
    queryFn: getUpcomingRaces,
  });

  const { data: leaguesData, isLoading: isLoadingLeagues } = useQuery({
    queryKey: ['myLeagues'],
    queryFn: getMyLeagues,
  });

  const { data: teamsData, isLoading: isLoadingTeams } = useQuery({
    queryKey: ['myTeams'],
    queryFn: getMyTeams,
  });

  if (isLoadingRaces || isLoadingLeagues || isLoadingTeams) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={60} />
      </Box>
    );
  }
  
  const nextRace = racesData?.races?.[0];
  const leagues = leaguesData?.leagues || [];
  const teams = teamsData?.teams || [];
  const teamsWithoutLineup = teams.filter(t => !t.hasLineup && nextRace);

  return (
    <Box className="fade-in">
      {/* Banner Notifica */}
      {showBanner && teamsWithoutLineup.length > 0 && (
        <Fade in={showBanner}>
          <Alert 
            severity="warning"
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={() => setShowBanner(false)}
              >
                <Close />
              </IconButton>
            }
            sx={{ mb: 3 }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Notifications />
              <Typography>
                Hai {teamsWithoutLineup.length} team senza formazione per la prossima gara!
              </Typography>
            </Stack>
          </Alert>
        </Fade>
      )}

      <Typography variant="h3" gutterBottom sx={{ mb: 4 }}>
        Dashboard
      </Typography>

      <Grid container spacing={4}>
        {/* Prossima Gara - Full Width */}
        <Grid item xs={12}>
          <Zoom in timeout={600}>
            <Paper 
              className="pulse"
              sx={{ 
                p: 4, 
                background: `linear-gradient(135deg, rgba(230,0,35,0.9), rgba(20,20,20,0.95)), url('/race-hero.jpg')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.02)',
                  transition: 'transform 0.3s ease',
                }
              }} 
              elevation={8}
              onClick={() => nextRace && navigate(`/races/${nextRace.id}`)}
            >
              <Box sx={{ 
                position: 'absolute', 
                top: -50, 
                right: -50, 
                opacity: 0.1,
              }}>
                <CalendarToday sx={{ fontSize: 200 }} />
              </Box>
              
              {nextRace ? (
                <>
                  <Typography variant="overline" sx={{ opacity: 0.8 }}>
                    Prossima Gara - Round {nextRace.round}
                  </Typography>
                  <Typography variant="h3" gutterBottom sx={{ fontWeight: 800 }}>
                    {nextRace.name}
                  </Typography>
                  <Typography variant="h5" sx={{ opacity: 0.9, mb: 2 }}>
                    {nextRace.circuit}, {nextRace.country}
                  </Typography>
                  
                  <Stack direction="row" spacing={3} alignItems="center">
                    <Chip 
                      icon={<Timer />}
                      label={format(new Date(nextRace.gpDate), 'EEEE d MMMM yyyy', { locale: it })}
                      sx={{ 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                    {nextRace.sprintDate && (
                      <Chip 
                        icon={<Speed />}
                        label="Weekend Sprint"
                        color="warning"
                      />
                    )}
                    <Box sx={{ flexGrow: 1 }} />
                    <Button 
                      variant="contained" 
                      color="secondary" 
                      endIcon={<ArrowForward />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/races/${nextRace.id}`);
                      }}
                      sx={{ 
                        boxShadow: '0 4px 20px rgba(255,107,0,0.4)',
                      }}
                    >
                      Dettagli Gara
                    </Button>
                  </Stack>
                </>
              ) : (
                <Typography variant="h5" sx={{ opacity: 0.7 }}>
                  Nessuna gara in programma
                </Typography>
              )}
            </Paper>
          </Zoom>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            Azioni Rapide
          </Typography>
          <Grid container spacing={2}>
            {[
              { 
                icon: <SportsMotorsports sx={{ fontSize: 40 }} />, 
                label: 'I Miei Team',
                color: 'primary',
                path: '/teams',
                count: teams.length,
              },
              { 
                icon: <Groups sx={{ fontSize: 40 }} />, 
                label: 'Le Mie Leghe',
                color: 'secondary',
                path: '/leagues',
                count: leagues.length,
              },
              { 
                icon: <EmojiEvents sx={{ fontSize: 40 }} />, 
                label: 'Classifiche',
                color: 'warning',
                path: '/leagues',
              },
              { 
                icon: <CalendarToday sx={{ fontSize: 40 }} />, 
                label: 'Calendario',
                color: 'info',
                path: '/calendar',
              },
            ].map((action, index) => (
              <Grid item xs={6} sm={3} key={index}>
                <Fade in timeout={800 + index * 200}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      textAlign: 'center',
                      py: 3,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: (theme) => `0 12px 24px ${theme.palette[action.color as 'primary' | 'secondary' | 'warning' | 'info'].main}40`,
                        '& .icon': {
                          transform: 'scale(1.2)',
                        }
                      }
                    }}
                    onClick={() => navigate(action.path)}
                  >
                    <Box 
                      className="icon" 
                      sx={{ 
                        color: `${action.color}.main`,
                        transition: 'transform 0.3s ease',
                        mb: 2,
                      }}
                    >
                      {action.icon}
                    </Box>
                    <Typography variant="h6">{action.label}</Typography>
                    {action.count !== undefined && (
                      <Chip 
                        label={action.count} 
                        size="small" 
                        color={action.color as 'primary' | 'secondary' | 'warning' | 'info'}
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Card>
                </Fade>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Le mie Leghe */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5">Le mie Leghe</Typography>
                <IconButton onClick={() => navigate('/leagues')} color="primary">
                  <ArrowForward />
                </IconButton>
              </Stack>
              
              {leagues.length > 0 ? (
                <Stack spacing={2}>
                  {leagues.slice(0, 3).map(league => (
                    <Paper 
                      key={league.id} 
                      variant="outlined" 
                      sx={{ 
                        p: 2,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          transform: 'translateX(8px)',
                        }
                      }}
                      onClick={() => navigate(`/leagues/${league.id}`)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="h6">{league.name}</Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip 
                              label={`${league.currentTeams}/${league.maxTeams} team`} 
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            {league.userPosition && (
                              <Chip 
                                label={`${league.userPosition}° posto`} 
                                size="small"
                                color="secondary"
                              />
                            )}
                          </Stack>
                        </Box>
                        <EmojiEvents sx={{ 
                          color: league.userPosition === 1 ? 'warning.main' : 'text.secondary',
                          fontSize: 32,
                        }} />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Groups sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    Non sei ancora in nessuna lega
                  </Typography>
                  <Button 
                    variant="contained" 
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/leagues')}
                  >
                    Esplora Leghe
                  </Button>
                </Box>
              )}
              
              {leagues.length > 3 && (
                <Button 
                  fullWidth 
                  sx={{ mt: 2 }} 
                  onClick={() => navigate('/leagues')}
                  endIcon={<ArrowForward />}
                >
                  Vedi tutte ({leagues.length})
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* I miei Team */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5">I miei Team</Typography>
                <IconButton onClick={() => navigate('/teams')} color="primary">
                  <ArrowForward />
                </IconButton>
              </Stack>
              
              {teams.length > 0 ? (
                <Stack spacing={2}>
                  {teams.slice(0, 3).map(team => (
                    <Paper 
                      key={team.id} 
                      variant="outlined" 
                      sx={{ 
                        p: 2,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: !team.hasLineup && nextRace ? '2px solid' : '1px solid',
                        borderColor: !team.hasLineup && nextRace ? 'warning.main' : 'divider',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                          transform: 'translateX(8px)',
                        }
                      }}
                      onClick={() => navigate(`/teams`)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="h6">{team.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {team.league.name}
                          </Typography>
                          {!team.hasLineup && nextRace && (
                            <Chip 
                              label="Schiera formazione!" 
                              size="small"
                              color="warning"
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>
                        <Stack alignItems="center">
                          <SportsMotorsports sx={{ fontSize: 32, color: 'primary.main' }} />
                          {team.totalPoints !== undefined && (
                            <Typography variant="caption" color="text.secondary">
                              {team.totalPoints} pts
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <SportsMotorsports sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    Non hai ancora creato nessun team
                  </Typography>
                  <Button 
                    variant="contained" 
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/leagues')}
                  >
                    Unisciti a una Lega
                  </Button>
                </Box>
              )}
              
              {teams.length > 3 && (
                <Button 
                  fullWidth 
                  sx={{ mt: 2 }} 
                  onClick={() => navigate('/teams')}
                  endIcon={<ArrowForward />}
                >
                  Gestisci tutti ({teams.length})
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}