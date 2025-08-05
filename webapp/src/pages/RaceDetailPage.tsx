import React, { useState } from 'react';
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
  EmojiEvents, Timer, Speed, Flag, 
  CheckCircle, Cancel, RemoveCircle 
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
}

const categoryColors = {
  MOTOGP: '#E60023',
  MOTO2: '#FF6B00', 
  MOTO3: '#1976D2',
};

const statusIcons = {
  FINISHED: <CheckCircle color="success" />,
  DNF: <Cancel color="error" />,
  DNS: <RemoveCircle color="warning" />,
  DSQ: <Flag color="error" />,
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
  const [selectedSession, setSelectedSession] = useState<'race' | 'sprint' | 'qualifying'>('race');

  const { data: raceData, isLoading: loadingRace } = useQuery({
    queryKey: ['raceDetails', raceId],
    queryFn: () => getRaceById(raceId!),
    enabled: !!raceId,
  });

  const { data: resultsData, isLoading: loadingResults } = useQuery({
    queryKey: ['raceResults', raceId, selectedSession],
    queryFn: () => {
      if (selectedSession === 'qualifying') {
        return getQualifyingResults(raceId!);
      }
      return getRaceResults(raceId!, selectedSession);
    },
    enabled: !!raceId && !!raceData,
  });

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
  const results = resultsData?.results || {};
  const categoryResults = results[selectedCategory] || [];
  const hasResults = Object.keys(results).length > 0;

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
              {/* Selettori */}
              <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <ToggleButtonGroup
                  value={selectedSession}
                  exclusive
                  onChange={(_, value) => value && setSelectedSession(value)}
                >
                  <ToggleButton value="race">
                    <Timer sx={{ mr: 1 }} /> Gara
                  </ToggleButton>
                  {race.sprintDate && (
                    <ToggleButton value="sprint">
                      <Speed sx={{ mr: 1 }} /> Sprint
                    </ToggleButton>
                  )}
                  <ToggleButton value="qualifying">
                    <Flag sx={{ mr: 1 }} /> Qualifiche
                  </ToggleButton>
                </ToggleButtonGroup>

                <ToggleButtonGroup
                  value={selectedCategory}
                  exclusive
                  onChange={(_, value) => value && setSelectedCategory(value)}
                >
                  <ToggleButton value="MOTOGP">MotoGP</ToggleButton>
                  <ToggleButton value="MOTO2">Moto2</ToggleButton>
                  <ToggleButton value="MOTO3">Moto3</ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              {/* Tabella Risultati */}
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Pos</TableCell>
                      <TableCell>Pilota</TableCell>
                      <TableCell>Team</TableCell>
                      <TableCell>Tempo/Gap</TableCell>
                      <TableCell align="center">Punti</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryResults.map((result: RaceResult, index: number) => (
                      <TableRow 
                        key={`${result.rider.id}-${index}`}
                        sx={{ 
                          backgroundColor: index < 3 ? `${categoryColors[selectedCategory]}22` : 'transparent',
                        }}
                      >
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {result.position <= 3 && (
                              <EmojiEvents sx={{ 
                                color: getPodiumColor(result.position),
                                fontSize: 20,
                              }} />
                            )}
                            <Typography fontWeight="bold">
                              {result.position || '-'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar 
                              sx={{ 
                                width: 32, 
                                height: 32,
                                bgcolor: categoryColors[selectedCategory],
                                fontSize: 14,
                              }}
                            >
                              {result.rider.number}
                            </Avatar>
                            <Typography>{result.rider.name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{result.rider.team}</TableCell>
                        <TableCell>{result.gap || result.time || '-'}</TableCell>
                        <TableCell align="center">
                          {result.points !== undefined ? (
                            <Chip 
                              label={result.points} 
                              size="small"
                              color={result.points > 0 ? 'primary' : 'default'}
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell align="center">
                          {statusIcons[result.status as keyof typeof statusIcons] || result.status}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : (
            <Alert severity="info">
              I risultati di questa gara non sono ancora disponibili
            </Alert>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
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
                      <Avatar sx={{ bgcolor: 'warning.main' }}>SP</Avatar>
                    </ListItemAvatar>
                    <ListItemText primary="Sprint Race" secondary="Sabato" />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>GP</Avatar>
                  </ListItemAvatar>
                  <ListItemText primary="Gran Premio" secondary="Domenica" />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Statistiche Gara</Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Le statistiche dettagliate saranno disponibili dopo la gara
          </Alert>
        </TabPanel>
      </Card>
    </Box>
  );
}

function getPodiumColor(position: number): string {
  switch (position) {
    case 1: return '#FFD700';
    case 2: return '#C0C0C0';
    case 3: return '#CD7F32';
    default: return 'text.secondary';
  }
}