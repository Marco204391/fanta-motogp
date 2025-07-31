// mobile-app/src/screens/admin/SyncManagementScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert
} from 'react-native';
import {
  Card,
  Text,
  Title,
  Button,
  List,
  ActivityIndicator,
  Chip,
  DataTable,
  Portal,
  Dialog,
  IconButton,
  Banner,
  ProgressBar,
  Divider
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface SyncLog {
  id: string;
  type: 'RIDERS' | 'CALENDAR' | 'RACE_RESULTS';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  message?: string;
  startedAt: string;
  completedAt?: string;
}

interface SyncStatus {
  lastSyncs: SyncLog[];
  racesWithoutResults: number;
  nextRace?: {
    id: string;
    name: string;
    date: string;
  };
}

export default function SyncManagementScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRace, setSelectedRace] = useState<string | null>(null);
  const [showRaceDialog, setShowRaceDialog] = useState(false);

  // Query per lo stato delle sincronizzazioni
  const { data: syncStatus, isLoading: loadingStatus } = useQuery<SyncStatus>({
    queryKey: ['syncStatus'],
    queryFn: async () => {
      const response = await fetch('/api/sync/status');
      if (!response.ok) throw new Error('Errore caricamento stato');
      return response.json();
    },
    refetchInterval: 30000 // Aggiorna ogni 30 secondi
  });

  // Query per le gare senza risultati
  const { data: racesWithoutResults } = useQuery({
    queryKey: ['racesWithoutResults'],
    queryFn: async () => {
      const response = await fetch('/api/races?hasResults=false&past=true');
      if (!response.ok) throw new Error('Errore caricamento gare');
      return response.json();
    }
  });

  // Mutations per le sincronizzazioni
  const syncRidersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sync/riders', { method: 'POST' });
      if (!response.ok) throw new Error('Errore sincronizzazione');
      return response.json();
    },
    onSuccess: () => {
      Alert.alert('Successo', 'Piloti sincronizzati con successo');
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
    },
    onError: () => {
      Alert.alert('Errore', 'Impossibile sincronizzare i piloti');
    }
  });

  const syncCalendarMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sync/calendar', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: new Date().getFullYear() })
      });
      if (!response.ok) throw new Error('Errore sincronizzazione');
      return response.json();
    },
    onSuccess: () => {
      Alert.alert('Successo', 'Calendario sincronizzato con successo');
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
    },
    onError: () => {
      Alert.alert('Errore', 'Impossibile sincronizzare il calendario');
    }
  });

  const syncRaceResultsMutation = useMutation({
    mutationFn: async (raceId: string) => {
      const response = await fetch(`/api/sync/race-results/${raceId}`, { 
        method: 'POST' 
      });
      if (!response.ok) throw new Error('Errore sincronizzazione');
      return response.json();
    },
    onSuccess: () => {
      Alert.alert('Successo', 'Risultati sincronizzati con successo');
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] });
      queryClient.invalidateQueries({ queryKey: ['racesWithoutResults'] });
      setShowRaceDialog(false);
    },
    onError: () => {
      Alert.alert('Errore', 'Impossibile sincronizzare i risultati');
    }
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLETED': return '#4CAF50';
      case 'IN_PROGRESS': return '#FF9800';
      case 'FAILED': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'COMPLETED': return 'check-circle';
      case 'IN_PROGRESS': return 'progress-clock';
      case 'FAILED': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const formatSyncType = (type: string) => {
    switch (type) {
      case 'RIDERS': return 'Piloti';
      case 'CALENDAR': return 'Calendario';
      case 'RACE_RESULTS': return 'Risultati Gara';
      default: return type;
    }
  };

  const isAnySyncInProgress = () => {
    return syncRidersMutation.isPending || 
           syncCalendarMutation.isPending || 
           syncRaceResultsMutation.isPending;
  };

  if (loadingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Banner stato generale */}
      {syncStatus?.racesWithoutResults > 0 && (
        <Banner
          visible={true}
          icon="information"
          style={styles.banner}
        >
          Ci sono {syncStatus.racesWithoutResults} gare completate senza risultati sincronizzati.
        </Banner>
      )}

      {/* Card azioni principali */}
      <Card style={styles.card}>
        <Card.Title 
          title="Sincronizzazioni Manuali" 
          subtitle="Aggiorna i dati dall'API MotoGP"
          left={(props) => <Avatar.Icon {...props} icon="sync" />}
        />
        <Card.Content>
          <View style={styles.syncActions}>
            <Button
              mode="contained"
              onPress={() => syncRidersMutation.mutate()}
              loading={syncRidersMutation.isPending}
              disabled={isAnySyncInProgress()}
              style={styles.syncButton}
              icon="account-multiple"
            >
              Sincronizza Piloti
            </Button>

            <Button
              mode="contained"
              onPress={() => syncCalendarMutation.mutate()}
              loading={syncCalendarMutation.isPending}
              disabled={isAnySyncInProgress()}
              style={styles.syncButton}
              icon="calendar"
            >
              Sincronizza Calendario
            </Button>

            <Button
              mode="contained"
              onPress={() => setShowRaceDialog(true)}
              disabled={isAnySyncInProgress() || !racesWithoutResults?.races?.length}
              style={[styles.syncButton, { backgroundColor: '#4CAF50' }]}
              icon="flag-checkered"
            >
              Sincronizza Risultati Gara
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* Card stato sincronizzazioni */}
      <Card style={styles.card}>
        <Card.Title 
          title="Ultime Sincronizzazioni" 
          subtitle="Stato delle operazioni recenti"
        />
        <Card.Content>
          {syncStatus?.lastSyncs?.map((sync) => (
            <List.Item
              key={sync.type}
              title={formatSyncType(sync.type)}
              description={
                sync.completedAt 
                  ? `Completata: ${format(new Date(sync.completedAt), 'dd/MM/yyyy HH:mm', { locale: it })}`
                  : 'Mai eseguita'
              }
              left={(props) => (
                <List.Icon 
                  {...props} 
                  icon={getStatusIcon(sync.status)}
                  color={getStatusColor(sync.status)}
                />
              )}
              right={() => (
                <Chip 
                  style={{ backgroundColor: getStatusColor(sync.status) }}
                  textStyle={{ color: 'white' }}
                >
                  {sync.status || 'N/A'}
                </Chip>
              )}
            />
          ))}
        </Card.Content>
      </Card>

      {/* Card prossima gara */}
      {syncStatus?.nextRace && (
        <Card style={styles.card}>
          <Card.Title 
            title="Prossima Gara" 
            subtitle="Ricordati di sincronizzare i risultati dopo la gara"
            left={(props) => <Avatar.Icon {...props} icon="trophy" />}
          />
          <Card.Content>
            <List.Item
              title={syncStatus.nextRace.name}
              description={format(new Date(syncStatus.nextRace.date), 'EEEE dd MMMM yyyy - HH:mm', { locale: it })}
              left={(props) => <List.Icon {...props} icon="motorbike" />}
            />
          </Card.Content>
        </Card>
      )}

      {/* Card automatizzazioni */}
      <Card style={styles.card}>
        <Card.Title 
          title="Sincronizzazioni Automatiche" 
          subtitle="Schedule programmato"
          left={(props) => <Avatar.Icon {...props} icon="clock-outline" />}
        />
        <Card.Content>
          <List.Item
            title="Piloti"
            description="Ogni lunedì alle 03:00"
            left={(props) => <List.Icon {...props} icon="account-multiple" />}
          />
          <List.Item
            title="Calendario"
            description="Ogni martedì alle 03:00"
            left={(props) => <List.Icon {...props} icon="calendar" />}
          />
          <List.Item
            title="Risultati Gare"
            description="Domenica ogni 2 ore, Lunedì ogni 4 ore"
            left={(props) => <List.Icon {...props} icon="flag-checkered" />}
          />
        </Card.Content>
      </Card>

      {/* Dialog selezione gara */}
      <Portal>
        <Dialog visible={showRaceDialog} onDismiss={() => setShowRaceDialog(false)}>
          <Dialog.Title>Seleziona Gara</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              {racesWithoutResults?.races?.map((race: any) => (
                <List.Item
                  key={race.id}
                  title={race.name}
                  description={`Round ${race.round} - ${format(new Date(race.date), 'dd/MM/yyyy')}`}
                  onPress={() => {
                    setSelectedRace(race.id);
                    syncRaceResultsMutation.mutate(race.id);
                  }}
                  left={(props) => <List.Icon {...props} icon="trophy" />}
                  style={styles.raceItem}
                />
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowRaceDialog(false)}>Annulla</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
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
  banner: {
    margin: 16,
    marginBottom: 0,
  },
  card: {
    margin: 16,
    marginBottom: 0,
  },
  syncActions: {
    gap: 12,
    marginTop: 8,
  },
  syncButton: {
    paddingVertical: 8,
  },
  raceItem: {
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#f8f8f8',
  },
});