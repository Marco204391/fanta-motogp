// mobile-app/src/screens/main/RaceDetailScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  ActivityIndicator, Avatar, Card, Chip, DataTable, Divider,
  FAB, List, SegmentedButtons, Surface, Text, Title, useTheme
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, isBefore, isAfter } from 'date-fns';
import { it } from 'date-fns/locale';
import { getRaceById, getRaceResults, getQualifyingResults } from '../../services/api'; // getQualifyingResults è una nuova funzione da implementare
import { MainStackParamList } from '../../../App';
import { useAuth } from '../../contexts/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';

type RaceDetailScreenRouteProp = RouteProp<MainStackParamList, 'RaceDetail'>;
type RaceDetailScreenNavigationProp = StackNavigationProp<MainStackParamList, 'RaceDetail'>;


// Mappatura bandiere
const countryFlags: Record<string, string> = {
  'Italy': '🇮🇹',
  'Spain': '🇪🇸',
  'France': '🇫🇷',
  'Portugal': '🇵🇹',
  'Germany': '🇩🇪',
  'Austria': '🇦🇹',
  'Netherlands': '🇳🇱',
  'Czech Republic': '🇨🇿',
  'United Kingdom': '🇬🇧',
  'Hungary': '🇭🇺',
  'USA': '🇺🇸',
  'Argentina': '🇦🇷',
  'Australia': '🇦🇺',
  'Japan': '🇯🇵',
  'Thailand': '🇹🇭',
  'Malaysia': '🇲🇾',
  'Indonesia': '🇮🇩',
  'Qatar': '🇶🇦',
};

const categoryColors = {
  MOTOGP: '#E53935',
  MOTO2: '#1E88E5',
  MOTO3: '#43A047',
};

