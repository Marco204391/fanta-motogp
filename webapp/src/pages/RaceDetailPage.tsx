// webapp/src/pages/RaceDetailPage.tsx
import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRaceById, getRaceResults, getQualifyingResults } from '../services/api';
import {
  Box, Typography, CircularProgress, Alert, Card, CardContent,
  Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Chip, Stack, ToggleButtonGroup,
  ToggleButton, Grid, List, ListItem, ListItemAvatar, ListItemText,
  Divider
} from '@mui/material';
import { 
  EmojiEvents, Timer, Speed, Flag
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface RaceResult {
  rider: { 
    id: string;
    name: string; 
    number: number; 
    team: string;
    category: string;
  };
  position: number;
  status: string;
  points?: number;
  time?: string;
  gap?: string;
  totalLaps?: number;
  bestLap?: { 
    time: string;
    number?: number;
  };
}

const categoryColors = {
  MOTOGP: '#E60023',
  MOTO2: '#FF6B00', 
  MOTO3: '#1976D2',
};

function TabPanel(props: any) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function RaceDetailPage() {
  const { raceId } = useParams<{ raceId: string }>();
  const [tabValue, setTabValue] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<'MOTOGP' | 'MOTO2' | 'MOTO3'>('MOTOGP');
  const [selectedSession, setSelectedSession] = useState<'race' | 'sprint' | 'qualifying' | 'fp1' | 'fp2' | 'pr'>('race');

  const { data: raceData, isLoading: loadingRace } = useQuery({
    queryKey: ['raceDetails', raceId],
    queryFn: () => getRaceById(raceId!),
    enabled: !!raceId,
  });

  // Query per risultati gara e sprint
  const { data: raceResultsData, isLoading: loadingRaceResults } = useQuery({
    queryKey: ['raceResults', raceId],
    queryFn: () => getRaceResults(raceId!),
    enabled: !!raceId && !!raceData,
  });

  // Query per risultati qualifiche
  const { data: qualifyingData, isLoading: loadingQualifying } = useQuery({
    queryKey: ['qualifyingResults', raceId],
    queryFn: () => getQualifyingResults(raceId!),
    enabled: !!raceId && !!raceData && selectedSession === 'qualifying',
  });

  // Query per risultati prove libere
  const { data: practiceData, isLoading: loadingPractice } = useQuery({
    queryKey: ['practiceResults', raceId, selectedSession],
    queryFn: () => getRaceResults(raceId!, selectedSession as 'fp1' | 'fp2' | 'pr'),
    enabled: !!raceId && !!raceData && (selectedSession === 'fp1' || selectedSession === 'fp2' || selectedSession === 'pr'),
  });

  // Calcola i risultati da mostrare basandosi sulla sessione e categoria selezionate
  const categoryResults = useMemo(() => {
    if (selectedSession === 'qualifying') {
      return qualifyingData?.results?.[selectedCategory] || [];
    }
    
    if (selectedSession === 'fp1' || selectedSession === 'fp2' || selectedSession === 'pr') {
      const sessionKey = selectedSession.toUpperCase() as 'FP1' | 'FP2' | 'PR';
      return practiceData?.results?.[sessionKey]?.[selectedCategory] || [];
    }
    
    const sessionKey = selectedSession.toUpperCase() as 'RACE' | 'SPRINT';
    const sessionResults = raceResultsData?.results?.[sessionKey];
    return sessionResults?.[selectedCategory] || [];
  }, [selectedSession, selectedCategory, raceResultsData, qualifyingData, practiceData]);

  const loadingResults = selectedSession === 'qualifying' ? loadingQualifying : 
                         (selectedSession === 'fp1' || selectedSession === 'fp2' || selectedSession === 'pr') ? loadingPractice :
                         loadingRaceResults;

  if (loadingRace) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!raceData) {
    return <Alert severity="error">Gara non trovata</Alert>;
  }

  const race = raceData.race;
  const hasResults = raceResultsData?.results && Object.keys(raceResultsData.results).length > 0;
  const hasSprint = raceResultsData?.results?.SPRINT && Object.keys(raceResultsData.results.SPRINT).length > 0;

  // Funzione per formattare il tempo migliore
  const formatBestLap = (bestLap: any) => {
    if (!bestLap) return '-';
    if (typeof bestLap === 'string') return bestLap; // Per compatibilità con vecchio formato
    if (bestLap.time) {
      return bestLap.number ? `${bestLap.time} (Giro ${bestLap.number})` : bestLap.time;
    }
    return '-';
  };

  // Funzione per mostrare il tempo nelle sessioni di prove/qualifiche
  const getTimeDisplay = (result: RaceResult) => {
    // Per FP1, FP2, PR e Qualifiche mostriamo il bestLap
    if (selectedSession === 'fp1' || selectedSession === 'fp2' || selectedSession === 'pr' || selectedSession === 'qualifying') {
      return formatBestLap(result.bestLap);
    }
    // Per gara e sprint mostriamo time o gap
    return result.time || result.gap || '-';
  };

  return (
    <Box className="fade-in">
      {/* Header */}
      <Paper 
        sx={{ 
          p: 4, 
          mb: 4,
          background: `linear-gradient(135deg, rgba(230,0,35,0.8), rgba(20,20,20,0.9)), url('/race-bg.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="overline" sx={{ opacity: 0.8 }}>
              Round {race.round} - {race.season}
            </Typography>
            <Typography variant="h3" gutterBottom>
              {race.name}
            </Typography>
            <Typography variant="h5" sx={{ opacity: 0.9 }}>
              {race.circuit}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Chip 
                label={format(new Date(race.gpDate), 'dd MMMM yyyy', { locale: it })}
                sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
              {race.status === 'FINISHED' && (
                <Chip 
                  label="Completata"
                  color="success"
                />
              )}
            </Stack>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h1" sx={{ fontSize: 120, opacity: 0.2 }}>
              {race.round}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Risultati" />
          <Tab label="Informazioni Gara" />
          <Tab label="Statistiche" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {hasResults ? (
            <>
              {/* Selettori Sessione e Categoria */}
              <Stack spacing={3} sx={{ mb: 3 }}>
                {/* Selettore Sessione */}
                <ToggleButtonGroup
                  value={selectedSession}
                  exclusive
                  onChange={(_, value) => value && setSelectedSession(value)}
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
                >
                  <ToggleButton value="fp1" sx={{ flex: 1, minWidth: '100px' }}>
                    FP1
                  </ToggleButton>
                  <ToggleButton value="fp2" sx={{ flex: 1, minWidth: '100px' }}>
                    FP2
                  </ToggleButton>
                  <ToggleButton value="pr" sx={{ flex: 1, minWidth: '100px' }}>
                    PR
                  </ToggleButton>
                  <ToggleButton value="qualifying" sx={{ flex: 1, minWidth: '100px' }}>
                    Qualifiche
                  </ToggleButton>
                  {hasSprint && (
                    <ToggleButton value="sprint" sx={{ flex: 1, minWidth: '100px' }}>
                      Sprint
                    </ToggleButton>
                  )}
                  <ToggleButton value="race" sx={{ flex: 1, minWidth: '100px' }}>
                    Gara
                  </ToggleButton>
                </ToggleButtonGroup>

                {/* Selettore Categoria */}
                <ToggleButtonGroup
                  value={selectedCategory}
                  exclusive
                  onChange={(_, value) => value && setSelectedCategory(value)}
                  fullWidth
                >
                  <ToggleButton value="MOTOGP" sx={{ color: categoryColors.MOTOGP }}>
                    MotoGP
                  </ToggleButton>
                  <ToggleButton value="MOTO2" sx={{ color: categoryColors.MOTO2 }}>
                    Moto2
                  </ToggleButton>
                  <ToggleButton value="MOTO3" sx={{ color: categoryColors.MOTO3 }}>
                    Moto3
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              {/* Tabella Risultati */}
              {loadingResults ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : categoryResults.length > 0 ? (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Pos</TableCell>
                        <TableCell>Pilota</TableCell>
                        <TableCell>Team</TableCell>
                        <TableCell>Tempo</TableCell>
                        {(selectedSession === 'race' || selectedSession === 'sprint') && (
                          <>
                            <TableCell>Giri</TableCell>
                            <TableCell>Punti</TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categoryResults.map((result: RaceResult) => (
                        <TableRow key={result.rider.id}>
                          <TableCell>
                            {result.position <= 3 && (selectedSession === 'race' || selectedSession === 'sprint') ? (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <EmojiEvents 
                                  sx={{ 
                                    color: result.position === 1 ? '#FFD700' : 
                                           result.position === 2 ? '#C0C0C0' : 
                                           '#CD7F32',
                                    fontSize: 20 
                                  }} 
                                />
                                <Typography>{result.position}</Typography>
                              </Stack>
                            ) : result.status !== 'FINISHED' ? (
                              <Chip 
                                label={result.status} 
                                size="small" 
                                color="error" 
                                variant="outlined" 
                              />
                            ) : (
                              result.position
                            )}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ width: 24, height: 24, bgcolor: categoryColors[selectedCategory] }}>
                                {result.rider.number}
                              </Avatar>
                              <Typography>{result.rider.name}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{result.rider.team}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {getTimeDisplay(result)}
                            </Typography>
                          </TableCell>
                          {(selectedSession === 'race' || selectedSession === 'sprint') && (
                            <>
                              <TableCell>{result.totalLaps || '-'}</TableCell>
                              <TableCell>
                                {result.points ? (
                                  <Chip 
                                    label={`+${result.points}`} 
                                    size="small" 
                                    color={result.position === 1 ? 'primary' : 'default'}
                                  />
                                ) : '-'}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  Nessun risultato disponibile per {selectedCategory} - {
                    selectedSession === 'qualifying' ? 'Qualifiche' : 
                    selectedSession === 'sprint' ? 'Sprint' : 
                    selectedSession === 'fp1' ? 'Prove Libere 1' :
                    selectedSession === 'fp2' ? 'Prove Libere 2' :
                    selectedSession === 'pr' ? 'Prequalifiche' : 'Gara'
                  }
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="info">
              I risultati di questa gara non sono ancora disponibili
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6}}>
              <Typography variant="h6" gutterBottom>Dettagli Circuito</Typography>
              <List>
                <ListItem>
                  <ListItemText primary="Circuito" secondary={race.circuit} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Paese" secondary={race.country} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Data GP" secondary={format(new Date(race.gpDate), 'dd MMMM yyyy', { locale: it })} />
                </ListItem>
                {race.sprintDate && (
                  <ListItem>
                    <ListItemText primary="Data Sprint" secondary={format(new Date(race.sprintDate), 'dd MMMM yyyy', { locale: it })} />
                  </ListItem>
                )}
              </List>
            </Grid>
            <Grid size={{ xs: 12, md: 6}}>
              <Typography variant="h6" gutterBottom>Programma Weekend</Typography>
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>FP1</Avatar>
                  </ListItemAvatar>
                  <ListItemText primary="Prove Libere 1" secondary="Venerdì mattina" />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>FP2</Avatar>
                  </ListItemAvatar>
                  <ListItemText primary="Prove Libere 2" secondary="Venerdì pomeriggio" />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>Q</Avatar>
                  </ListItemAvatar>
                  <ListItemText primary="Qualifiche" secondary="Sabato pomeriggio" />
                </ListItem>
                {race.sprintDate && (
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'warning.main' }}>SPR</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary="Sprint Race" secondary="Sabato" />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'error.main' }}>GP</Avatar>
                  </ListItemAvatar>
                  <ListItemText primary="Gara" secondary="Domenica" />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Statistiche Gara</Typography>
          <Alert severity="info">
            Le statistiche dettagliate saranno disponibili dopo la gara
          </Alert>
        </TabPanel>
      </Card>
    </Box>
  );
}