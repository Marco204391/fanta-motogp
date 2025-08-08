// webapp/src/components/RaceEventCard.tsx
import { Card, CardContent, CardActions, Typography, Box, Button, Chip, LinearProgress } from '@mui/material';
import { CalendarToday, LocationOn, Flag, Timer, SportsScore } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, isBefore, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';

interface RaceEventCardProps {
  race: {
    id: string;
    name: string;
    circuit: string;
    country: string;
    gpDate: string;
    sprintDate?: string;
    round: number;
  };
}

export function RaceEventCard({ race }: RaceEventCardProps) {
  const navigate = useNavigate();
  const raceDate = new Date(race.gpDate);
  const now = new Date();
  const daysUntil = differenceInDays(raceDate, now);
  const isUpcoming = isAfter(raceDate, now);
  const isPast = isBefore(raceDate, now);

  const getStatusLabel = () => {
    if (isPast) return 'Conclusa';
    if (daysUntil === 0) return 'Oggi';
    if (daysUntil === 1) return 'Domani';
    if (daysUntil <= 7) return `${daysUntil} giorni`;
    return format(raceDate, 'dd MMM', { locale: it });
  };

  const getStatusColor = () => {
    if (isPast) return 'default';
    if (daysUntil === 0) return 'error';
    if (daysUntil <= 3) return 'warning';
    if (daysUntil <= 7) return 'info';
    return 'success';
  };

  return (
    <Card 
      sx={{ 
        height: 380, // Altezza FISSA - non 100%, ma un valore assoluto
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4
        }
      }}
    >
      {/* Header con Status Badge */}
      {daysUntil === 0 && isUpcoming && (
        <Box sx={{ 
          bgcolor: 'error.main', 
          color: 'white', 
          py: 0.5, 
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1
        }}>
          <SportsScore fontSize="small" />
          <Typography variant="caption" fontWeight="bold">
            GARA OGGI
          </Typography>
          <SportsScore 
            fontSize="small"
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

      <CardContent sx={{ 
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 2,
        pb: 1,
        overflow: 'hidden' // Previene overflow del contenuto
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} sx={{ height: 24 }}>
          <Chip 
            label={`Round ${race.round}`}
            size="small"
            variant="outlined"
            sx={{ height: 24, fontSize: '0.75rem' }}
          />
          <Chip 
            label={getStatusLabel()}
            color={getStatusColor()}
            size="small"
            sx={{ height: 24, fontSize: '0.75rem' }}
          />
        </Box>

        {/* Nome gara con ellipsis per nomi lunghi */}
        <Typography 
          variant="h6" 
          gutterBottom
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', // Forza una sola riga
            width: '100%',
            fontSize: '1.1rem',
            fontWeight: 600,
            mb: 1.5
          }}
        >
          {race.name}
        </Typography>
        
        {/* Box per le informazioni con spazio fisso */}
        <Box sx={{ flex: '0 0 auto', mb: 1 }}>
          {/* Circuito con ellipsis */}
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <LocationOn fontSize="small" color="action" sx={{ flexShrink: 0 }} />
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}
            >
              {race.circuit}
            </Typography>
          </Box>

          {/* Paese */}
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Flag fontSize="small" color="action" sx={{ flexShrink: 0 }} />
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
              }}
            >
              {race.country}
            </Typography>
          </Box>

          {/* Sprint date se presente */}
          {race.sprintDate && (
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Timer fontSize="small" color="action" sx={{ flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">
                Sprint: {format(new Date(race.sprintDate), 'dd/MM', { locale: it })}
              </Typography>
            </Box>
          )}

          {/* Data gara */}
          <Box display="flex" alignItems="center" gap={1}>
            <CalendarToday fontSize="small" color="action" sx={{ flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary">
              Gara: {format(raceDate, 'dd/MM', { locale: it })}
            </Typography>
          </Box>
        </Box>

        {/* Countdown progress bar - solo per gare future */}
        {isUpcoming && daysUntil > 0 ? (
          <Box sx={{ mt: 'auto', pt: 1 }}>
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
        ) : (
          // Placeholder invisibile per mantenere lo spazio
          <Box sx={{ mt: 'auto', pt: 1, height: '40px' }} />
        )}
      </CardContent>

      <CardActions sx={{ 
        p: 2, 
        pt: 1,
        mt: 0,
        height: 52, // Altezza fissa per i bottoni
        flexShrink: 0
      }}>
        <Button 
          size="small" 
          fullWidth
          onClick={() => navigate(`/races/${race.id}`)}
          variant="text"
          sx={{ height: 36 }}
        >
          Dettagli Gara
        </Button>
      </CardActions>
    </Card>
  );
}