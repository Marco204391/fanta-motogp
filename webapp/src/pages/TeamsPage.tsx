// src/pages/TeamsPage.tsx
import { useQuery } from '@tanstack/react-query';
import { getMyTeams } from '../services/api';
import { Box, Typography, CircularProgress, Alert, Grid, Button, Paper, Divider, Card, CardContent } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

function TeamCard({ team }: { team: any }) {
    const ridersByCategory = (category: string) => 
        team.riders.filter((r: any) => r.rider.category === category);

    return (
        <Card sx={{ width: '100%' }}>
            <CardContent>
                <Typography variant="h5">{team.name}</Typography>
                <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                    Lega: {team.league.name}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <Typography variant="h6">MotoGP</Typography>
                        {ridersByCategory('MOTOGP').map((tr: any) => (
                            <Typography key={tr.rider.id}>- {tr.rider.name}</Typography>
                        ))}
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Typography variant="h6">Moto2</Typography>
                        {ridersByCategory('MOTO2').map((tr: any) => (
                            <Typography key={tr.rider.id}>- {tr.rider.name}</Typography>
                        ))}
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Typography variant="h6">Moto3</Typography>
                        {ridersByCategory('MOTO3').map((tr: any) => (
                            <Typography key={tr.rider.id}>- {tr.rider.name}</Typography>
                        ))}
                    </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Typography>Budget Rimanente: 
                        <Typography component="span" sx={{ color: team.remainingBudget >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                            {team.remainingBudget} crediti
                        </Typography>
                    </Typography>
                    <Button 
                        variant="contained" 
                        component={RouterLink} 
                        to={`/teams/${team.id}/lineup`}
                    >
                        {team.hasLineup ? 'Modifica Formazione' : 'Schiera Formazione'}
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}


export default function TeamsPage() {
    const { data: teamsData, isLoading, error } = useQuery({
        queryKey: ['myTeams'],
        queryFn: getMyTeams,
    });

    if (isLoading) return <CircularProgress />;
    if (error) return <Alert severity="error">Impossibile caricare i team.</Alert>;

    const teams = teamsData?.teams || [];

    return (
        <Box>
            <Typography variant="h4" gutterBottom>I Miei Team</Typography>

            {teams.length === 0 ? (
                <Paper sx={{p: 3, textAlign: 'center'}}>
                    <Typography>Non hai ancora creato nessun team.</Typography>
                    <Button component={RouterLink} to="/leagues" variant="contained" sx={{mt: 2}}>
                        Unisciti a una lega per iniziare
                    </Button>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {teams.map((team: any) => (
                        <Grid item xs={12} key={team.id}>
                            <TeamCard team={team} />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
}