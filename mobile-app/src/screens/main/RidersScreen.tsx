// mobile-app/src/screens/main/RidersScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, SectionList, StyleSheet, FlatList } from 'react-native';
import { 
  ActivityIndicator, Searchbar, SegmentedButtons, Text, useTheme, Title 
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
  riderType: 'OFFICIAL' | 'REPLACEMENT' | 'WILDCARD' | 'TEST_RIDER';
}

export default function RidersScreen() {
  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MOTOGP' | 'MOTO2' | 'MOTO3'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['riders'],
    queryFn: () => getRiders({ limit: 200 } as any),
  });

  const riders = data?.riders || [];

  const processedRiders = useMemo(() => {
    const filtered = riders.filter((rider: Rider) => {
      const matchesCategory = selectedCategory === 'ALL' || rider.category === selectedCategory;
      const matchesSearch = rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           rider.team.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           rider.number.toString().includes(searchQuery);
      return matchesCategory && matchesSearch;
    });

    const grouped: { [key: string]: Rider[] } = {
      'Piloti Ufficiali': [],
      'Altri Piloti (Sostituti, Wildcard, Collaudatori)': [],
    };
    
    filtered.forEach((rider: Rider) => {
      if (rider.riderType === 'OFFICIAL') {
        grouped['Piloti Ufficiali'].push(rider);
      } else {
        grouped['Altri Piloti (Sostituti, Wildcard, Collaudatori)'].push(rider);
      }
    });
    
    return Object.keys(grouped)
      .map(title => ({
        title,
        data: [grouped[title].sort((a, b) => b.value - a.value || a.number - b.number)]
      }))
      .filter(section => section.data[0].length > 0);
      
  }, [riders, selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => riders.reduce((acc: Record<string, number>, rider: Rider) => {
    acc[rider.category] = (acc[rider.category] || 0) + 1;
    acc['ALL'] = (acc['ALL'] || 0) + 1;
    return acc;
  }, { ALL: 0, MOTOGP: 0, MOTO2: 0, MOTO3: 0 }), [riders]);

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
      <View style={styles.headerContainer}>
        <Searchbar
          placeholder="Cerca pilota, team o numero..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
        />
        <SegmentedButtons
          value={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value as any)}
          buttons={[
            { value: 'ALL', label: `Tutti (${categoryCounts.ALL})`},
            { value: 'MOTOGP', label: `MotoGP`},
            { value: 'MOTO2', label: `Moto2`},
            { value: 'MOTO3', label: `Moto3`},
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      <SectionList
        sections={processedRiders}
        keyExtractor={(item, index) => 'section-' + index}
        renderItem={({ item }) => (
          <FlatList
            data={item}
            numColumns={2}
            keyExtractor={(rider) => rider.id}
            renderItem={({ item: rider }) => (
              <View style={{ flex: 1/2, margin: 4 }}>
                <RiderCard
                  rider={rider}
                  onPress={() => console.log('Navigate to rider details:', rider.id)}
                />
              </View>
            )}
            style={{ paddingHorizontal: 8 }}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <Title style={styles.sectionHeader}>{title}</Title>
        )}
        contentContainerStyle={styles.listContent}
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
  headerContainer: {
    backgroundColor: 'white',
    padding: 16,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#F5F5F5',
    marginBottom: 12
  },
  segmentedButtons: {
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
});