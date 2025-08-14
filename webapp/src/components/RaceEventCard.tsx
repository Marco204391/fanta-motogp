// webapp/src/components/RaceEventCard.tsx
import { Card, CardContent, CardActions, Typography, Box, Button, Chip, LinearProgress, Tooltip } from '@mui/material';
import { CalendarToday, LocationOn, SportsScore, Speed } from '@mui/icons-material';
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
    trackLayoutUrl?: string;
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
        height: '100%',
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
      {race.trackLayoutUrl && (
          <Box
              sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80%',
                  height: '80%',
                  backgroundImage: `url(${race.trackLayoutUrl})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  backgroundSize: 'contain',
                  opacity: 0.05,
                  zIndex: 0,
              }}
          />
      )}
    
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
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        pb: 1,
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

        <Tooltip title={race.name}>
            <Typography
                variant="h6"
                sx={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    mb: 1.5,
                    minHeight: '2.6em',
                    lineHeight: '1.3em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    '-webkit-box-orient': 'vertical',
                    '-webkit-line-clamp': '2',
                }}
                >
                {race.name}
            </Typography>
        </Tooltip>

        {/* Informazioni */}
        <Box sx={{ mb: 1 }}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <CalendarToday fontSize="small" color="action" sx={{ flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {race.circuit}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <LocationOn fontSize="small" color="action" sx={{ flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary" noWrap>
              {race.country}
            </Typography>
          </Box>
          {race.sprintDate && (
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Speed fontSize="small" color="action" sx={{ flexShrink: 0 }} />
              <Typography variant="body2" color="text.secondary">
                Sprint: {format(new Date(race.sprintDate), 'dd/MM', { locale: it })}
              </Typography>
            </Box>
          )}
          <Box display="flex" alignItems="center" gap={1}>
            <SportsScore fontSize="small" color="action" sx={{ flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary">
              Gara: {format(raceDate, 'dd/MM', { locale: it })}
            </Typography>
          </Box>
        </Box>

        {/* Spacer che si espande */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Countdown */}
        {isUpcoming && daysUntil > 0 ? (
          <Box sx={{ pt: 1 }}>
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
          <Box sx={{ height: '40px' }} /> // Placeholder per mantenere l'altezza
        )}
      </CardContent>

      <CardActions sx={{
        p: 2,
        pt: 1,
        flexShrink: 0 // Impedisce a questa sezione di restringersi
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