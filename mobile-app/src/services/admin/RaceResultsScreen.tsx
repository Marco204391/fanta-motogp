// mobile-app/src/screens/admin/RaceResultsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  Card,
  Text,
  Title,
  TextInput,
  Button,
  List,
  Divider,
  SegmentedButtons,
  Chip,
  ActivityIndicator,
  DataTable,
  IconButton,
  Menu,
  Portal,
  Dialog,
  RadioButton
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface RiderResult {
  riderId: string;
  riderName: string;
  riderNumber: number;
  position: number | null;
  status: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ';
}

interface Race {
  id: string;
  name: string;
  date: string;
  round: number;
}

export default function RaceResultsScreen({ route }: any) {
  const { raceId } = route.params || {};
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<'MOTOGP' | 'MOTO2' | 'MOTO3'>('MOTOGP');
  const [results, setResults] = useState<Record<string, RiderResult[]>>({
    MOTOGP: [],
    MOTO2: [],
    MOTO3: []
  });
  const [editingRider, setEditingRider] = useState<string | null>(null);
  const [tempPosition, setTempPosition] = useState<string>('');
  const [tempStatus, setTempStatus] = useState<string>('FINISHED');

  // Query per ottenere il template dei piloti
  const { data: templateData, isLoading } = useQuery({
    queryKey: ['resultsTemplate', raceId, selectedCategory],
    queryFn: async () => {
      const response = await fetch(`/api/admin/race-results/template/${raceId}/${selectedCategory}`);
      return response.json();
    },
    enabled: !!raceId,
  });

  // Mutation per salvare i risultati
  const saveMutation = useMutation({
    mutationFn: async (data: { raceId: string; results: any[] }) => {
      const response = await fetch('/api/admin/race-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Errore nel salvataggio');
      return response.json();
    },
    onSuccess: () => {
      Alert.alert('Successo', 'Risultati salvati correttamente');
      queryClient.invalidateQueries({ queryKey: ['races'] });
    },
    onError: (error) => {
      Alert.alert('Errore', 'Impossibile salvare i risultati');
    }
  });

  // Inizializza i risultati quando arriva il template
  useEffect(() => {
    if (templateData?.template) {
      setResults(prev => ({
        ...prev,
        [selectedCategory]: templateData.template
      }));
    }
  }, [templateData, selectedCategory]);

  const handlePositionChange = (riderId: string, position: string) => {
    const pos = position === '' ? null : parseInt(position);
    if (pos !== null && (isNaN(pos) || pos < 1 || pos > 30)) {
      Alert.alert('Errore', 'La posizione deve essere tra 1 e 30');
      return;
    }

    setResults(prev => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].map(r =>
        r.riderId === riderId ? { ...r, position: pos } : r
      )
    }));
  };

  const handleStatusChange = (riderId: string, status: string) => {
    setResults(prev => ({
      ...prev,
      [selectedCategory]: prev[selectedCategory].map(r =>
        r.riderId === riderId ? { 
          ...r, 
          status: status as any,
          position: status !== 'FINISHED' ? null : r.position
        } : r
      )
    }));
  };

  const handleSaveResults = () => {
    // Combina i risultati di tutte le categorie
    const allResults = [
      ...results.MOTOGP,
      ...results.MOTO2,
      ...results.MOTO3
    ].filter(r => r.position !== null || r.status !== 'FINISHED');

    if (allResults.length === 0) {
      Alert.alert('Attenzione', 'Inserisci almeno un risultato prima di salvare');
      return;
    }

    // Verifica posizioni duplicate per categoria
    for (const category of ['MOTOGP', 'MOTO2', 'MOTO3'] as const) {
      const categoryResults = results[category].filter(r => r.position !== null);
      const positions = categoryResults.map(r => r.position);
      const uniquePositions = new Set(positions);
      
      if (positions.length !== uniquePositions.size) {
        Alert.alert('Errore', `Ci sono posizioni duplicate nella categoria ${category}`);
        return;
      }
    }

    Alert.alert(
      'Conferma',
      'Sei sicuro di voler salvare questi risultati?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Salva',
          onPress: () => {
            saveMutation.mutate({
              raceId,
              results: allResults
            });
          }
        }
      ]
    );
  };

  const renderRiderRow = (rider: RiderResult) => {
    const hasResult = rider.position !== null || rider.status !== 'FINISHED';
    
    return (
      <Card key={rider.riderId} style={[styles.riderCard, hasResult && styles.riderCardFilled]}>
        <Card.Content style={styles.riderContent}>
          <View style={styles.riderInfo}>
            <Text style={styles.riderNumber}>#{rider.riderNumber}</Text>
            <Text style={styles.riderName}>{rider.riderName}</Text>
          </View>
          
          <View style={styles.riderControls}>
            {rider.status === 'FINISHED' ? (
              <TextInput
                value={rider.position?.toString() || ''}
                onChangeText={(text) => handlePositionChange(rider.riderId, text)}
                keyboardType="numeric"
                placeholder="Pos"
                mode="outlined"
                dense
                style={styles.positionInput}
              />
            ) : (
              <Chip 
                style={[styles.statusChip, styles[`status${rider.status}`]]}
                textStyle={styles.statusChipText}
              >
                {rider.status}
              </Chip>
            )}
            
            <Menu
              visible={editingRider === rider.riderId}
              onDismiss={() => setEditingRider(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setEditingRider(rider.riderId)}
                />
              }
            >
              <Menu.Item 
                onPress={() => {
                  handleStatusChange(rider.riderId, 'FINISHED');
                  setEditingRider(null);
                }} 
                title="Finito"
                leadingIcon="flag-checkered"
              />
              <Menu.Item 
                onPress={() => {
                  handleStatusChange(rider.riderId, 'DNF');
                  setEditingRider(null);
                }} 
                title="Ritirato (DNF)"
                leadingIcon="close-circle"
              />
              <Menu.Item 
                onPress={() => {
                  handleStatusChange(rider.riderId, 'DNS');
                  setEditingRider(null);
                }} 
                title="Non partito (DNS)"
                leadingIcon="cancel"
              />
              <Menu.Item 
                onPress={() => {
                  handleStatusChange(rider.riderId, 'DSQ');
                  setEditingRider(null);
                }} 
                title="Squalificato (DSQ)"
                leadingIcon="alert"
              />
            </Menu>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  const currentResults = results[selectedCategory];
  const finishedCount = currentResults.filter(r => r.position !== null).length;
  const dnfCount = currentResults.filter(r => r.status === 'DNF').length;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title>Inserisci Risultati Gara</Title>
            <Text>Round {route.params?.round || 'N/A'} - {route.params?.raceName || 'Gara'}</Text>
          </Card.Content>
        </Card>

        <SegmentedButtons
          value={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value as any)}
          buttons={[
            { value: 'MOTOGP', label: 'MotoGP' },
            { value: 'MOTO2', label: 'Moto2' },
            { value: 'MOTO3', label: 'Moto3' },
          ]}
          style={styles.categorySelector}
        />

        <Card style={styles.statsCard}>
          <Card.Content style={styles.statsContent}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Arrivati</Text>
              <Text style={styles.statValue}>{finishedCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ritirati</Text>
              <Text style={styles.statValue}>{dnfCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Totale</Text>
              <Text style={styles.statValue}>{currentResults.length}</Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.ridersContainer}>
          {currentResults.map(renderRiderRow)}
        </View>
      </ScrollView>

      <View style={styles.bottomActions}>
        <Button
          mode="outlined"
          onPress={() => {
            // Reset della categoria corrente
            setResults(prev => ({
              ...prev,
              [selectedCategory]: templateData?.template || []
            }));
          }}
          style={styles.actionButton}
        >
          Reset {selectedCategory}
        </Button>
        <Button
          mode="contained"
          onPress={handleSaveResults}
          loading={saveMutation.isPending}
          disabled={saveMutation.isPending}
          style={[styles.actionButton, styles.saveButton]}
        >
          Salva Tutti i Risultati
        </Button>
      </View>
    </KeyboardAvoidingView>
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
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  categorySelector: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statsCard: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  ridersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  riderCard: {
    marginVertical: 4,
    elevation: 1,
  },
  riderCardFilled: {
    backgroundColor: '#E8F5E9',
  },
  riderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  riderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riderNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    minWidth: 40,
  },
  riderName: {
    fontSize: 16,
    flex: 1,
  },
  riderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  positionInput: {
    width: 60,
    height: 40,
  },
  statusChip: {
    minWidth: 60,
  },
  statusChipText: {
    fontSize: 12,
    color: 'white',
  },
  statusDNF: {
    backgroundColor: '#F44336',
  },
  statusDNS: {
    backgroundColor: '#FF9800',
  },
  statusDSQ: {
    backgroundColor: '#9E9E9E',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    elevation: 8,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#FF6B00',
  },
});