import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getMyStats } from '../services/api';
import {
  Box, Typography, Card, CardContent, Button, Avatar, Grid,
  Paper, Stack, Divider, List, ListItem, ListItemText,
  ListItemIcon, Chip, LinearProgress, Tab, Tabs
} from '@mui/material';
import {
  EmojiEvents, SportsMotorsports, Groups, TrendingUp,
  Star, AccountCircle, Logout, Settings, Timeline
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['myStats'],
    queryFn: getMyStats,
    enabled: !!user,
  });

  if (!user) {
    return null;
  }

  const stats = statsData?.stats || {
    totalTeams: 0,
    totalLeagues: 0,
    totalPoints: 0,
    bestPosition: null,
    recentResults: [],
    achievements: [],
  };

  return (
    <Box className="fade-in">
      {/* Header Profile */}
      <Paper 
        sx={{ 
          p: 4, 
          mb: 4,
          background: 'linear-gradient(135deg, rgba(230,0,35,0.1) 0%, rgba(255,107,0,0.1) 100%)',
          border: '1px solid rgba(230,0,35,0.2)',
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar 
              sx={{ 
                width: 120, 
                height: 120,
                bgcolor: 'primary.main',
                fontSize: 48,
                fontWeight: 700,
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h3" gutterBottom>
              {user.username}
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {user.email}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Chip 
                icon={<Star />} 
                label={`${user.credits || 0} Crediti`}
                color="primary"
              />
              <Chip 
                icon={<Timeline />} 
                label={`Iscritto da ${format(new Date(user.createdAt || Date.now()), 'MMMM yyyy', { locale: it })}`}
                variant="outlined"
              />
            </Stack>
          </Grid>
          <Grid item>
            <Stack spacing={2}>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => alert('Impostazioni in arrivo!')}
              >
                Impostazioni
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Logout />}
                onClick={logout}
              >
                Logout
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistiche Rapide */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <SportsMotorsports sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4">{stats.totalTeams}</Typography>
              <Typography variant="body2" color="text.secondary">Team Totali</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Groups sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h4">{stats.totalLeagues}</Typography>
              <Typography variant="body2" color="text.secondary">Leghe Attive</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h4">{stats.totalPoints}</Typography>
              <Typography variant="body2" color="text.secondary">Punti Totali</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <EmojiEvents sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
              <Typography variant="h4">{stats.bestPosition || '-'}</Typography>
              <Typography variant="body2" color="text.secondary">Miglior Piazzamento</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Dettagli */}
      <Card>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label="Risultati Recenti" />
          <Tab label="Achievements" />
          <Tab label="Statistiche Dettagliate" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <CardContent>
            {stats.recentResults?.length > 0 ? (
              <List>
                {stats.recentResults.map((result: any, index: number) => (
                  <ListItem key={index} divider>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: getPodiumColor(result.position) }}>
                        {result.position}°
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={result.raceName}
                      secondary={`${result.teamName} - ${result.points} punti`}
                    />
                    <Chip
                      label={format(new Date(result.date), 'dd MMM', { locale: it })}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                Nessun risultato recente
              </Typography>
            )}
          </CardContent>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <CardContent>
            {stats.achievements?.length > 0 ? (
              <Grid container spacing={2}>
                {stats.achievements.map((achievement: any, index: number) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        backgroundColor: achievement.unlocked ? 'success.dark' : 'background.default',
                        opacity: achievement.unlocked ? 0.15 : 0.5,
                      }}
                    >
                      <EmojiEvents sx={{ fontSize: 48, mb: 1 }} />
                      <Typography variant="h6">{achievement.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {achievement.description}
                      </Typography>
                      {achievement.progress && (
                        <Box sx={{ mt: 2 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={(achievement.progress / achievement.target) * 100}
                          />
                          <Typography variant="caption">
                            {achievement.progress}/{achievement.target}
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                Nessun achievement disponibile
              </Typography>
            )}
          </CardContent>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Performance per Categoria</Typography>
                <List>
                  {['MotoGP', 'Moto2', 'Moto3'].map(category => (
                    <ListItem key={category}>
                      <ListItemText 
                        primary={category}
                        secondary={`Media punti: ${stats[`avg${category}`] || 0}`}
                      />
                      <LinearProgress 
                        variant="determinate" 
                        value={stats[`performance${category}`] || 0}
                        sx={{ width: 100 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Statistiche Globali</Typography>
                <List>
                  <ListItem>
                    <ListItemText primary="Gare Totali" secondary={stats.totalRaces || 0} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Vittorie" secondary={stats.wins || 0} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Podi" secondary={stats.podiums || 0} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Media Punti/Gara" secondary={stats.avgPointsPerRace || 0} />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </CardContent>
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