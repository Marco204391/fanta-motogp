// webapp/src/components/RaceEventCard.tsx
import React from 'react';
import { 
  Card, CardContent, CardActions, Box, Typography, 
  Chip, Button, LinearProgress 
} from '@mui/material';
import { 
  Flag, Timer, CalendarToday, LocationOn 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, isPast, isFuture } from 'date-fns';
import { it } from 'date-fns/locale';

interface Race {
  id: string;
  name: string;
  circuit: string;
  country: string;
  gpDate: string;
  sprintDate?: string;
  startDate: string;
  endDate: string;
  round: number;
}

export function RaceEventCard({ race }: { race: Race }) {
  const navigate = useNavigate();
  
  const raceDate = new Date(race.gpDate);
  const now = new Date();
  const daysUntil = differenceInDays(raceDate, now);
  const isUpcoming = isFuture(raceDate);
  const isPastRace = isPast(raceDate);
  const isLive = daysUntil === 0;

  const getStatusColor = () => {
    if (isLive) return 'error';
    if (isUpcoming && daysUntil <= 7) return 'warning';
    if (isPastRace) return 'default';
    return 'primary';
  };

  const getStatusLabel = () => {
    if (isLive) return 'IN CORSO';
    if (isPastRace) return 'CONCLUSA';
    if (daysUntil <= 7) return `${daysUntil} GIORNI`;
    return format(raceDate, 'dd MMM', { locale: it });
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          boxShadow: 6,
          transform: 'translateY(-4px)',
          transition: 'all 0.3s ease'
        }
      }}
    >
      {isLive && (
        <Box 
          sx={{ 
            position: 'absolute',
            top: -10,
            right: 10,
            zIndex: 1
          }}
        >
          <Chip 
            label="LIVE" 
            color="error" 
            size="small"
            sx={{ 
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 }
              }
            }}
          />
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
          <Chip 
            label={`Round ${race.round}`}
            size="small"
            variant="outlined"
          />
          <Chip 
            label={getStatusLabel()}
            color={getStatusColor()}
            size="small"
          />
        </Box>

        <Typography variant="h6" gutterBottom>
          {race.name}
        </Typography>
        
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <LocationOn fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {race.circuit}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <Flag fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {race.country}
          </Typography>
        </Box>

        {race.sprintDate && (
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Timer fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              Sprint: {format(new Date(race.sprintDate), 'dd/MM', { locale: it })}
            </Typography>
          </Box>
        )}

        <Box display="flex" alignItems="center" gap={1}>
          <CalendarToday fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            Gara: {format(raceDate, 'dd/MM', { locale: it })}
          </Typography>
        </Box>

        {isUpcoming && daysUntil > 0 && (
          <Box mt={2}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="caption">Countdown</Typography>
              <Typography variant="caption" fontWeight="bold">
                {daysUntil} giorni
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={Math.max(0, Math.min(100, ((30 - daysUntil) / 30) * 100))}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}
      </CardContent>

      <CardActions>
        <Button 
          size="small" 
          fullWidth
          onClick={() => navigate(`/races/${race.id}`)}
        >
          Dettagli Gara
        </Button>
      </CardActions>
    </Card>
  );
}