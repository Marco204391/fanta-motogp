// webapp/src/components/RaceEventCard.tsx
import { Card, CardActionArea, CardContent, Typography, Chip, Box, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isFuture, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';

interface Race {
  id: string;
  name: string;
  country: string;
  startDate: string;
  endDate: string;
  gpDate: string;
  round: number;
}

const countryFlags: Record<string, string> = {
    'Thailand': '🇹🇭', 'Argentina': '🇦🇷', 'USA': '🇺🇸', 'Qatar': '🇶🇦', 'Spain': '🇪🇸', 
    'France': '🇫🇷', 'United Kingdom': '🇬🇧', 'Aragon': '🇪🇸', 'Italy': '🇮🇹', 
    'Netherlands': '🇳🇱', 'Germany': '🇩🇪', 'Czechia': '🇨🇿', 'Austria': '🇦🇹', 
    'Hungary': '🇭🇺', 'Catalonia': '🇪🇸', 'San Marino': '🇸🇲', 'Japan': '🇯🇵', 
    'Indonesia': '🇮🇩', 'Australia': '🇦🇺', 'Malaysia': '🇲🇾'
};

export function RaceEventCard({ race }: { race: Race }) {
  const navigate = useNavigate();
  const raceDate = new Date(race.gpDate);
  const now = new Date();
  const daysDiff = differenceInDays(raceDate, now);

  let status: 'finished' | 'upcoming' | 'next' = 'upcoming';
  if (isPast(raceDate)) {
    status = 'finished';
  } else if (isFuture(raceDate) && daysDiff >= 0 && daysDiff <= 14) {
    const upcomingRaces = document.querySelectorAll('[data-status="upcoming"]');
    if (upcomingRaces.length === 0) status = 'next';
  }

  const getStatusChip = () => {
    if (status === 'finished') {
      return <Chip label="Finished" color="default" size="small" />;
    }
    if (status === 'next') {
      return <Chip label="Up Next" color="error" size="small" />;
    }
    return null;
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startDay = format(startDate, 'dd');
    const endDay = format(endDate, 'dd');
    const month = format(startDate, 'MMM', { locale: it });
    return `${startDay} ${month.toUpperCase()} - ${endDay} ${month.toUpperCase()}`;
  };

  return (
    <Card 
      sx={{ 
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `4px solid ${status === 'next' ? 'error.main' : 'transparent'}` 
      }}
      data-status={status}
    >
      <CardActionArea 
        onClick={() => navigate(`/races/${race.id}`)}
        sx={{ flexGrow: 1 }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              {formatDateRange(race.startDate, race.endDate)}
            </Typography>
            {getStatusChip()}
          </Box>
          <Divider sx={{ my: 1 }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
            {race.round} {countryFlags[race.country] || '🏁'} {race.country.toUpperCase()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {race.name}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}