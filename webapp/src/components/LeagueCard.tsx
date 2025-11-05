// webapp/src/components/LeagueCard.tsx
import React from 'react';
import {
  Card, CardContent, CardActions, Box, Typography,
  Button, Chip, Stack, Avatar, LinearProgress, IconButton, Grid, Divider
} from '@mui/material';
import {
  Groups, Lock, Public, ContentCopy, Login,
  EmojiEvents, TrendingUp, SportsScore, CalendarToday
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface League {
  id: string;
  name: string;
  code: string;
  isPrivate: boolean;
  maxTeams: number;
  currentTeams: number;
  budget: number;
  userPosition?: number;
  userPoints?: number;
  hasTeam?: boolean;
  topTeams?: Array<{
    name: string;
    points: number;
  }>;
  lastRace?: {
    raceName: string;
    raceDate: string;
    points: number;
    round: number;
  };
}

export function LeagueCard({ 
  league, 
  onJoin, 
  isMyLeague 
}: {
  league: League;
  onJoin?: () => void;
  isMyLeague?: boolean;
}) {
  const navigate = useNavigate();
  const { notify } = useNotification();

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(league.code);
    notify('Codice copiato!', 'success');
  };

  const teamsProgress = (league.currentTeams / league.maxTeams) * 100;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        border: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => `0 12px 24px ${theme.palette.primary.main}22`,
          borderColor: 'primary.main',
        },
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              {league.name}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                icon={league.isPrivate ? <Lock /> : <Public />}
                label={league.isPrivate ? 'Privata' : 'Pubblica'}
                size="small"
                color={league.isPrivate ? 'default' : 'primary'}
                variant="outlined"
              />
              <Chip
                icon={<Groups />}
                label={`${league.currentTeams}/${league.maxTeams}`}
                size="small"
                color={teamsProgress >= 90 ? 'error' : 'default'}
              />
            </Stack>
          </Box>
          {isMyLeague && (
            <IconButton size="small" onClick={handleCopyCode}>
              <ContentCopy fontSize="small" />
            </IconButton>
          )}
        </Stack>

        {/* Progress Bar */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              Posti occupati
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {Math.round(teamsProgress)}%
            </Typography>
          </Stack>
          <LinearProgress 
            variant="determinate" 
            value={teamsProgress}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {/* Stats Grid */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }}>
            <Box>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 600 }}>
                {league.budget}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Budget crediti
              </Typography>
            </Box>
          </Grid>
          {isMyLeague && league.userPosition && (
          <Grid size={{ xs: 6 }}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="h5" color="secondary" sx={{ fontWeight: 600 }}>
                    {league.userPosition}°
                  </Typography>
                  {league.userPosition <= 3 && (
                    <EmojiEvents sx={{ 
                      color: getPodiumColor(league.userPosition),
                      fontSize: 20,
                    }} />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  La tua posizione
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>

        {/* Last Race Info - Solo per le mie leghe con dati disponibili */}
        {isMyLeague && league.lastRace && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box>
              <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
                <SportsScore sx={{ fontSize: 18, color: 'primary.main' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  ULTIMA GARA
                </Typography>
              </Stack>

              <Box
                sx={{
                  p: 1.5,
                  backgroundColor: 'action.hover',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1, mr: 1 }}>
                    {league.lastRace.raceName}
                  </Typography>
                  <Chip
                    label={`R${league.lastRace.round}`}
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Stack>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(league.lastRace.raceDate), 'dd MMM yyyy', { locale: it })}
                    </Typography>
                  </Stack>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" color="success.main" fontWeight="bold">
                      +{league.lastRace.points}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      punti
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            </Box>
          </>
        )}

        {/* Code Display - Solo per le mie leghe senza ultima gara */}
        {isMyLeague && !league.lastRace && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              backgroundColor: 'action.hover',
              borderRadius: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Codice lega
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontFamily: 'monospace',
                letterSpacing: 2,
                fontWeight: 600,
              }}
            >
              {league.code}
            </Typography>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        {isMyLeague ? (
          <Button 
            fullWidth 
            variant="contained"
            onClick={() => navigate(`/leagues/${league.id}`)}
            sx={{ fontWeight: 600 }}
          >
            Vai alla Lega
          </Button>
        ) : league.hasTeam ? (
          <Button 
            fullWidth 
            variant="outlined"
            onClick={() => navigate(`/leagues/${league.id}`)}
          >
            Visualizza
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<Login />}
            onClick={onJoin}
            disabled={league.currentTeams >= league.maxTeams}
            sx={{ fontWeight: 600 }}
          >
            {league.currentTeams >= league.maxTeams ? 'Lega Piena' : 'Unisciti'}
          </Button>
        )}
      </CardActions>
    </Card>
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