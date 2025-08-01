// mobile-app/src/screens/main/RiderDetailScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import {
  ActivityIndicator, Avatar, Card, Chip, DataTable, Divider, 
  List, Surface, Text, Title, useTheme
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { getRiderById, getRiderStats } from '../../services/api';
import { MainStackParamList } from '../../../App';
import { LinearGradient } from 'expo-linear-gradient';

type RiderDetailScreenRouteProp = RouteProp<MainStackParamList, 'RiderDetail'>;

const screenWidth = Dimensions.get('window').width;

// Mappatura bandiere
const nationalityFlags: Record<string, string> = {
  'IT': '🇮🇹',
  'ES': '🇪🇸',
  'FR': '🇫🇷',
  'PT': '🇵🇹',
  'DE': '🇩🇪',
  'AT': '🇦🇹',
  'NL': '🇳🇱',
  'BE': '🇧🇪',
  'GB': '🇬🇧',
  'US': '🇺🇸',
  'AR': '🇦🇷',
  'AU': '🇦🇺',
  'JP': '🇯🇵',
  'TH': '🇹🇭',
  'MY': '🇲🇾',
  'ID': '🇮🇩',
  'IN': '🇮🇳',
  'BR': '🇧🇷',
  'ZA': '🇿🇦',
  'TR': '🇹🇷',
};

const categoryColors = {
  MOTOGP: ['#E53935', '#B71C1C'],
  MOTO2: ['#1E88E5', '#0D47A1'],
  MOTO3: ['#43A047', '#1B5E20'],
};

