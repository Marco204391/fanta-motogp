// src/pages/RaceCalendarPage.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllRaces } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
} from '@mui/material';
import { format, isPast } from 'date-fns';
import { it } from 'date-fns/locale';

interface Race {
  id: string;
  name: string;
  circuit: string;
  country: string;
  gpDate: string;
  round: number;
}

const groupRacesByMonth = (races: Race[]) => {
  return races.reduce((acc, race) => {
    const month = format(new Date(race.gpDate), 'MMMM yyyy', { locale: it });
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(race);
    return acc;
  }, {} as Record<string, Race[]>);
};

export default function RaceCalendarPage() {
  const navigate = useNavigate();
  const { data: racesData, isLoading, error } = useQuery({
    queryKey: ['allRaces'],
    queryFn: getAllRaces,
  });

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Errore nel caricamento del calendario.</Alert>;
  }

  const races = racesData?.races || [];
  const groupedRaces = groupRacesByMonth(races);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Calendario Gare
      </Typography>
      {Object.entries(groupedRaces).map(([month, monthRaces]) => (
        <Box key={month} sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ textTransform: 'capitalize' }}>
            {month}
          </Typography>
          <Grid container spacing={3}>
            {monthRaces.map(race => (
              <Grid item xs={12} sm={6} md={4} key={race.id}>
                <Card>
                  <CardActionArea onClick={() => navigate(`/races/${race.id}`)}>
                    <CardContent>
                      <Typography variant="h6">{race.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{race.circuit}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {format(new Date(race.gpDate), 'd MMMM yyyy', { locale: it })}
                      </Typography>
                      <Chip
                        label={isPast(new Date(race.gpDate)) ? 'Conclusa' : 'In programma'}
                        color={isPast(new Date(race.gpDate)) ? 'default' : 'primary'}
                        size="small"
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}