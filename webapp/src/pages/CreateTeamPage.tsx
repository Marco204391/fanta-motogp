// src/pages/CreateTeamPage.tsx
import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeagueDetails, getRiders, createTeam } from '../services/api';
import {
  Box, Typography, CircularProgress, Alert, Card, CardContent, TextField,
  FormGroup, FormControlLabel, Checkbox, Grid, Button, Paper, List, ListItem, ListItemText, Divider
} from '@mui/material';

// Interfaccia per un pilota
interface Rider {
  id: string;
  name: string;
  category: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  value: number;
  riderType: string;
  team: string;
}

// Componente per visualizzare un gruppo di piloti (es. MotoGP)
function RiderCategory({ title, riders, selectedRiders, onToggle, budget, totalCost, maxPerCategory, takenRiderIds }: any) {
  const selectedCount = riders.filter((r: Rider) => selectedRiders.includes(r.id)).length;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" color={selectedCount === maxPerCategory ? 'green' : 'inherit'}>
          {title} ({selectedCount}/{maxPerCategory})
        </Typography>
        <FormGroup>
          {riders.map((rider: Rider) => {
            const isSelected = selectedRiders.includes(rider.id);
            const isTaken = takenRiderIds.has(rider.id);
            const isDisabled = isTaken || (!isSelected && (selectedCount >= maxPerCategory || totalCost + rider.value > budget));

            return (
              <FormControlLabel
                key={rider.id}
                control={<Checkbox checked={isSelected} onChange={() => onToggle(rider)} />}
                label={`${rider.name} (${rider.value} crediti) - ${rider.team}`}
                disabled={isDisabled}
              />
            );
          })}
        </FormGroup>
      </CardContent>
    </Card>
  );
}

export default function CreateTeamPage() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [teamName, setTeamName] = useState('');
  const [selectedRiders, setSelectedRiders] = useState<string[]>([]);

  const { data: leagueData, isLoading: isLoadingLeague } = useQuery({
    queryKey: ['leagueDetails', leagueId],
    queryFn: () => getLeagueDetails(leagueId!),
  });

  const { data: ridersData, isLoading: isLoadingRiders } = useQuery<{ riders: Rider[] }>({
    queryKey: ['allRiders'],
    queryFn: () => getRiders({ limit: 200 }),
  });

  const { mutate: createTeamMutation, isPending: isCreatingTeam } = useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      alert('Team creato con successo!');
      queryClient.invalidateQueries({ queryKey: ['myTeams'] });
      navigate(`/leagues/${leagueId}`);
    },
    onError: (error: any) => {
      alert(`Errore: ${error.response?.data?.error || 'Impossibile creare il team.'}`);
    }
  });

  const { league } = leagueData || {};
  const budget = league?.budget || 1000;
  
  const officialRiders = useMemo(() => ridersData?.riders.filter(r => r.riderType === 'OFFICIAL') || [], [ridersData]);
  const takenRiderIds = useMemo(() => {
    const ids = new Set<string>();
    league?.teams.forEach((team: any) => {
        team.riders.forEach((teamRider: any) => ids.add(teamRider.riderId));
    });
    return ids;
  }, [league]);


  const selectionStats = useMemo(() => {
    const stats = {
      totalCost: 0,
      ridersByCategory: { MOTOGP: 0, MOTO2: 0, MOTO3: 0 },
      validationErrors: [] as string[],
    };
    if (!officialRiders) return stats;

    const selected = officialRiders.filter(r => selectedRiders.includes(r.id));
    selected.forEach(rider => {
      stats.totalCost += rider.value;
      stats.ridersByCategory[rider.category]++;
    });

    if (selectedRiders.length !== 9) stats.validationErrors.push("Devi selezionare 9 piloti.");
    if (stats.ridersByCategory.MOTOGP !== 3) stats.validationErrors.push("Devi selezionare 3 piloti MotoGP.");
    if (stats.ridersByCategory.MOTO2 !== 3) stats.validationErrors.push("Devi selezionare 3 piloti Moto2.");
    if (stats.ridersByCategory.MOTO3 !== 3) stats.validationErrors.push("Devi selezionare 3 piloti Moto3.");
    if (stats.totalCost > budget) stats.validationErrors.push("Budget superato.");
    if (!teamName.trim() || teamName.length < 3) stats.validationErrors.push("Il nome del team deve essere di almeno 3 caratteri.");

    return stats;
  }, [selectedRiders, officialRiders, budget, teamName]);

  const handleToggleRider = (rider: Rider) => {
    setSelectedRiders(prev =>
      prev.includes(rider.id) ? prev.filter(id => id !== rider.id) : [...prev, rider.id]
    );
  };

  const handleSubmit = () => {
    if (selectionStats.validationErrors.length === 0) {
      createTeamMutation({ name: teamName, leagueId: leagueId!, riderIds: selectedRiders });
    } else {
      alert("Controlla gli errori prima di procedere:\n" + selectionStats.validationErrors.join('\n'));
    }
  };

  if (isLoadingLeague || isLoadingRiders) return <CircularProgress />;
  if (!league) return <Alert severity="error">Lega non trovata.</Alert>;

  const { totalCost, validationErrors } = selectionStats;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Crea il tuo Team per "{league.name}"</Typography>
      
      <Paper elevation={3} sx={{ p: 2, mb: 3, position: 'sticky', top: 0, zIndex: 1 }}>
        <Typography variant="h6">Riepilogo</Typography>
        <TextField
          label="Nome del Team"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          fullWidth
          margin="normal"
        />
        <Typography>Budget: {totalCost} / {budget}</Typography>
        {validationErrors.length > 0 && (
          <List dense>
            {validationErrors.map(err => <ListItemText key={err} primary={`• ${err}`} sx={{color: 'red'}}/>)}
          </List>
        )}
        <Button 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={validationErrors.length > 0 || isCreatingTeam}
            sx={{mt: 2}}
        >
            {isCreatingTeam ? <CircularProgress size={24}/> : 'Crea Team'}
        </Button>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <RiderCategory 
            title="MotoGP" 
            riders={officialRiders.filter(r => r.category === 'MOTOGP')}
            selectedRiders={selectedRiders}
            onToggle={handleToggleRider}
            budget={budget} totalCost={totalCost} maxPerCategory={3}
            takenRiderIds={takenRiderIds}
           />
        </Grid>
        <Grid item xs={12} md={4}>
          <RiderCategory 
            title="Moto2" 
            riders={officialRiders.filter(r => r.category === 'MOTO2')}
            selectedRiders={selectedRiders}
            onToggle={handleToggleRider}
            budget={budget} totalCost={totalCost} maxPerCategory={3}
            takenRiderIds={takenRiderIds}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <RiderCategory 
            title="Moto3" 
            riders={officialRiders.filter(r => r.category === 'MOTO3')}
            selectedRiders={selectedRiders}
            onToggle={handleToggleRider}
            budget={budget} totalCost={totalCost} maxPerCategory={3}
            takenRiderIds={takenRiderIds}
          />
        </Grid>
      </Grid>
    </Box>
  );
}