export default function RiderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RiderDetailScreenRouteProp>();
  const theme = useTheme();
  const { riderId } = route.params;
  
  const currentSeason = new Date().getFullYear();
  const [selectedSeason, setSelectedSeason] = useState(currentSeason);

  // Query per i dettagli del pilota
  const { data: riderData, isLoading: isLoadingRider } = useQuery({
    queryKey: ['rider', riderId],
    queryFn: () => getRiderById(riderId),
  });

  // Query per le statistiche del pilota
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['riderStats', riderId, selectedSeason],
    queryFn: () => getRiderStats(riderId, selectedSeason),
  });

  const rider = riderData?.rider;
  const stats = statsData?.stats;
  const positionChart = statsData?.positionChart || [];
  const results = statsData?.results || [];

  if (isLoadingRider) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!rider) {
    return (
      <View style={styles.loader}>
        <Text>Pilota non trovato</Text>
      </View>
    );
  }

  const gradientColors = categoryColors[rider.category];

  // Prepara dati per il grafico
  const chartData = {
    labels: positionChart.slice(-6).map(p => `R${p.round}`),
    datasets: [{
      data: positionChart.slice(-6).map(p => p.position || 20),
    }],
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header Pilota */}
        <LinearGradient
          colors={gradientColors}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.riderInfoSection}>
              <Text variant="displayMedium" style={styles.riderNumber}>
                #{rider.number}
              </Text>
              <Text variant="headlineMedium" style={styles.riderName}>
                {rider.name.toUpperCase()}
              </Text>
              <Text variant="titleMedium" style={styles.riderTeam}>
                {rider.team}
              </Text>
              <View style={styles.badges}>
                <Chip style={styles.categoryBadge} textStyle={{ color: 'white' }}>
                  {rider.category}
                </Chip>
                <Text style={styles.nationality}>
                  {nationalityFlags[rider.nationality] || '🏁'} {rider.nationality}
                </Text>
              </View>
            </View>
            
            {rider.photoUrl && (
              <Image 
                source={{ uri: rider.photoUrl }} 
                style={styles.riderPhoto}
                resizeMode="contain"
              />
            )}
          </View>
        </LinearGradient>

        {/* Statistiche Stagione */}
        <Card style={styles.card}>
          <Card.Title 
            title={`Statistiche Stagione ${selectedSeason}`}
            left={(props) => <Avatar.Icon {...props} icon="chart-line" />}
          />
          <Card.Content>
            {isLoadingStats ? (
              <ActivityIndicator />
            ) : stats ? (
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text variant="displaySmall" style={styles.statValue}>
                    {stats.races}
                  </Text>
                  <Text variant="bodySmall">Gare</Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="displaySmall" style={styles.statValue}>
                    {stats.wins}
                  </Text>
                  <Text variant="bodySmall">Vittorie</Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="displaySmall" style={styles.statValue}>
                    {stats.podiums}
                  </Text>
                  <Text variant="bodySmall">Podi</Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="displaySmall" style={styles.statValue}>
                    {stats.points}
                  </Text>
                  <Text variant="bodySmall">Punti</Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="displaySmall" style={styles.statValue}>
                    {stats.avgPosition.toFixed(1)}
                  </Text>
                  <Text variant="bodySmall">Media Pos.</Text>
                </View>
                <View style={styles.statItem}>
                  <Text variant="displaySmall" style={styles.statValue}>
                    {stats.dnf}
                  </Text>
                  <Text variant="bodySmall">Ritiri</Text>
                </View>
              </View>
            ) : (
              <Text>Nessuna statistica disponibile</Text>
            )}
          </Card.Content>
        </Card>

        {/* Grafico Posizioni */}
        {positionChart.length > 0 && (
          <Card style={styles.card}>
            <Card.Title 
              title="Andamento Stagione" 
              left={(props) => <Avatar.Icon {...props} icon="chart-timeline-variant" />}
            />
            <Card.Content>
              <LineChart
                data={chartData}
                width={screenWidth - 64}
                height={200}
                yAxisLabel=""
                yAxisSuffix="°"
                yAxisInterval={1}
                fromZero
                chartConfig={{
                  backgroundColor: theme.colors.surface,
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                  labelColor: (opacity = 1) => theme.colors.onSurface,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#2196F3',
                  },
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
              />
            </Card.Content>
          </Card>
        )}

        {/* Ultimi Risultati */}
        <Card style={styles.card}>
          <Card.Title 
            title="Ultimi Risultati" 
            left={(props) => <Avatar.Icon {...props} icon="flag-checkered" />}
          />
          <Card.Content>
            {results.slice(0, 5).map((result: any) => (
              <List.Item
                key={result.id}
                title={result.race.name}
                description={format(new Date(result.race.date), 'dd MMM yyyy', { locale: it })}
                left={() => (
                  <View style={styles.resultPosition}>
                    {result.position ? (
                      <>
                        {result.position <= 3 && (
                          <MaterialCommunityIcons 
                            name={result.position === 1 ? 'trophy' : 'medal'} 
                            size={20} 
                            color={result.position === 1 ? '#FFD700' : result.position === 2 ? '#C0C0C0' : '#CD7F32'} 
                          />
                        )}
                        <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                          {result.position}°
                        </Text>
                      </>
                    ) : (
                      <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                        {result.status}
                      </Text>
                    )}
                  </View>
                )}
                onPress={() => navigation.navigate('RaceDetail' as any, { raceId: result.race.id })}
              />
            ))}
          </Card.Content>
        </Card>

        {/* Info Fanta MotoGP */}
        <Card style={styles.card}>
          <Card.Title 
            title="Info Fanta MotoGP" 
            left={(props) => <Avatar.Icon {...props} icon="information" />}
          />
          <Card.Content>
            <List.Item
              title="Valore"
              description={`${rider.value} crediti`}
              left={(props) => <List.Icon {...props} icon="currency-eur" />}
            />
            <List.Item
              title="Categoria"
              description={rider.category}
              left={(props) => <List.Icon {...props} icon="motorbike" />}
            />
            <List.Item
              title="Stato"
              description={rider.isActive ? 'Attivo' : 'Non attivo'}
              left={(props) => <List.Icon {...props} icon={rider.isActive ? 'check-circle' : 'close-circle'} color={rider.isActive ? '#4CAF50' : '#F44336'} />}
            />
          </Card.Content>
        </Card>

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
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  riderInfoSection: {
    flex: 1,
  },
  riderNumber: {
    color: 'white',
    fontWeight: 'bold',
    opacity: 0.9,
  },
  riderName: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  riderTeam: {
    color: 'white',
    opacity: 0.9,
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  nationality: {
    color: 'white',
    fontSize: 16,
  },
  riderPhoto: {
    width: 120,
    height: 160,
    marginLeft: 20,
  },
  card: {
    margin: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  statItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statValue: {
    fontWeight: 'bold',
    color: '#1976D2',
  },
  resultPosition: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});