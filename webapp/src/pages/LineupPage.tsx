// webapp/src/pages/LineupPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeamById, getUpcomingRaces, getLineup, setLineup } from '../services/api';
import { Box, Typography, CircularProgress, Alert, Card, CardContent, Button, Grid, Paper, List, ListItem, ListItemText, ListItemAvatar, Avatar, TextField, Divider, Chip } from '@mui/material';
import { Save, CheckCircle, Warning, Timer } from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

// ... (interfacce Rider, TeamRider, Team, LineupData come in CreateTeamPage)

const categoryRequirements = {
  MOTOGP: 2, MOTO2: 2, MOTO3: 2,
};

export default function LineupPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [predictedPositions, setPredictedPositions] = useState<Record<string, string>>({});

  const { data: teamData, isLoading: loadingTeam } = useQuery({ queryKey: ['teamDetails', teamId], queryFn: () => getTeamById(teamId!) });
  const { data: racesData } = useQuery({ queryKey: ['upcomingRaces'], queryFn: getUpcomingRaces });
  
  const team = teamData?.team;
  const nextRace = racesData?.races?.[0];

  const { data: lineupData, isLoading: loadingLineup } = useQuery({
    queryKey: ['lineup', teamId, nextRace?.id],
    queryFn: () => getLineup(teamId!, nextRace!.id),
    enabled: !!teamId && !!nextRace,
  });

  useEffect(() => {
    if (lineupData?.lineup?.lineupRiders) {
      const initialPredictions = lineupData.lineup.lineupRiders.reduce((acc: any, lr: any) => {
        acc[lr.riderId] = lr.predictedPosition.toString();
        return acc;
      }, {});
      setPredictedPositions(initialPredictions);
    }
  }, [lineupData]);
  
  const { mutate: saveLineup, isPending: savingLineup } = useMutation({
    mutationFn: (riders: any[]) => setLineup(nextRace!.id, { teamId: teamId!, riders }),
    onSuccess: () => {
      alert('Formazione salvata!');
      queryClient.invalidateQueries({ queryKey: ['myTeams'] });
      navigate('/teams');
    },
    onError: (error: any) => alert(`Errore: ${error.response?.data?.error}`),
  });

  const handlePredictionChange = (riderId: string, value: string) => {
    if (/^\d*$/.test(value) && Number(value) >= 0 && Number(value) <= 40) {
      setPredictedPositions(prev => ({ ...prev, [riderId]: value }));
    }
  };
  
  const handleSubmit = () => {
    const ridersToSave = team.riders.map((tr: any) => ({
        riderId: tr.rider.id,
        predictedPosition: parseInt(predictedPositions[tr.rider.id] || '0', 10),
    }));
    saveLineup(ridersToSave);
  };

  const isFormValid = useMemo(() => {
    return team?.riders.every((tr: any) => {
      const pos = parseInt(predictedPositions[tr.rider.id] || '', 10);
      return !isNaN(pos) && pos >= 1 && pos <= 40;
    });
  }, [predictedPositions, team]);

  if (loadingTeam || loadingLineup) return <CircularProgress />;
  if (!team || !nextRace) return <Alert severity="warning">Impossibile caricare i dati del team o della prossima gara.</Alert>;

  const deadline = new Date(nextRace.sprintDate || nextRace.gpDate);
  const isDeadlinePassed = new Date() > deadline;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Schiera Formazione per {nextRace.name}</Typography>
      <Typography variant="h6" color="text.secondary">{team.name}</Typography>
      
      <Alert severity={isDeadlinePassed ? "error" : "info"} sx={{ my: 2 }}>
        <Timer sx={{ mr: 1, verticalAlign: 'middle' }} />
        Deadline: {format(deadline, 'dd/MM/yyyy HH:mm', { locale: it })}.
        {isDeadlinePassed ? ' Le modifiche sono bloccate.' : ''}
      </Alert>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom>Rosa Piloti</Typography>
          {['MOTOGP', 'MOTO2', 'MOTO3'].map(category => (
            <Box key={category} mb={2}>
              <Typography variant="subtitle1">{category}</Typography>
              <List>
                {team.riders.filter((tr: any) => tr.rider.category === category).map((tr: any) => (
                  <ListItem key={tr.rider.id}>
                    <ListItemAvatar><Avatar>{tr.rider.number}</Avatar></ListItemAvatar>
                    <ListItemText primary={tr.rider.name} secondary={tr.rider.team} />
                    <TextField
                      label="Pos. Prev."
                      type="number"
                      variant="outlined"
                      size="small"
                      sx={{ width: 100 }}
                      value={predictedPositions[tr.rider.id] || ''}
                      onChange={(e) => handlePredictionChange(tr.rider.id, e.target.value)}
                      disabled={isDeadlinePassed}
                      error={!predictedPositions[tr.rider.id]}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, position: 'sticky', top: 16 }}>
            <Typography variant="h6">Riepilogo</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography>Inserisci la posizione prevista per ogni pilota (da 1 a 40).</Typography>
            <Button
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 2 }}
              onClick={handleSubmit}
              disabled={!isFormValid || isDeadlinePassed || savingLineup}
              startIcon={<Save />}
            >
              {savingLineup ? 'Salvataggio...' : 'Salva Formazione'}
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}