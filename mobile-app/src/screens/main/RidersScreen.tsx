// mobile-app/src/screens/main/RidersScreen.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl
} from 'react-native';
import {
  Card,
  Text,
  Avatar,
  Chip,
  ActivityIndicator,
  Searchbar,
  SegmentedButtons,
  IconButton,
  Menu,
  FAB,
  List,
  Title,
  Paragraph
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { getRiders } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Rider {
  id: string;
  name: string;
  number: number;
  team: string;
  category: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  nationality: string;
  value: number;
  photoUrl?: string;
  isActive: boolean;
  statistics?: {
    wins: number;
    podiums: number;
    points: number;
    avgPosition: number;
  };
}

export default function RidersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'ALL' | 'MOTOGP' | 'MOTO2' | 'MOTO3'>('ALL');
  const [sortBy, setSortBy] = useState<'value' | 'points' | 'name'>('value');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: riders, isLoading, refetch } = useQuery({
    queryKey: ['riders', category === 'ALL' ? undefined : category, sortBy],
    queryFn: () => getRiders({ 
      category: category === 'ALL' ? undefined : category,
      sortBy 
    }),
    select: (data) => data.riders,
  });

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const filteredRiders = useMemo(() => {
    if (!riders) return [];
    
    return riders.filter((rider: Rider) =>
      rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rider.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rider.number.toString().includes(searchQuery)
    );
  }, [riders, searchQuery]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MOTOGP': return '#FF6B00';
      case 'MOTO2': return '#4CAF50';
      case 'MOTO3': return '#2196F3';
      default: return '#666';
    }
  };

  const renderRider = ({ item: rider }: { item: Rider }) => (
    <Card 
      style={styles.riderCard}
      onPress={() => {/* Naviga ai dettagli pilota */}}
    >
      <List.Item
        title={`#${rider.number} ${rider.name}`}
        description={rider.team}
        left={(props) => (
          <Avatar.Text
            {...props}
            label={rider.number.toString()}
            size={50}
            style={{ 
              backgroundColor: getCategoryColor(rider.category),
              marginRight: 12 
            }}
          />
        )}
        right={() => (
          <View style={styles.rightContent}>
            <View style={styles.valueContainer}>
              <Text style={styles.valueLabel}>Valore</Text>
              <Text style={styles.valueText}>€{rider.value.toLocaleString()}</Text>
            </View>
            <Chip 
              mode="flat" 
              style={[
                styles.categoryChip,
                { backgroundColor: getCategoryColor(rider.category) }
              ]}
              textStyle={styles.categoryChipText}
            >
              {rider.category}
            </Chip>
          </View>
        )}
      />
      
      {rider.statistics && (
        <Card.Content style={styles.statsContainer}>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="trophy" size={16} color="#FFD700" />
            <Text style={styles.statText}>{rider.statistics.wins}</Text>
          </View>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="podium" size={16} color="#C0C0C0" />
            <Text style={styles.statText}>{rider.statistics.podiums}</Text>
          </View>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="star" size={16} color="#FF6B00" />
            <Text style={styles.statText}>{rider.statistics.points} pts</Text>
          </View>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="chart-line" size={16} color="#666" />
            <Text style={styles.statText}>Pos. {rider.statistics.avgPosition.toFixed(1)}</Text>
          </View>
        </Card.Content>
      )}
    </Card>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Cerca pilota, numero o team"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />

        <View style={styles.filterRow}>
          <SegmentedButtons
            value={category}
            onValueChange={(value) => setCategory(value as any)}
            buttons={[
              { value: 'ALL', label: 'Tutti' },
              { value: 'MOTOGP', label: 'MotoGP' },
              { value: 'MOTO2', label: 'Moto2' },
              { value: 'MOTO3', label: 'Moto3' },
            ]}
            style={styles.segmentedButtons}
          />

          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <IconButton
                icon="sort"
                mode="outlined"
                onPress={() => setSortMenuVisible(true)}
              />
            }
          >
            <Menu.Item 
              onPress={() => {
                setSortBy('value');
                setSortMenuVisible(false);
              }} 
              title="Valore"
              leadingIcon={sortBy === 'value' ? 'check' : undefined}
            />
            <Menu.Item 
              onPress={() => {
                setSortBy('points');
                setSortMenuVisible(false);
              }} 
              title="Punti"
              leadingIcon={sortBy === 'points' ? 'check' : undefined}
            />
            <Menu.Item 
              onPress={() => {
                setSortBy('name');
                setSortMenuVisible(false);
              }} 
              title="Nome"
              leadingIcon={sortBy === 'name' ? 'check' : undefined}
            />
          </Menu>
        </View>
      </View>

      {filteredRiders.length > 0 ? (
        <FlatList
          data={filteredRiders}
          renderItem={renderRider}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="motorbike-off" 
            size={80} 
            color="#ccc" 
          />
          <Title style={styles.emptyTitle}>Nessun pilota trovato</Title>
          <Paragraph style={styles.emptyText}>
            Prova a modificare i filtri o la ricerca
          </Paragraph>
        </View>
      )}

      <FAB
        icon="filter"
        style={styles.fab}
        onPress={() => {/* Apri filtri avanzati */}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    paddingBottom: 8,
    elevation: 2,
  },
  searchbar: {
    margin: 16,
    marginBottom: 8,
    elevation: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  segmentedButtons: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80,
    paddingTop: 8,
  },
  riderCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  rightContent: {
    alignItems: 'flex-end',
    gap: 8,
  },
  valueContainer: {
    alignItems: 'flex-end',
  },
  valueLabel: {
    fontSize: 12,
    color: '#666',
  },
  valueText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryChip: {
    height: 24,
  },
  categoryChipText: {
    fontSize: 12,
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF6B00',
  },
});