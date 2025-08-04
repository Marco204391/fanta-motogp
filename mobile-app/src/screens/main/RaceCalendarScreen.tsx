// mobile-app/src/screens/main/RaceCalendarScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import {
  ActivityIndicator, Divider, SegmentedButtons, Text, useTheme
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { format, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { getUpcomingRaces, getPastRaces } from '../../services/api';
import RaceCard from '../../components/RaceCard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../../../App';

interface Race {
  id: string;
  name: string;
  circuit: string;
  country: string;
  gpDate: Date;
  sprintDate?: Date;
  round: number;
  season: number;
}

type RaceCalendarScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Calendar'>;

export default function RaceCalendarScreen() {
  const theme = useTheme();
  const navigation = useNavigation<RaceCalendarScreenNavigationProp>();
  const [selectedTab, setSelectedTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  // Query per gare future
  const {
    data: upcomingData,
    isLoading: isLoadingUpcoming,
    refetch: refetchUpcoming
  } = useQuery({
    queryKey: ['upcomingRaces'],
    queryFn: getUpcomingRaces,
  });

  // Query per gare passate
  const {
    data: pastData,
    isLoading: isLoadingPast,
    refetch: refetchPast
  } = useQuery({
    queryKey: ['pastRaces'],
    queryFn: getPastRaces,
  });

  const upcomingRaces = upcomingData?.races || [];
  const pastRaces = pastData?.races || [];
  const allRaces = [...pastRaces, ...upcomingRaces].sort(
    (a, b) => new Date(a.gpDate).getTime() - new Date(b.gpDate).getTime()
  );

  const isLoading = isLoadingUpcoming || isLoadingPast;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchUpcoming(), refetchPast()]);
    setRefreshing(false);
  };

  // Raggruppa le gare per mese
  const groupRacesByMonth = (races: Race[]) => {
    const grouped: Record<string, Race[]> = {};

    races.forEach(race => {
      const monthKey = format(new Date(race.gpDate), 'MMMM yyyy', { locale: it });
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(race);
    });

    return grouped;
  };

  const getRacesToDisplay = () => {
    switch (selectedTab) {
      case 'upcoming':
        return upcomingRaces;
      case 'past':
        return pastRaces;
      case 'all':
        return allRaces;
      default:
        return [];
    }
  };

  const getRaceVariant = (race: Race): 'upcoming' | 'past' | 'current' => {
    const now = new Date();
    const raceDate = new Date(race.gpDate);
    const raceStart = race.sprintDate ? new Date(race.sprintDate) : raceDate;

    // Se la gara è in corso (tra inizio sprint/gara e fine gara)
    if (isAfter(now, startOfDay(raceStart)) && isBefore(now, endOfDay(raceDate))) {
      return 'current';
    }

    // Se la gara è passata
    if (isBefore(raceDate, now)) {
      return 'past';
    }

    return 'upcoming';
  };

  const racesToDisplay = getRacesToDisplay();
  const groupedRaces = groupRacesByMonth(racesToDisplay);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Caricamento calendario...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab per filtrare le gare */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={selectedTab}
          onValueChange={(value) => setSelectedTab(value as any)}
          buttons={[
            {
              value: 'upcoming',
              label: 'Prossime',
              icon: 'calendar-clock',
            },
            {
              value: 'past',
              label: 'Passate',
              icon: 'calendar-check',
            },
            {
              value: 'all',
              label: 'Tutte',
              icon: 'calendar',
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {Object.entries(groupedRaces).map(([month, races]) => (
          <View key={month}>
            <View style={styles.monthHeader}>
              <Text variant="titleMedium" style={styles.monthTitle}>
                {month.toUpperCase()}
              </Text>
              <View style={styles.monthDivider} />
            </View>

            {races.map((race) => (
              <RaceCard
                key={race.id}
                race={race}
                variant={getRaceVariant(race)}
                onPress={() => navigation.navigate('RaceDetail', { raceId: race.id })}
              />
            ))}
          </View>
        ))}

        {racesToDisplay.length === 0 && (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ opacity: 0.6 }}>
              {selectedTab === 'upcoming' && 'Nessuna gara in programma'}
              {selectedTab === 'past' && 'Nessuna gara passata'}
              {selectedTab === 'all' && 'Nessuna gara disponibile'}
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
  },
  content: {
    paddingVertical: 8,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  monthTitle: {
    fontWeight: 'bold',
    marginRight: 12,
  },
  monthDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
});