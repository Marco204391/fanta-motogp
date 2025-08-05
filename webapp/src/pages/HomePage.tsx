// src/pages/HomePage.tsx
import { useQuery } from '@tanstack/react-query';
import { getMyLeagues, getMyTeams, getUpcomingRaces } from '../services/api';
import { Box, Typography, CircularProgress, Alert, Grid, Card, CardContent, Button, Paper, Stack, Icon, Chip } from '@mui/material';
import { SportsMotorsports, Groups, CalendarToday, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

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
  const { data: racesData, isLoading: isLoadingRaces, error: errorRaces } = useQuery({
    queryKey: ['upcomingRaces'],
    queryFn: getUpcomingRaces,
  });

  const { data: leaguesData, isLoading: isLoadingLeagues, error: errorLeagues } = useQuery({
    queryKey: ['myLeagues'],
    queryFn: getMyLeagues,
  });

  const { data: teamsData, isLoading: isLoadingTeams, error: errorTeams } = useQuery({
    queryKey: ['myTeams'],
    queryFn: getMyTeams,
  });

  if (isLoadingRaces || isLoadingLeagues || isLoadingTeams) {
    return <CircularProgress />;
  }

  const error = errorRaces || errorLeagues || errorTeams;
  if (error) {
    return <Alert severity="error">Errore nel caricamento dei dati.</Alert>;
  }
  
  const nextRace = racesData?.races?.[0];

  return (
    <Box>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <Grid container spacing={4}>
            <Grid item xs={12}>
                 <NextRaceCard race={nextRace} />
            </Grid>
            <Grid item xs={12} md={6}>
                <MyLeagues leagues={leaguesData?.leagues || []} />
            </Grid>
            <Grid item xs={12} md={6}>
                <MyTeams teams={teamsData?.teams || []} />
            </Grid>
        </Grid>
    </Box>
  );
}