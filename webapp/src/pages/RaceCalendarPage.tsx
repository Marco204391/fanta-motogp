// webapp/src/pages/RaceCalendarPage.tsx
import { useQuery } from '@tanstack/react-query';
import { getAllRaces } from '../services/api';
import { Box, Typography, CircularProgress, Alert, Grid } from '@mui/material';
import { RaceEventCard } from '../components/RaceEventCard';

interface Race {
  id: string;
  name: string;
  circuit: string;
  country: string;
  gpDate: string;
  startDate: string;
  endDate: string;
  round: number;
}

export default function RaceCalendarPage() {
 const { data: racesData, isLoading, error } = useQuery<{ races: Race[] }>({
    queryKey: ['allRaces', new Date().getFullYear()],
    queryFn: () => getAllRaces(new Date().getFullYear()),
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Errore nel caricamento del calendario.</Alert>;
  }

  const races = racesData?.races || [];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Calendario Gare {new Date().getFullYear()}
      </Typography>
      <Grid container spacing={3}>
        {races.map(race => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={race.id} sx={{ display: 'flex' }}>
            <RaceEventCard race={race} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}