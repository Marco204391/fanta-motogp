// mobile-app/src/screens/main/RidersScreen.tsx
import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { 
  ActivityIndicator, Chip, Searchbar, SegmentedButtons, Text, useTheme 
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { getRiders } from '../../services/api';
import RiderCard from '../../components/RiderCard';

interface Rider {
  id: string;
  name: string;
  number: number;
  team: string;
  category: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  nationality: string;
  value: number;
  photoUrl?: string | null;
}

export default function RidersScreen() {
  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MOTOGP' | 'MOTO2' | 'MOTO3'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['riders'],
    queryFn: getRiders,
  });

  const riders = data?.riders || [];

  // Filtra i piloti per categoria e ricerca
  const filteredRiders = riders.filter((rider: Rider) => {
    const matchesCategory = selectedCategory === 'ALL' || rider.category === selectedCategory;
    const matchesSearch = rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rider.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         rider.number.toString().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // Ordina i piloti per valore (decrescente) e poi per numero
  const sortedRiders = [...filteredRiders].sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    return a.number - b.number;
  });

  // Conta piloti per categoria
  const categoryCounts = riders.reduce((acc: Record<string, number>, rider: Rider) => {
    acc[rider.category] = (acc[rider.category] || 0) + 1;
    acc['ALL'] = (acc['ALL'] || 0) + 1;
    return acc;
  }, { ALL: 0, MOTOGP: 0, MOTO2: 0, MOTO3: 0 });

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 16 }}>Caricamento piloti...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loader}>
        <Text>Errore nel caricamento dei piloti</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barra di ricerca */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Cerca pilota, team o numero..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
        />
      </View>

      {/* Filtri categoria */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value as any)}
          buttons={[
            {
              value: 'ALL',
              label: `Tutti (${categoryCounts.ALL})`,
            },
            {
              value: 'MOTOGP',
              label: `MotoGP (${categoryCounts.MOTOGP})`,
            },
            {
              value: 'MOTO2',
              label: `Moto2 (${categoryCounts.MOTO2})`,
            },
            {
              value: 'MOTO3',
              label: `Moto3 (${categoryCounts.MOTO3})`,
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Lista piloti */}
      <FlatList
        data={sortedRiders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RiderCard
            rider={item}
            onPress={() => {
              // Navigazione ai dettagli del pilota
              console.log('Navigate to rider details:', item.id);
            }}
          />
        )}
        contentContainerStyle={styles.listContent}
        numColumns={2}
        columnWrapperStyle={styles.row}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text variant="bodyLarge" style={{ opacity: 0.6 }}>
              Nessun pilota trovato
            </Text>
          </View>
        }
      />
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
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    elevation: 2,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#F5F5F5',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingBottom: 16,
    elevation: 2,
  },
  segmentedButtons: {
    backgroundColor: 'transparent',
  },
  listContent: {
    padding: 8,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
});