export default function RaceDetailScreen() {
  const navigation = useNavigation<RaceDetailScreenNavigationProp>();
  const route = useRoute<RaceDetailScreenRouteProp>();
  const theme = useTheme();
  const { user } = useAuth();
  const { raceId } = route.params;

  const [selectedCategory, setSelectedCategory] = useState<'MOTOGP' | 'MOTO2' | 'MOTO3'>('MOTOGP');
  const [selectedResultType, setSelectedResultType] = useState<'race' | 'sprint' | 'qualifying'>('race');


  // Query per i dettagli della gara
  const { data: raceData, isLoading: isLoadingRace } = useQuery({
    queryKey: ['race', raceId],
    queryFn: () => getRaceById(raceId),
  });

  // Query per i risultati della gara
  const { data: resultsData, isLoading: isLoadingResults } = useQuery({
    queryKey: ['raceResults', raceId],
    queryFn: () => getRaceResults(raceId),
    enabled: !!raceData?.race?.stats?.hasResults,
  });

  // Nuova query per i risultati delle qualifiche
  const { data: qualifyingData, isLoading: isLoadingQualifying } = useQuery({
    queryKey: ['qualifyingResults', raceId],
    queryFn: () => getQualifyingResults(raceId), // Da implementare in api.ts
    enabled: !!raceData?.race,
  });


  const race = raceData?.race;
  const results = resultsData?.results || {};
  const hasResults = race?.stats?.hasResults || false;
  const raceResults = results?.RACE || [];
  const sprintResults = results?.SPRINT || [];
  const qualifyingResults = qualifyingData?.results || [];
  const hasSprint = sprintResults.length > 0;


  const getRaceStatus = () => {
    if (!race) return 'upcoming';
    const now = new Date();
    const raceDate = new Date(race.gpDate);
    const sprintDate = race.sprintDate ? new Date(race.sprintDate) : null;

    if (hasResults) return 'completed';
    if (isBefore(raceDate, now)) return 'past';
    if (sprintDate && isAfter(now, sprintDate) && isBefore(now, raceDate)) return 'ongoing';
    return 'upcoming';
  };

  const raceStatus = getRaceStatus();

  // Funzione per renderizzare una riga di risultato di gara/sprint
  const renderResultRow = (result: any, index: number) => {
    const isPodium = result.position <= 3;
    const isDNF = result.status !== 'FINISHED';

    return (
        <DataTable.Row
            key={result.id}
            style={isPodium ? styles.podiumRow : undefined}
            onPress={() => navigation.navigate('RiderDetail', { riderId: result.rider.id })}
        >
            <DataTable.Cell style={{ flex: 0.5 }}>
                {isDNF ? (
                    <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                        {result.status}
                    </Text>
                ) : (
                    <View style={styles.positionCell}>
                        {isPodium && (
                            <MaterialCommunityIcons
                                name={result.position === 1 ? 'trophy' : 'medal'}
                                size={16}
                                color={result.position === 1 ? '#FFD700' : result.position === 2 ? '#C0C0C0' : '#CD7F32'}
                            />
                        )}
                        <Text variant="bodyMedium" style={{ fontWeight: isPodium ? 'bold' : 'normal' }}>
                            {result.position}
                        </Text>
                    </View>
                )}
            </DataTable.Cell>

            <DataTable.Cell style={{ flex: 0.5 }}>
                <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                    {result.rider.number}
                </Text>
            </DataTable.Cell>

            <DataTable.Cell style={{ flex: 2 }}>
                <Text variant="bodyMedium" numberOfLines={1}>
                    {result.rider.name}
                </Text>
            </DataTable.Cell>

            <DataTable.Cell style={{ flex: 1 }}>
                <Text variant="bodySmall" numberOfLines={1} style={{ opacity: 0.7 }}>
                    {result.rider.team}
                </Text>
            </DataTable.Cell>
        </DataTable.Row>
    );
  };

  // Nuova funzione per renderizzare una riga di qualifica
  const renderQualifyingRow = (result: any, index: number) => (
      <DataTable.Row key={result.rider.id}>
          <DataTable.Cell style={{ flex: 0.5 }}>{result.position}</DataTable.Cell>
          <DataTable.Cell style={{ flex: 2 }}>{result.rider.name}</DataTable.Cell>
          <DataTable.Cell numeric>{result.time}</DataTable.Cell>
      </DataTable.Row>
  );

  if (isLoadingRace) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!race) {
    return (
      <View style={styles.loader}>
        <Text>Gara non trovata</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header Gara */}
        <Surface style={styles.header} elevation={2}>
          <View style={styles.headerContent}>
            <View style={styles.roundBadge}>
              <Text variant="titleLarge" style={styles.roundNumber}>
                {race.round.toString().padStart(2, '0')}
              </Text>
              <Text variant="labelSmall">ROUND</Text>
            </View>

            <View style={styles.raceInfo}>
              <Text variant="headlineSmall" style={styles.raceName}>
                {countryFlags[race.country] || '🏁'} {race.country.toUpperCase()}
              </Text>
              <Text variant="titleMedium">{race.name}</Text>
              <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
                {race.circuit}
              </Text>

              <View style={styles.dateRow}>
                <MaterialCommunityIcons name="calendar" size={16} color={theme.colors.onSurface} />
                <Text variant="bodySmall" style={{ marginLeft: 4 }}>
                  {format(new Date(race.gpDate), 'dd MMMM yyyy', { locale: it })}
                </Text>
              </View>
            </View>

            {raceStatus === 'completed' && (
              <Chip style={styles.statusChip} textStyle={{ color: 'white' }}>
                ✓ Completato
              </Chip>
            )}
            {raceStatus === 'ongoing' && (
              <Chip style={[styles.statusChip, { backgroundColor: theme.colors.error }]} textStyle={{ color: 'white' }}>
                ● LIVE
              </Chip>
            )}
          </View>
        </Surface>

        {/* Info Gara */}
        <Card style={styles.card}>
          <Card.Title
            title="Informazioni Gara"
            left={(props) => <Avatar.Icon {...props} icon="information" />}
          />
          <Card.Content>
            <List.Item
              title="Data Gara Sprint"
              description={race.sprintDate ? format(new Date(race.sprintDate), 'dd MMMM yyyy HH:mm', { locale: it }) : 'Non prevista'}
              left={(props) => <List.Icon {...props} icon="lightning-bolt" />}
            />
            <List.Item
              title="Data Gara Principale"
              description={format(new Date(race.gpDate), 'dd MMMM yyyy HH:mm', { locale: it })}
              left={(props) => <List.Icon {...props} icon="flag-checkered" />}
            />
            <List.Item
              title="Stagione"
              description={`Campionato ${race.season}`}
              left={(props) => <List.Icon {...props} icon="trophy" />}
            />
          </Card.Content>
        </Card>

        {/* Risultati o Messaggio */}
        {hasResults ? (
          <Card style={styles.card}>
            <Card.Title
              title="Risultati"
              left={(props) => <Avatar.Icon {...props} icon="podium" />}
            />
            <Card.Content>
            <SegmentedButtons
                value={selectedResultType}
                onValueChange={(value) => setSelectedResultType(value as any)}
                buttons={[
                  { value: 'race', label: 'Gara' },
                  ...(hasSprint ? [{ value: 'sprint', label: 'Sprint' }] : []),
                  { value: 'qualifying', label: 'Qualifiche' },
                ]}
                style={styles.categoryButtons}
              />
              <SegmentedButtons
                value={selectedCategory}
                onValueChange={(value) => setSelectedCategory(value as any)}
                buttons={[
                  {
                    value: 'MOTOGP',
                    label: 'MotoGP',
                    style: { backgroundColor: selectedCategory === 'MOTOGP' ? categoryColors.MOTOGP : undefined },
                  },
                  {
                    value: 'MOTO2',
                    label: 'Moto2',
                    style: { backgroundColor: selectedCategory === 'MOTO2' ? categoryColors.MOTO2 : undefined },
                  },
                  {
                    value: 'MOTO3',
                    label: 'Moto3',
                    style: { backgroundColor: selectedCategory === 'MOTO3' ? categoryColors.MOTO3 : undefined },
                  },
                ]}
                style={styles.categoryButtons}
              />

              {/* Tabella risultati */}
              {isLoadingResults || isLoadingQualifying ? (
                <ActivityIndicator style={{ marginTop: 20 }} />
              ) : (
                <DataTable style={styles.resultsTable}>
                  <DataTable.Header>
                    <DataTable.Title style={{ flex: 0.5 }}>Pos</DataTable.Title>
                    <DataTable.Title style={{ flex: 2 }}>Pilota</DataTable.Title>
                    {selectedResultType === 'qualifying' ? (
                      <DataTable.Title numeric>Tempo</DataTable.Title>
                    ) : (
                      <DataTable.Title numeric>Punti</DataTable.Title>
                    )}
                  </DataTable.Header>

                  {selectedResultType === 'race' && raceResults.map(renderResultRow)}
                  {selectedResultType === 'sprint' && sprintResults.map(renderResultRow)}
                  {selectedResultType === 'qualifying' && qualifyingResults.map(renderQualifyingRow)}
                </DataTable>
              )}
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.card}>
            <Card.Content style={styles.noResultsContent}>
              <MaterialCommunityIcons
                name="flag-outline"
                size={64}
                color={theme.colors.onSurfaceVariant}
                style={{ opacity: 0.5 }}
              />
              <Text variant="titleMedium" style={styles.noResultsText}>
                {raceStatus === 'upcoming' ? 'Gara non ancora disputata' : 'Risultati non ancora disponibili'}
              </Text>
              <Text variant="bodyMedium" style={{ opacity: 0.7, textAlign: 'center' }}>
                {raceStatus === 'upcoming'
                  ? 'I risultati saranno disponibili dopo la gara'
                  : 'I risultati verranno sincronizzati automaticamente'}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Statistiche Gara */}
        {race.stats && (
          <Card style={styles.card}>
            <Card.Title
              title="Statistiche"
              left={(props) => <Avatar.Icon {...props} icon="chart-bar" />}
            />
            <Card.Content>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text variant="displaySmall" style={styles.statValue}>
                    {race.stats.totalLineups}
                  </Text>
                  <Text variant="bodySmall">Schieramenti</Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="displaySmall" style={styles.statValue}>
                    {race.stats.categories.MOTOGP || 0}
                  </Text>
                  <Text variant="bodySmall">Piloti MotoGP</Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="displaySmall" style={styles.statValue}>
                    {race.stats.categories.MOTO2 || 0}
                  </Text>
                  <Text variant="bodySmall">Piloti Moto2</Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="displaySmall" style={styles.statValue}>
                    {race.stats.categories.MOTO3 || 0}
                  </Text>
                  <Text variant="bodySmall">Piloti Moto3</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
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
  header: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundBadge: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 60,
  },
  roundNumber: {
    fontWeight: 'bold',
    fontSize: 32,
  },
  raceInfo: {
    flex: 1,
  },
  raceName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusChip: {
    backgroundColor: '#4CAF50',
    position: 'absolute',
    top: 0,
    right: 0,
  },
  card: {
    margin: 16,
    marginTop: 0,
    marginBottom: 8,
  },
  categoryButtons: {
    marginBottom: 16,
  },
  resultsTable: {
    marginTop: 8,
  },
  positionCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  podiumRow: {
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
  },
  noResultsContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    marginTop: 16,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontWeight: 'bold',
    color: '#1976D2',
  },
});