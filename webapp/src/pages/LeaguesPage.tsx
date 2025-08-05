// src/pages/LeaguesPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyLeagues, getPublicLeagues } from '../services/api';
import { Box, Typography, CircularProgress, Alert, Card, CardContent, Button, Tabs, Tab, TextField, Grid } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

function LeagueList({ leagues, title }: { leagues: any[], title: string }) {
    if (!leagues || leagues.length === 0) {
        return <Typography sx={{mt: 2}}>Nessuna lega trovata in questa categoria.</Typography>
    }

    return (
        <Box sx={{mt: 2}}>
            <Typography variant="h6">{title}</Typography>
            <Grid container spacing={2} sx={{mt: 1}}>
                {leagues.map((league) => (
                    <Grid item xs={12} sm={6} md={4} key={league.id}>
                        <Card>
                            <CardContent>
                                <Typography variant="h5" component="div">{league.name}</Typography>
                                <Typography sx={{ mb: 1.5 }} color="text.secondary">
                                    {league.isPrivate ? 'Privata' : 'Pubblica'} - {league.currentTeams}/{league.maxTeams} Team
                                </Typography>
                                <Button component={RouterLink} to={`/leagues/${league.id}`} size="small">Vedi Dettagli</Button>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    )
}

export default function LeaguesPage() {
    const [tab, setTab] = useState(0);

    const { data: myLeaguesData, isLoading: isLoadingMyLeagues } = useQuery({
        queryKey: ['myLeagues'],
        queryFn: getMyLeagues,
        enabled: tab === 0,
    });

    const { data: publicLeaguesData, isLoading: isLoadingPublicLeagues } = useQuery({
        queryKey: ['publicLeagues'],
        queryFn: getPublicLeagues,
        enabled: tab === 1,
    });

    const isLoading = isLoadingMyLeagues || isLoadingPublicLeagues;

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Leghe</Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)}>
                    <Tab label="Le mie Leghe" />
                    <Tab label="Leghe Pubbliche" />
                </Tabs>
            </Box>
            {isLoading && <CircularProgress sx={{mt: 3}}/>}
            
            {tab === 0 && !isLoadingMyLeagues && (
                <LeagueList leagues={myLeaguesData?.leagues} title="Leghe a cui partecipi" />
            )}

            {tab === 1 && !isLoadingPublicLeagues && (
                <LeagueList leagues={publicLeaguesData?.leagues} title="Unisciti a una lega pubblica" />
            )}
        </Box>
    );
}