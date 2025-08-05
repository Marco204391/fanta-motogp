// src/pages/HomePage.tsx
import { useQuery } from '@tanstack/react-query';
import { getMyLeagues, getMyTeams, getUpcomingRaces } from '../services/api';
import { Box, Typography, CircularProgress, Alert, Grid, Card, CardContent, Button } from '@mui/material';

// --- Componente per la Prossima Gara ---
function NextRaceCard({ race }: { race: any }) {
    if (!race) return <Card><CardContent><Typography>Nessuna gara in programma.</Typography></CardContent></Card>;
    
    const raceDate = new Date(race.gpDate).toLocaleDateString('it-IT', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6">Prossima Gara: {race.name}</Typography>
                <Typography variant="body1">{race.circuit}, {race.country}</Typography>
                <Typography variant="body2" color="text.secondary">{raceDate}</Typography>
            </CardContent>
        </Card>
    );
}

// --- Componente per le Leghe ---
function MyLeagues({ leagues }: { leagues: any[] }) {
    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>Le mie Leghe</Typography>
                {leagues.length > 0 ? (
                    leagues.map(league => (
                        <Box key={league.id} sx={{ mb: 1 }}>
                            <Typography variant="body1">{league.name} - ({league.currentTeams}/{league.maxTeams} team)</Typography>
                        </Box>
                    ))
                ) : (
                    <Typography>Non sei ancora in nessuna lega.</Typography>
                )}
                <Button sx={{mt: 2}}>Vedi tutte le leghe</Button>
            </CardContent>
        </Card>
    );
}

// --- Componente per i Team ---
function MyTeams({ teams }: { teams: any[] }) {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>I miei Team</Typography>
                 {teams.length > 0 ? (
                    teams.map(team => (
                        <Box key={team.id} sx={{ mb: 1 }}>
                            <Typography variant="body1">{team.name} <Typography component="span" color="text.secondary">({team.league.name})</Typography></Typography>
                        </Box>
                    ))
                ) : (
                    <Typography>Non hai ancora creato nessun team.</Typography>
                )}
                 <Button sx={{mt: 2}}>Gestisci i team</Button>
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
        <Grid container spacing={3}>
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