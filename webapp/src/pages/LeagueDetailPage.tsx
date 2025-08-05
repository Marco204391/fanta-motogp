// src/pages/LeagueDetailPage.tsx
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getLeagueDetails } from '../services/api';
import { Box, Typography, CircularProgress, Alert, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export default function LeagueDetailPage() {
    const { leagueId } = useParams<{ leagueId: string }>();
    const { user } = useAuth();

    const { data: leagueData, isLoading, error } = useQuery({
        queryKey: ['leagueDetails', leagueId],
        queryFn: () => getLeagueDetails(leagueId!),
        enabled: !!leagueId,
    });

    if (isLoading) return <CircularProgress />;
    if (error) return <Alert severity="error">Impossibile caricare i dettagli della lega.</Alert>;

    const { league } = leagueData || {};
    if (!league) return <Alert severity="info">Lega non trovata.</Alert>;

    const sortedStandings = [...(league.standings || [])].sort((a, b) => a.totalPoints - b.totalPoints);
    const userHasTeam = league.teams.some((team: any) => team.userId === user?.id);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Typography variant="h4" gutterBottom>{league.name}</Typography>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        Codice: {league.code} | Partecipanti: {league.teams.length}/{league.maxTeams}
                    </Typography>
                </div>
                {!userHasTeam && (
                    <Button 
                        variant="contained" 
                        component={RouterLink} 
                        to={`/leagues/${leagueId}/create-team`}
                    >
                        Crea il tuo Team
                    </Button>
                )}
            </Box>

            <Card sx={{ mt: 4 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Classifica</Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Pos.</TableCell>
                                    <TableCell>Team</TableCell>
                                    <TableCell>Utente</TableCell>
                                    <TableCell align="right">Punti</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedStandings.map((team: any, index: number) => (
                                    <TableRow key={team.teamId} sx={{ backgroundColor: team.userId === user?.id ? 'action.hover' : 'inherit' }}>
                                        <TableCell component="th" scope="row">{index + 1}</TableCell>
                                        <TableCell>{team.teamName}</TableCell>
                                        <TableCell>{team.username}</TableCell>
                                        <TableCell align="right">{team.totalPoints}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
}