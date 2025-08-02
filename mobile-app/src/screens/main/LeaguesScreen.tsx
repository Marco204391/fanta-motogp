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
  SegmentedButtons,
  Divider
} from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyLeagues, getPublicLeagues, joinLeague } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainStackParamList, MainTabParamList } from '../../../App';

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

type LeaguesScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Leagues'>,
  StackNavigationProp<MainStackParamList>
>;


export default function LeaguesScreen() {
  const navigation = useNavigation<LeaguesScreenNavigationProp>();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showActionsDialog, setShowActionsDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [viewType, setViewType] = useState<'my' | 'public'>('my');
  const [refreshing, setRefreshing] = useState(false);
  
  const { data: myLeaguesData, isLoading: loadingMy, refetch: refetchMy } = useQuery({
    queryKey: ['myLeagues'],
    queryFn: getMyLeagues,
    staleTime: 1000,
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
      return () => {};
    }, [viewType, queryClient])
  );

  useEffect(() => {
    if (viewType === 'my') {
      refetchMy();
    } else {
      refetchPublic();
    }
  }, [viewType, refetchMy, refetchPublic]);

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
    return (
      <Card
        style={styles.leagueCard}
        onPress={() => navigation.navigate('LeagueDetail', { leagueId: league.id })}
      >
        <Card.Title
          title={league.name}
          titleStyle={{ fontWeight: 'bold' }}
          subtitle={`${league.currentTeams}/${league.maxTeams} team`}
          left={(props) => (
            <Avatar.Icon
              {...props}
              icon={league.isPrivate ? 'lock' : 'earth'}
              style={{ backgroundColor: league.isPrivate ? '#666' : '#4CAF50' }}
            />
          )}
          right={() => (
            <View style={styles.rightContainer}>
              <Chip icon="key">{league.code}</Chip>
            </View>
          )}
        />
        {league.userPoints != null && (
          <>
            <Divider />
            <Card.Content style={{ paddingTop: 16 }}>
              <View style={styles.userStats}>
                <Text variant="labelLarge">I tuoi punti: {league.userPoints}</Text>
                {league.userPosition && (
                  <Text variant="bodyMedium" style={styles.position}>
                    Posizione: {league.userPosition}°
                  </Text>
                )}
              </View>
            </Card.Content>
          </>
        )}
      </Card>
    );
  };

  const isLoading = viewType === 'my' ? loadingMy : loadingPublic;
  const leagues = viewType === 'my' ? myLeagues : publicLeagues;
  const filteredLeagues = leagues.filter((league: League) => 
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

      {viewType === 'my' && (
        <FAB
          icon="plus"
          style={styles.fab}
          label="Aggiungi"
          onPress={() => setShowActionsDialog(true)}
        />
      )}
      
      <Portal>
        {/* Dialog per unirsi a una lega */}
        <Dialog visible={showJoinDialog} onDismiss={() => setShowJoinDialog(false)}>
          <Dialog.Title>Unisciti con Codice</Dialog.Title>
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

        {/* Dialog per scegliere tra crea e unisciti */}
        <Dialog visible={showActionsDialog} onDismiss={() => setShowActionsDialog(false)}>
          <Dialog.Title>Aggiungi Lega</Dialog.Title>
          <Dialog.Content>
            <List.Item
              title="Crea una nuova lega"
              left={props => <List.Icon {...props} icon="plus-circle" />}
              onPress={() => {
                setShowActionsDialog(false);
                navigation.navigate('CreateLeague');
              }}
            />
            <List.Item
              title="Unisciti con un codice"
              left={props => <List.Icon {...props} icon="key-variant" />}
              onPress={() => {
                setShowActionsDialog(false);
                setShowJoinDialog(true);
              }}
            />
          </Dialog.Content>
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
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0'
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  userStats: {
    // paddingTop: 8,
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