// mobile-app/src/components/RaceCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { it } from 'date-fns/locale';

interface RaceCardProps {
  race: {
    id: string;
    name: string;
    circuit: string;
    country: string;
    date: Date;
    sprintDate?: Date;
    round: number;
    season: number;
  };
  variant?: 'upcoming' | 'past' | 'current';
  onPress?: () => void;
}

// Mappatura bandiere per paese
const countryFlags: Record<string, string> = {
  'Italy': '🇮🇹',
  'Spain': '🇪🇸',
  'France': '🇫🇷',
  'Portugal': '🇵🇹',
  'Germany': '🇩🇪',
  'Austria': '🇦🇹',
  'Netherlands': '🇳🇱',
  'Finland': '🇫🇮',
  'Czech Republic': '🇨🇿',
  'United Kingdom': '🇬🇧',
  'San Marino': '🇸🇲',
  'Aragon': '🇪🇸',
  'Catalunya': '🇪🇸',
  'Valencia': '🇪🇸',
  'Americas': '🇺🇸',
  'Argentina': '🇦🇷',
  'Thailand': '🇹🇭',
  'Japan': '🇯🇵',
  'Australia': '🇦🇺',
  'Malaysia': '🇲🇾',
  'Qatar': '🇶🇦',
  'Indonesia': '🇮🇩',
  'India': '🇮🇳',
  'Hungary': '🇭🇺',
};

export default function RaceCard({ race, variant = 'upcoming', onPress }: RaceCardProps) {
  const theme = useTheme();
  const raceDate = new Date(race.date);
  const sprintDate = race.sprintDate ? new Date(race.sprintDate) : null;
  
  // Calcola countdown
  const now = new Date();
  const daysUntilRace = differenceInDays(raceDate, now);
  const hoursUntilRace = differenceInHours(raceDate, now) % 24;
  const minutesUntilRace = differenceInMinutes(raceDate, now) % 60;

  const getStatusChip = () => {
    switch (variant) {
      case 'past':
        return <Chip style={[styles.statusChip, styles.finishedChip]} textStyle={styles.statusText}>✓ Terminato</Chip>;
      case 'current':
        return <Chip style={[styles.statusChip, { backgroundColor: theme.colors.error }]} textStyle={styles.statusText}>● LIVE</Chip>;
      case 'upcoming':
        if (daysUntilRace <= 7 && daysUntilRace >= 0) {
          return <Chip style={[styles.statusChip, { backgroundColor: theme.colors.primary }]} textStyle={styles.statusText}>PROSSIMO</Chip>;
        }
        return null;
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'past':
        return '#E0E0E0';
      case 'current':
        return theme.colors.errorContainer;
      case 'upcoming':
        return daysUntilRace <= 7 ? theme.colors.primaryContainer : '#F5F5F5';
    }
  };

  return (
    <Card 
      style={[styles.card, { backgroundColor: getBackgroundColor() }]} 
      onPress={onPress}
      mode={variant === 'current' ? 'elevated' : 'contained'}
      elevation={variant === 'current' ? 4 : 1}
    >
      <View style={styles.header}>
        <View style={styles.roundInfo}>
          {race.round > 0 ? (
            <Text variant="titleLarge" style={styles.roundNumber}>
              {race.round.toString().padStart(2, '0')}
            </Text>
          ) : (
            <MaterialCommunityIcons 
              name="flag-variant-outline" 
              size={32} 
              color={theme.colors.onSurfaceDisabled} 
            />
          )}
          <Text variant="labelSmall" style={styles.roundLabel}>ROUND</Text>
        </View>
        
        <View style={styles.raceInfo}>
          <View style={styles.titleRow}>
            <Text variant="titleMedium" style={styles.country} numberOfLines={1}>
              {countryFlags[race.country] || '🏁'} {race.country.toUpperCase()}
            </Text>
            {getStatusChip()}
          </View>
          <Text variant="bodyMedium" style={styles.raceName}>{race.name}</Text>
          <Text variant="bodySmall" style={styles.circuit}>{race.circuit}</Text>
        </View>
      </View>

      <View style={styles.dateSection}>
        <View style={styles.dateRow}>
          <MaterialCommunityIcons name="calendar" size={16} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={styles.dateText}>
            {format(raceDate, 'dd MMM', { locale: it })} - {format(raceDate, 'dd MMM yyyy', { locale: it })}
          </Text>
        </View>
        
        {sprintDate && (
          <View style={styles.sprintRow}>
            <MaterialCommunityIcons name="lightning-bolt" size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" style={[styles.dateText, { color: theme.colors.primary }]}>
              Sprint: {format(sprintDate, 'dd MMM HH:mm', { locale: it })}
            </Text>
          </View>
        )}
      </View>

      {variant === 'upcoming' && daysUntilRace >= 0 && daysUntilRace <= 14 && (
        <View style={styles.countdown}>
          <Text variant="labelSmall" style={styles.countdownLabel}>INIZIA TRA</Text>
          <View style={styles.countdownValues}>
            <View style={styles.countdownItem}>
              <Text variant="headlineSmall" style={styles.countdownNumber}>
                {daysUntilRace.toString().padStart(2, '0')}
              </Text>
              <Text variant="labelSmall">GIORNI</Text>
            </View>
            <Text variant="headlineSmall" style={styles.countdownSeparator}>:</Text>
            <View style={styles.countdownItem}>
              <Text variant="headlineSmall" style={styles.countdownNumber}>
                {hoursUntilRace.toString().padStart(2, '0')}
              </Text>
              <Text variant="labelSmall">ORE</Text>
            </View>
            <Text variant="headlineSmall" style={styles.countdownSeparator}>:</Text>
            <View style={styles.countdownItem}>
              <Text variant="headlineSmall" style={styles.countdownNumber}>
                {minutesUntilRace.toString().padStart(2, '0')}
              </Text>
              <Text variant="labelSmall">MIN</Text>
            </View>
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  roundInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    minWidth: 60,
    height: 50,
  },
  roundNumber: {
    fontWeight: 'bold',
    fontSize: 32,
    lineHeight: 34,
  },
  roundLabel: {
    opacity: 0.6,
    marginTop: -2,
  },
  raceInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  country: {
    fontWeight: 'bold',
    flexShrink: 1, // Permette al testo di restringersi
    marginRight: 8, // Aggiunge spazio tra il testo e il badge
  },
  raceName: {
    marginBottom: 2,
  },
  circuit: {
    opacity: 0.7,
  },
  statusChip: {
    height: 24,
    paddingHorizontal: 4, // Aggiunge un po' di padding orizzontale
  },
  finishedChip: {
    backgroundColor: '#388E3C',
  },
  statusText: {
    fontSize: 11,
    color: 'white',
    fontWeight: 'bold',
  },
  dateSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sprintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dateText: {
    opacity: 0.8,
  },
  countdown: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 16,
    alignItems: 'center',
  },
  countdownLabel: {
    opacity: 0.6,
    marginBottom: 8,
  },
  countdownValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countdownItem: {
    alignItems: 'center',
  },
  countdownNumber: {
    fontWeight: 'bold',
  },
  countdownSeparator: {
    fontWeight: 'bold',
    opacity: 0.5,
  },
});