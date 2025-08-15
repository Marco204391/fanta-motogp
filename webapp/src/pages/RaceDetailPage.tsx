// webapp/src/pages/RaceDetailPage.tsx
import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRaceById, getRaceResults, getQualifyingResults } from '../services/api';
import {
  Box, Typography, CircularProgress, Alert, Card, ListItemText,
  Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Avatar, Chip, Stack, ToggleButtonGroup,
  ToggleButton, Grid, List, ListItem, ListItemAvatar, Divider,
  useTheme, useMediaQuery, Collapse, IconButton
} from '@mui/material';
import { EmojiEvents, ExpandMore, ExpandLess } from '@mui/icons-material';
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
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

function MobileResultCard({ result, index, selectedSession }: { 
  result: RaceResult; 
  index: number;
  selectedSession: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPodium = result.position <= 3;
  const isDNF = result.status !== 'FINISHED';
  
  const formatBestLap = (bestLap: any) => {
    if (!bestLap) return '-';
    if (typeof bestLap === 'string') return bestLap;
    if (bestLap.time) {
      return bestLap.number ? `${bestLap.time} (Giro ${bestLap.number})` : bestLap.time;
    }
    return '-';
  };

  const getTimeDisplay = () => {
    if (selectedSession === 'fp1' || selectedSession === 'fp2' || selectedSession === 'pr' || selectedSession === 'qualifying') {
      return formatBestLap(result.bestLap);
    }
    return result.time || result.gap || '-';
  };

  return (
    <Card 
      sx={{ 
        mb: 1,
        borderLeft: isPodium ? 4 : 0,
        borderColor: isPodium ? 
          (result.position === 1 ? '#FFD700' : result.position === 2 ? '#C0C0C0' : '#CD7F32') 
          : 'transparent',
        backgroundColor: isDNF ? 'rgba(255, 0, 0, 0.05)' : 'inherit'
      }}
    >
      <Box 
        sx={{ 
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Posizione */}
        <Box 
          sx={{ 
            minWidth: 40,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {isPodium && (
            <EmojiEvents 
              sx={{ 
                fontSize: 20,
                color: result.position === 1 ? '#FFD700' : 
                       result.position === 2 ? '#C0C0C0' : '#CD7F32'
              }}
            />
          )}
          <Typography 
            variant={isPodium ? "h6" : "body1"}
            fontWeight={isPodium ? "bold" : "medium"}
            color={isDNF ? "error" : "text.primary"}
          >
            {isDNF ? 'DNF' : result.position}
          </Typography>
        </Box>

        {/* Numero e Nome */}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body1" fontWeight="medium">
            #{result.rider.number} {result.rider.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {result.rider.team}
          </Typography>
        </Box>

        {/* Punti/Tempo */}
        <Box sx={{ textAlign: 'right', mr: 1 }}>
          {(selectedSession === 'race' || selectedSession === 'sprint') ? (
            <>
              <Typography variant="h6" fontWeight="bold" color="primary">
                {result.points || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                punti
              </Typography>
            </>
          ) : (
            <Typography variant="body2" fontWeight="medium">
              {getTimeDisplay()}
            </Typography>
          )}
        </Box>

        {/* Expand Icon */}
        <IconButton size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* Dettagli Espansi */}
      <Collapse in={expanded}>
        <Divider />
        <Box sx={{ p: 1.5, backgroundColor: 'action.hover' }}>
          <Grid container spacing={1}>
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary">
                Tempo/Gap
              </Typography>
              <Typography variant="body2">
                {getTimeDisplay()}
              </Typography>
            </Grid>
            {result.bestLap && (
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">
                  Giro Veloce
                </Typography>
                <Typography variant="body2">
                  {formatBestLap(result.bestLap)}
                </Typography>
              </Grid>
            )}
            {result.totalLaps && (
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary">
                  Giri Completati
                </Typography>
                <Typography variant="body2">
                  {result.totalLaps}
                </Typography>
              </Grid>
            )}
            <Grid size={6}>
              <Typography variant="caption" color="text.secondary">
                Status
              </Typography>
              <Typography variant="body2" color={isDNF ? "error" : "success.main"}>
                {result.status}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Card>
  );
}

export default function RaceDetailPage() {
  const { raceId } = useParams<{ raceId: string }>();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
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
    if (typeof bestLap === 'string') return bestLap;
    if (bestLap.time) {
      return bestLap.number ? `${bestLap.time} (Giro ${bestLap.number})` : bestLap.time;
    }
    return '-';
  };

  // Funzione per mostrare il tempo nelle sessioni di prove/qualifiche
  const getTimeDisplay = (result: RaceResult) => {
    if (selectedSession === 'fp1' || selectedSession === 'fp2' || selectedSession === 'pr' || selectedSession === 'qualifying') {
      return formatBestLap(result.bestLap);
    }
    return result.time || result.gap || '-';
  };

  return (
    <Box className="fade-in" sx={{ pb: 2 }}>
      {/* Header - Responsive */}
      <Paper 
        sx={{ 
          p: isMobile ? 2 : 4, 
          mb: isMobile ? 2 : 4,
          background: `linear-gradient(135deg, rgba(230,0,35,0.8), rgba(20,20,20,0.9))`,
          color: 'white',
        }}
      >
        <Stack 
          direction={isMobile ? "column" : "row"} 
          justifyContent="space-between" 
          alignItems={isMobile ? "flex-start" : "flex-start"}
          spacing={2}
        >
          <Box>
            <Typography 
              variant="overline" 
              sx={{ 
                opacity: 0.8,
                fontSize: isMobile ? '0.7rem' : '0.75rem'
              }}
            >
              Round {race.round} - {race.season}
            </Typography>
            <Typography 
              variant={isMobile ? "h4" : "h3"} 
              gutterBottom
              sx={{ fontSize: isMobile ? '1.75rem' : '3rem' }}
            >
              {race.name}
            </Typography>
            <Typography 
              variant={isMobile ? "h6" : "h5"} 
              sx={{ 
                opacity: 0.9,
                fontSize: isMobile ? '1rem' : '1.5rem'
              }}
            >
              {race.circuit}
            </Typography>
            <Stack 
              direction={isMobile ? "column" : "row"} 
              spacing={1} 
              sx={{ mt: 2 }}
            >
              <Chip 
                label={format(new Date(race.gpDate), 'dd MMMM yyyy', { locale: it })}
                size={isMobile ? "small" : "medium"}
                sx={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  width: isMobile ? 'fit-content' : 'auto'
                }}
              />
              {race.status === 'FINISHED' && (
                <Chip 
                  label="Completata"
                  color="success"
                  size={isMobile ? "small" : "medium"}
                />
              )}
            </Stack>
          </Box>
          {!isMobile && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h1" sx={{ fontSize: 120, opacity: 0.2 }}>
                {race.round}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Tabs */}
      <Card>
        <Tabs 
          value={tabValue} 
          onChange={(_, v) => setTabValue(v)}
          variant={isMobile ? "fullWidth" : "standard"}
          scrollButtons={isMobile ? false : "auto"}
        >
          <Tab label="Risultati" />
          <Tab label="Info Gara" />
          <Tab label="Statistiche" />
        </Tabs>

        {/* Tab Risultati - Responsive */}
        <TabPanel value={tabValue} index={0}>
          {hasResults ? (
            <>
              {/* Selettore Sessione - Responsive */}
              <Box sx={{ mb: 3 }}>
                <Typography 
                  variant="subtitle2" 
                  gutterBottom
                  sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}
                >
                  Seleziona Sessione
                </Typography>
                <Box 
                  sx={{ 
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: isMobile ? 'center' : 'flex-start'
                  }}
                >
                  <ToggleButtonGroup
                    value={selectedSession}
                    exclusive
                    onChange={(_, value) => value && setSelectedSession(value)}
                    size={isMobile ? "small" : "medium"}
                  >
                    <ToggleButton value="race">
                      <Typography variant={isMobile ? "caption" : "body2"}>
                        Gara
                      </Typography>
                    </ToggleButton>
                    {hasSprint && (
                      <ToggleButton value="sprint">
                        <Typography variant={isMobile ? "caption" : "body2"}>
                          Sprint
                        </Typography>
                      </ToggleButton>
                    )}
                    <ToggleButton value="qualifying">
                      <Typography variant={isMobile ? "caption" : "body2"}>
                        Qualifiche
                      </Typography>
                    </ToggleButton>
                    <ToggleButton value="fp1">
                      <Typography variant={isMobile ? "caption" : "body2"}>
                        FP1
                      </Typography>
                    </ToggleButton>
                    <ToggleButton value="fp2">
                      <Typography variant={isMobile ? "caption" : "body2"}>
                        FP2
                      </Typography>
                    </ToggleButton>
                    <ToggleButton value="pr">
                      <Typography variant={isMobile ? "caption" : "body2"}>
                        PR
                      </Typography>
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>

              {/* Selettore Categoria - Responsive */}
              <Box sx={{ mb: 3 }}>
                <Typography 
                  variant="subtitle2" 
                  gutterBottom
                  sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}
                >
                  Categoria
                </Typography>
                <ToggleButtonGroup
                  value={selectedCategory}
                  exclusive
                  onChange={(_, value) => value && setSelectedCategory(value)}
                  fullWidth={isMobile}
                  size={isMobile ? "small" : "medium"}
                >
                  {['MOTOGP', 'MOTO2', 'MOTO3'].map(cat => (
                    <ToggleButton key={cat} value={cat}>
                      <Chip
                        label={cat}
                        size="small"
                        sx={{
                          backgroundColor: categoryColors[cat as keyof typeof categoryColors],
                          color: 'white',
                          fontSize: isMobile ? '0.7rem' : '0.75rem'
                        }}
                      />
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {/* Risultati - Layout Responsive */}
              {loadingResults ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : categoryResults.length > 0 ? (
                isMobile ? (
                  // Layout Mobile - Cards
                  <Box>
                    {categoryResults.map((result: RaceResult, index: number) => (
                      <MobileResultCard 
                        key={`${result.rider.id}-${index}`} 
                        result={result} 
                        index={index}
                        selectedSession={selectedSession}
                      />
                    ))}
                  </Box>
                ) : (
                  // Layout Desktop - Tabella
                  <TableContainer component={Paper} elevation={0}>
                    <Table size={isTablet ? "small" : "medium"}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Pos</TableCell>
                          <TableCell>Pilota</TableCell>
                          <TableCell>Team</TableCell>
                          <TableCell align="right">
                            {(selectedSession === 'race' || selectedSession === 'sprint') ? 'Punti' : 'Tempo'}
                          </TableCell>
                          {(selectedSession === 'race' || selectedSession === 'sprint') && (
                            <TableCell align="right">Gap</TableCell>
                          )}
                          <TableCell align="right">Giro Veloce</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categoryResults.map((result: RaceResult, index: number) => {
                          const isPodium = result.position <= 3;
                          const isDNF = result.status !== 'FINISHED';
                          
                          return (
                            <TableRow 
                              key={`${result.rider.id}-${index}`}
                              sx={{
                                backgroundColor: isPodium ? 
                                  `${result.position === 1 ? '#FFD700' : 
                                     result.position === 2 ? '#C0C0C0' : '#CD7F32'}22` 
                                  : 'inherit',
                                '&:hover': { backgroundColor: 'action.hover' }
                              }}
                            >
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  {isPodium && (
                                    <EmojiEvents sx={{ 
                                      fontSize: 20,
                                      color: result.position === 1 ? '#FFD700' : 
                                             result.position === 2 ? '#C0C0C0' : '#CD7F32'
                                    }}/>
                                  )}
                                  <Typography 
                                    fontWeight={isPodium ? 'bold' : 'normal'}
                                    color={isDNF ? 'error' : 'inherit'}
                                  >
                                    {isDNF ? result.status : result.position}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <Avatar 
                                    sx={{ 
                                      width: 28, 
                                      height: 28, 
                                      fontSize: '0.875rem',
                                      bgcolor: 'primary.main' 
                                    }}
                                  >
                                    {result.rider.number}
                                  </Avatar>
                                  <Typography fontWeight="medium">
                                    {result.rider.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {result.rider.team}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                {(selectedSession === 'race' || selectedSession === 'sprint') ? (
                                  <Typography fontWeight="bold" color="primary">
                                    {result.points || 0}
                                  </Typography>
                                ) : (
                                  <Typography>
                                    {getTimeDisplay(result)}
                                  </Typography>
                                )}
                              </TableCell>
                              {(selectedSession === 'race' || selectedSession === 'sprint') && (
                                <TableCell align="right">
                                  {result.gap || result.time || '-'}
                                </TableCell>
                              )}
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {formatBestLap(result.bestLap)}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )
              ) : (
                <Alert severity="info">
                  Nessun risultato disponibile per {
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

        {/* Tab Info Gara - Responsive */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={isMobile ? 2 : 3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography 
                variant={isMobile ? "subtitle1" : "h6"} 
                gutterBottom
              >
                Dettagli Circuito
              </Typography>
              <List dense={isMobile}>
                <ListItem>
                  <ListItemText 
                    primary="Circuito" 
                    secondary={race.circuit}
                    primaryTypographyProps={{ 
                      fontSize: isMobile ? '0.875rem' : '1rem' 
                    }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Paese" 
                    secondary={race.country}
                    primaryTypographyProps={{ 
                      fontSize: isMobile ? '0.875rem' : '1rem' 
                    }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Data GP" 
                    secondary={format(new Date(race.gpDate), 'dd MMMM yyyy', { locale: it })}
                    primaryTypographyProps={{ 
                      fontSize: isMobile ? '0.875rem' : '1rem' 
                    }}
                  />
                </ListItem>
                {race.sprintDate && (
                  <ListItem>
                    <ListItemText 
                      primary="Data Sprint" 
                      secondary={format(new Date(race.sprintDate), 'dd MMMM yyyy', { locale: it })}
                      primaryTypographyProps={{ 
                        fontSize: isMobile ? '0.875rem' : '1rem' 
                      }}
                    />
                  </ListItem>
                )}
              </List>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography 
                variant={isMobile ? "subtitle1" : "h6"} 
                gutterBottom
              >
                Programma Weekend
              </Typography>
              <List dense={isMobile}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        bgcolor: 'primary.main',
                        width: isMobile ? 32 : 40,
                        height: isMobile ? 32 : 40,
                        fontSize: isMobile ? '0.75rem' : '1rem'
                      }}
                    >
                      FP1
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Prove Libere 1" 
                    secondary="Venerdì mattina"
                    primaryTypographyProps={{ 
                      fontSize: isMobile ? '0.875rem' : '1rem' 
                    }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        bgcolor: 'primary.main',
                        width: isMobile ? 32 : 40,
                        height: isMobile ? 32 : 40,
                        fontSize: isMobile ? '0.75rem' : '1rem'
                      }}
                    >
                      FP2
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Prove Libere 2" 
                    secondary="Venerdì pomeriggio"
                    primaryTypographyProps={{ 
                      fontSize: isMobile ? '0.875rem' : '1rem' 
                    }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        bgcolor: 'secondary.main',
                        width: isMobile ? 32 : 40,
                        height: isMobile ? 32 : 40,
                        fontSize: isMobile ? '0.75rem' : '1rem'
                      }}
                    >
                      Q
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary="Qualifiche" 
                    secondary="Sabato pomeriggio"
                    primaryTypographyProps={{ 
                      fontSize: isMobile ? '0.875rem' : '1rem' 
                    }}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Tab Statistiche */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="body1" color="text.secondary">
            Statistiche della gara in arrivo...
          </Typography>
        </TabPanel>
      </Card>
    </Box>
  );
}