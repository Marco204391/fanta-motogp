// mobile-app/src/screens/main/LeaguesScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  FlatList
} from 'react-native';
import {
  Card,
  Text,
  Title,
  Paragraph,
  Button,
  FAB,
  Avatar,
  List,
  Chip,
  ActivityIndicator,
  Searchbar,
  Dialog,
  Portal,
  TextInput,
  SegmentedButtons
} from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyLeagues, getPublicLeagues, joinLeague } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../../../App';

interface League {
  id: string;
  name: string;
  code: string;
  isPrivate: boolean;
  maxTeams: number;
  currentTeams: number;
  budget: number;
  userPosition?: number;
  userPoints?: number;
}

type LeaguesScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Leagues'>;

export default function LeaguesScreen() {
  const navigation = useNavigation<LeaguesScreenNavigationProp>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [viewType, setViewType] = useState<'my' | 'public'>('my');
  const [refreshing, setRefreshing] = useState(false);
  
  const { data: myLeaguesData, isLoading: loadingMy, refetch: refetchMy } = useQuery({
    queryKey: ['myLeagues'],
    queryFn: getMyLeagues,
    staleTime: 1000, // 1 secondo di cache per permettere refresh più frequenti
  });

  const { data: publicLeaguesData, isLoading: loadingPublic, refetch: refetchPublic } = useQuery({
    queryKey: ['publicLeagues'],
    queryFn: getPublicLeagues,
    enabled: viewType === 'public',
    staleTime: 5000,
  });

  const myLeagues = myLeaguesData?.leagues || [];
  const publicLeagues = publicLeaguesData?.leagues || [];

  useFocusEffect(
    useCallback(() => {
      if (viewType === 'my') {
        queryClient.invalidateQueries({ queryKey: ['myLeagues'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['publicLeagues'] });
      }
      
      // Cleanup function
      return () => {
        // Non fare nulla al cleanup
      };
    }, [viewType, queryClient])
  );

  // Effetto per il cambio di tab
  useEffect(() => {
    if (viewType === 'my') {
      refetchMy();
    } else {
      refetchPublic();
    }
  }, [viewType]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (viewType === 'my') {
        await refetchMy();
      } else {
        await refetchPublic();
      }
    } finally {
      setRefreshing(false);
    }
  }, [viewType, refetchMy, refetchPublic]);

  const handleJoinLeague = async () => {
    try {
      await joinLeague(joinCode.toUpperCase());
      setShowJoinDialog(false);
      setJoinCode('');
      await queryClient.invalidateQueries({ queryKey: ['myLeagues'] });
      Alert.alert('Successo', 'Ti sei unito alla lega!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Codice non valido o lega piena.';
      Alert.alert('Errore', errorMessage);
    }
  };

  const renderLeagueCard = ({ item: league }: { item: League }) => {
    const isFull = league.currentTeams >= league.maxTeams;

    return (
      <Card 
        style={styles.leagueCard}
        onPress={() => navigation.navigate('LeagueDetail', { leagueId: league.id })}
      >
        <Card.Title
          title={league.name}
          subtitle={`${league.currentTeams}/${league.maxTeams} team`}
          left={(props) => (
            <Avatar.Icon 
              {...props} 
              icon={league.isPrivate ? 'lock' : 'earth'}
              style={{ backgroundColor: league.isPrivate ? '#666' : '#4CAF50' }}
            />
          )}
        />
        <Card.Content>
          <View style={styles.leagueInfo}>
            <Chip icon="currency-eur" style={styles.chip}>{league.budget} crediti</Chip>
            <Chip icon="key" style={styles.chip}>{league.code}</Chip>
          </View>
          {league.userPoints != null && (
            <View style={styles.userStats}>
              <Text variant="labelLarge">I tuoi punti: {league.userPoints}</Text>
              {league.userPosition && (
                <Text variant="bodyMedium" style={styles.position}>
                  Posizione: {league.userPosition}°
                </Text>
              )}
            </View>
          )}
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => navigation.navigate('LeagueDetail', { leagueId: league.id })}>
            Vedi Dettagli
          </Button>
          {!isFull && viewType === 'public' && (
            <Button mode="contained">Unisciti</Button>
          )}
        </Card.Actions>
      </Card>
    );
  };

  const isLoading = viewType === 'my' ? loadingMy : loadingPublic;
  const leagues = viewType === 'my' ? myLeagues : publicLeagues;
  const filteredLeagues = leagues.filter(league => 
    league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    league.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={viewType}
        onValueChange={(value) => setViewType(value as 'my' | 'public')}
        buttons={[
          { value: 'my', label: 'Le Mie Leghe' },
          { value: 'public', label: 'Leghe Pubbliche' },
        ]}
        style={styles.segmentedButtons}
      />

      <Searchbar
        placeholder="Cerca lega..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      ) : filteredLeagues.length > 0 ? (
        <FlatList
          data={filteredLeagues}
          renderItem={renderLeagueCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#FF6B00']}
            />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#FF6B00']}
            />
          }
        >
          <MaterialCommunityIcons 
            name="trophy-outline" 
            size={80} 
            color="#ccc" 
          />
          <Title style={styles.emptyTitle}>
            {viewType === 'my' ? 'Nessuna lega trovata' : 'Nessuna lega pubblica'}
          </Title>
          <Paragraph style={styles.emptyText}>
            {viewType === 'my' 
              ? 'Unisciti a una lega o creane una tua per iniziare a giocare!'
              : 'Non ci sono leghe pubbliche disponibili al momento.'
            }
          </Paragraph>
          {viewType === 'my' && (
            <View style={styles.emptyActions}>
              <Button 
                mode="outlined" 
                style={styles.actionButton}
                onPress={() => setShowJoinDialog(true)}
              >
                Unisciti con codice
              </Button>
              <Button 
                mode="contained" 
                style={styles.actionButton}
                onPress={() => navigation.navigate('CreateLeague')}
              >
                Crea Lega
              </Button>
            </View>
          )}
        </ScrollView>
      )}

      {viewType === 'my' && filteredLeagues.length > 0 && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('CreateLeague')}
        />
      )}
      
      <Portal>
        <Dialog visible={showJoinDialog} onDismiss={() => setShowJoinDialog(false)}>
          <Dialog.Title>Unisciti a una Lega</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Codice Lega"
              value={joinCode}
              onChangeText={setJoinCode}
              mode="outlined"
              autoCapitalize="characters"
              placeholder="ES: ABC123"
              maxLength={6}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowJoinDialog(false)}>Annulla</Button>
            <Button 
              onPress={handleJoinLeague} 
              disabled={!joinCode || joinCode.length < 6}
              mode="contained"
            >
              Unisciti
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  segmentedButtons: {
    margin: 16,
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  leagueCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  leagueInfo: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  chip: {
    height: 28,
  },
  userStats: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  position: {
    color: '#666',
    marginTop: 4,
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
  emptyActions: {
    marginTop: 24,
    gap: 12,
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF6B00',
  },
});