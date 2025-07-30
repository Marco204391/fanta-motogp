import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SectionList,
  RefreshControl
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
import { useQuery } from '@tanstack/react-query';
import { getMyLeagues, getPublicLeagues, joinLeague } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [viewType, setViewType] = useState('my');
  const [refreshing, setRefreshing] = useState(false);

  const { data: myLeagues, isLoading: loadingMy, refetch: refetchMy } = useQuery({
    queryKey: ['myLeagues'],
    queryFn: getMyLeagues,
    select: (data) => data.leagues,
  });

  const { data: publicLeagues, isLoading: loadingPublic, refetch: refetchPublic } = useQuery({
    queryKey: ['publicLeagues'],
    queryFn: getPublicLeagues,
    enabled: viewType === 'public',
    select: (data) => data.leagues,
  });

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    const refetch = viewType === 'my' ? refetchMy : refetchPublic;
    refetch().finally(() => setRefreshing(false));
  }, [viewType, refetchMy, refetchPublic]);

  const handleJoinLeague = async () => {
    try {
      await joinLeague(joinCode);
      setShowJoinDialog(false);
      setJoinCode('');
      refetchMy();
    } catch (error) {
      console.error('Errore nell\'unirsi alla lega:', error);
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
          {league.userPosition && (
            <View style={styles.userStats}>
              <Text variant="labelLarge">Posizione: {league.userPosition}°</Text>
              <Text variant="labelLarge" style={styles.points}>{league.userPoints} pts</Text>
            </View>
          )}
        </Card.Content>
        <Card.Actions>
          <Button disabled={isFull}>
            {isFull ? 'Lega Piena' : 'Dettagli'}
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  const isLoading = viewType === 'my' ? loadingMy : loadingPublic;
  const leagues = viewType === 'my' ? myLeagues : publicLeagues;
  const filteredLeagues = leagues?.filter(league => 
    league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    league.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={viewType}
        onValueChange={setViewType}
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      ) : filteredLeagues?.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredLeagues.map((league: League) => (
            <View key={league.id}>
              {renderLeagueCard({ item: league })}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="trophy-outline" 
            size={80} 
            color="#ccc" 
          />
          <Title style={styles.emptyTitle}>
            {viewType === 'my' ? 'Nessuna lega' : 'Nessuna lega pubblica'}
          </Title>
          <Paragraph style={styles.emptyText}>
            {viewType === 'my' 
              ? 'Unisciti a una lega o creane una tua!'
              : 'Non ci sono leghe pubbliche disponibili al momento'
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
        </View>
      )}

      <FAB.Group
        open={false}
        visible={viewType === 'my'}
        icon="plus"
        actions={[
          {
            icon: 'plus',
            label: 'Crea Lega',
            onPress: () => navigation.navigate('CreateLeague'),
          },
          {
            icon: 'key',
            label: 'Unisciti con Codice',
            onPress: () => setShowJoinDialog(true),
          },
        ]}
        onStateChange={() => {}}
        fabStyle={styles.fab}
      />

      {/* Dialog per unirsi con codice */}
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
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowJoinDialog(false)}>Annulla</Button>
            <Button onPress={handleJoinLeague} disabled={!joinCode}>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  leagueCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  leagueInfo: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    height: 28,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  points: {
    color: '#FF6B00',
    fontWeight: 'bold',
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
  },
  actionButton: {
    minWidth: 200,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF6B00',
  },
});