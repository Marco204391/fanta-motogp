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

export default function LeaguesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [viewType, setViewType] = useState('my');
  const [refreshing, setRefreshing] = useState(false);

  const { data: myLeagues, isLoading: loadingMy, refetch: refetchMy } = useQuery({
    queryKey: ['myLeagues'],
    queryFn: getMyLeagues,
  });

  const { data: publicLeagues, isLoading: loadingPublic, refetch: refetchPublic } = useQuery({
    queryKey: ['publicLeagues'],
    queryFn: getPublicLeagues,
    enabled: viewType === 'public',
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
        onPress={() => {/* Naviga ai dettagli lega */}}
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
          right={() => (
            <View style={styles.rightContent}>
              {league.userPosition && (
                <View style={styles.positionBadge}>
                  <Text style={styles.positionText}>#{league.userPosition}</Text>
                </View>
              )}
              {isFull && (
                <Chip 
                  mode="flat" 
                  style={styles.fullChip}
                  textStyle={{ fontSize: 12, color: '#fff' }}
                >
                  COMPLETA
                </Chip>
              )}
            </View>
          )}
        />
        
        <Card.Content>
          <View style={styles.leagueInfo}>
            <View style={styles.infoItem}>
              <MaterialCommunityIcons name="cash" size={20} color="#666" />
              <Text style={styles.infoText}>
                Budget: €{league.budget.toLocaleString()}
              </Text>
            </View>
            {league.userPoints !== undefined && (
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
                <Text style={styles.infoText}>{league.userPoints} pts</Text>
              </View>
            )}
          </View>

          {league.code && viewType === 'my' && (
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Codice invito:</Text>
              <Text style={styles.codeValue}>{league.code}</Text>
            </View>
          )}
        </Card.Content>

        <Card.Actions>
          <Button mode="text" onPress={() => {/* Vedi classifica */}}>
            Classifica
          </Button>
          {viewType === 'public' && !isFull && (
            <Button mode="contained" onPress={() => {/* Unisciti */}}>
              Unisciti
            </Button>
          )}
        </Card.Actions>
      </Card>
    );
  };

  const isLoading = viewType === 'my' ? loadingMy : loadingPublic;
  const leagues = viewType === 'my' ? myLeagues : publicLeagues;

  const filteredLeagues = leagues?.filter((league: League) =>
    league.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={viewType}
        onValueChange={setViewType}
        buttons={[
          {
            value: 'my',
            label: 'Le Mie Leghe',
            icon: 'account-group',
          },
          {
            value: 'public',
            label: 'Leghe Pubbliche',
            icon: 'earth',
          },
        ]}
        style={styles.segmentedButtons}
      />

      <Searchbar
        placeholder="Cerca lega"
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
                onPress={() => {/* Naviga a creazione lega */}}
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
            onPress: () => {/* Naviga a creazione lega */},
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
              placeholder="Inserisci il codice della lega"
              autoCapitalize="characters"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowJoinDialog(false)}>Annulla</Button>
            <Button 
              onPress={handleJoinLeague}
              disabled={!joinCode}
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
    marginBottom: 8,
  },
  searchbar: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  positionBadge: {
    backgroundColor: '#FF6B00',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  positionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fullChip: {
    backgroundColor: '#F44336',
  },
  leagueInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  codeLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  codeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
    backgroundColor: '#FF6B00',
  },
});