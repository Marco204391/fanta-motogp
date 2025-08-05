// src/pages/LineupPage.tsx
import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeamById, getUpcomingRaces, getLineup, setLineup } from '../services/api';
import { Box, Typography, CircularProgress, Alert, Card, CardContent, FormGroup, FormControlLabel, Checkbox, Grid, Button, Paper, TextField } from '@mui/material';

interface RiderSelection {
  [riderId: string]: { selected: boolean; predictedPosition: string };
}

function RiderCategory({ title, riders, lineup, onToggle, onPredictionChange, isDeadlinePassed }: any) {
  const selectedCount = riders.filter((r: any) => lineup[r.rider.id]?.selected).length;
  
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" color={selectedCount === 2 ? 'green' : 'inherit'}>
          {title} ({selectedCount}/2)
        </Typography>
        <FormGroup>
          {riders.map(({ rider }: any) => {
            const isSelected = lineup[rider.id]?.selected;
            const canSelect = selectedCount < 2;
            
            return (
              <Box key={rider.id} sx={{ display: 'flex', alignItems: 'center', my: 1 }}>
                <FormControlLabel
                  control={<Checkbox checked={!!isSelected} onChange={() => onToggle(rider)} />}
                  label={`${rider.number}. ${rider.name}`}
                  disabled={isDeadlinePassed || (!isSelected && !canSelect)}
                />
                {isSelected && (
                  <TextField
                    label="Pos."
                    type="number"
                    size="small"
                    value={lineup[rider.id]?.predictedPosition || ''}
                    onChange={(e) => onPredictionChange(rider.id, e.target.value)}
                    disabled={isDeadlinePassed}
                    sx={{ width: '80px', ml: 'auto' }}
                  />
                )}
              </Box>
            );
          })}
        </FormGroup>
      </CardContent>
    </Card>
  );
}

export default function LineupPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [lineup, setLineup] = useState<RiderSelection>({});

  const { data: teamData, isLoading: isLoadingTeam } = useQuery({
    queryKey: ['teamDetails', teamId],
    queryFn: () => getTeamById(teamId!),
  });
  const { data: raceData, isLoading: isLoadingRace } = useQuery({
    queryKey: ['upcomingRaces'],
    queryFn: getUpcomingRaces,
  });
  
  const team = teamData?.team;
  const upcomingRace = raceData?.races?.[0];
  
  const { data: existingLineup } = useQuery({
    queryKey: ['lineup', teamId, upcomingRace?.id],
    queryFn: () => getLineup(teamId!, upcomingRace!.id),
    enabled: !!teamId && !!upcomingRace,
  });

  const { mutate: saveLineup, isPending: isSaving } = useMutation({
    mutationFn: (data: { raceId: string, lineupData: any}) => setLineup(data.raceId, data.lineupData),
    onSuccess: () => {
      alert('Formazione salvata con successo!');
      queryClient.invalidateQueries({ queryKey: ['myTeams'] });
      navigate('/teams');
    },
    onError: (err: any) => alert(`Errore: ${err.response?.data?.error || 'Impossibile salvare'}`)
  });

  useEffect(() => {
    if (existingLineup?.lineup?.lineupRiders) {
      const newLineup: RiderSelection = {};
      existingLineup.lineup.lineupRiders.forEach((lr: any) => {
        newLineup[lr.riderId] = {
          selected: true,
          predictedPosition: lr.predictedPosition.toString(),
        };
      });
      setLineup(newLineup);
    }
  }, [existingLineup]);

  const deadline = upcomingRace?.sprintDate || upcomingRace?.gpDate;
  const isDeadlinePassed = deadline ? new Date() > new Date(deadline) : false;

  const lineupStats = useMemo(() => {
    const stats = {
      categoryCounts: { MOTOGP: 0, MOTO2: 0, MOTO3: 0 },
      validationErrors: [] as string[],
    };
    if (!team) return stats;

    const selectedRiders = Object.keys(lineup).filter(id => lineup[id].selected);
    selectedRiders.forEach(riderId => {
      const riderData = team.riders.find((r: any) => r.rider.id === riderId)?.rider;
      if (riderData) {
        stats.categoryCounts[riderData.category]++;
        const pos = parseInt(lineup[riderId].predictedPosition, 10);
        if (isNaN(pos) || pos < 1 || pos > 30) {
            stats.validationErrors.push(`Posizione non valida per ${riderData.name}`);
        }
      }
    });

    if (selectedRiders.length !== 6) stats.validationErrors.push("Devi selezionare 6 piloti.");
    if (stats.categoryCounts.MOTOGP !== 2) stats.validationErrors.push("Devi schierare 2 piloti MotoGP.");
    if (stats.categoryCounts.MOTO2 !== 2) stats.validationErrors.push("Devi schierare 2 piloti Moto2.");
    if (stats.categoryCounts.MOTO3 !== 2) stats.validationErrors.push("Devi schierare 2 piloti Moto3.");
    
    return stats;
  }, [lineup, team]);

  const handleToggleRider = (rider: any) => {
    setLineup(prev => {
      const newLineup = { ...prev };
      if (newLineup[rider.id]?.selected) {
        delete newLineup[rider.id];
      } else {
        newLineup[rider.id] = { selected: true, predictedPosition: '' };
      }
      return newLineup;
    });
  };
  
  const handlePredictionChange = (riderId: string, position: string) => {
    setLineup(prev => ({
      ...prev,
      [riderId]: { ...prev[riderId], predictedPosition: position },
    }));
  };
  
  const handleSubmit = () => {
    if (validationErrors.length > 0) {
        alert("Controlla gli errori:\n" + validationErrors.join('\n'));
        return;
    }
    const ridersToSave = Object.keys(lineup)
        .filter(id => lineup[id].selected)
        .map(id => ({
            riderId: id,
            predictedPosition: parseInt(lineup[id].predictedPosition, 10),
        }));
    
    saveLineup({
        raceId: upcomingRace.id,
        lineupData: { teamId, riders: ridersToSave }
    });
  };

  if (isLoadingTeam || isLoadingRace) return <CircularProgress />;
  if (!team || !upcomingRace) return <Alert severity="error">Dati del team o della gara non trovati.</Alert>;
  
  const { validationErrors } = lineupStats;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Schiera Formazione</Typography>
      <Typography variant="h6">{team.name} per {upcomingRace.name}</Typography>
      {isDeadlinePassed && <Alert severity="error">La deadline per schierare la formazione è passata.</Alert>}
      
      <Paper elevation={3} sx={{ p: 2, mb: 3, mt: 2, position: 'sticky', top: 0, zIndex: 1 }}>
         {validationErrors.length > 0 && (
          <Box sx={{mb: 2}}>
            {validationErrors.map(err => <Typography key={err} color="error">• {err}</Typography>)}
          </Box>
        )}
        <Button 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={validationErrors.length > 0 || isDeadlinePassed || isSaving}
        >
          {isSaving ? <CircularProgress size={24}/> : (existingLineup?.lineup ? 'Aggiorna Formazione' : 'Salva Formazione')}
        </Button>
      </Paper>

      {['MOTOGP', 'MOTO2', 'MOTO3'].map(cat => (
        <RiderCategory 
          key={cat}
          title={cat}
          riders={team.riders.filter((r: any) => r.rider.category === cat)}
          lineup={lineup}
          onToggle={handleToggleRider}
          onPredictionChange={handlePredictionChange}
          isDeadlinePassed={isDeadlinePassed}
        />
      ))}
    </Box>
  );
}