// mobile-app/src/screens/main/TeamsScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native';
import { 
  Card, 
  Text, 
  Title, 
  Paragraph, 
  Button, 
  FAB, 
  Avatar, 
  List, 
  ActivityIndicator, 
  Searchbar, 
  Menu, 
  IconButton,
  Chip,
  Badge,
  Portal,
  Dialog
} from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyTeams, getMyLeagues } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../../../App';
import { useAuth } from '../../contexts/AuthContext';

interface Team {
  id: string;
  name: string;
  league: {
    id: string;
    name: string;
    budget: number;
    code: string;
    isPrivate: boolean;
  };
  riders: Array<{
    rider: {
      id: string;
      name: string;
      number: number;
      category: string;
      value: number;
    };
  }>;
  totalPoints?: number;
  remainingBudget: number;
}

interface League {
  id: string;
  name: string;
  code: string;
  currentTeams: number;
  maxTeams: number;
}

type TeamsScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Tabs'>;

export default function TeamsScreen() {
  const navigation = useNavigation<TeamsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showLeagueSelector, setShowLeagueSelector] = useState(false);

  const { data: teamsData, isLoading: loadingTeams, refetch: refetchTeams } = useQuery({
    queryKey: ['myTeams'],
    queryFn: getMyTeams,
  });

  const { data: leaguesData } = useQuery({
    queryKey: ['myLeagues'],
    queryFn: getMyLeagues,
  });

  const teams = teamsData?.teams || [];
  const leagues = leaguesData?.leagues || [];

  // Leghe in cui non ho ancora un team
  const leaguesWithoutTeam = leagues.filter(
    (league: League) => !teams.some((team: Team) => team.league.id === league.id)
  );

  // Refresh automatico quando la schermata diventa attiva
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['myTeams'] });
      queryClient.invalidateQueries({ queryKey: ['myLeagues'] });
    }, [queryClient])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchTeams(), queryClient.invalidateQueries({ queryKey: ['myLeagues'] })]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchTeams, queryClient]);

  const filteredTeams = teams.filter((team: Team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.league.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTeam = (leagueId: string) => {
    navigation.navigate('CreateTeam', { leagueId });
    setShowLeagueSelector(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MOTOGP': return '#FF6B00';
      case 'MOTO2': return '#4CAF50';
      case 'MOTO3': return '#2196F3';
      default: return '#666';
    }
  };

  const renderTeamCard = ({ item: team }: { item: Team }) => (
    <Card 
      style={styles.teamCard}
      onPress={() => setSelectedTeam(team.id === selectedTeam ? null : team.id)}
    >
      <Card.Title
        title={team.name}
        subtitle={
          <View style={styles.leagueInfoContainer}>
            <MaterialCommunityIcons 
              name={team.league.isPrivate ? 'lock' : 'earth'} 
              size={16} 
              color="#666" 
            />
            <Text style={styles.leagueName}>{team.league.name}</Text>
            <Badge style={styles.leagueCode}>{team.league.code}</Badge>
          </View>
        }
        left={(props) => (
          <Avatar.Text 
            {...props} 
            label={team.name.substring(0, 2).toUpperCase()} 
            style={{ backgroundColor: '#FF6B00' }} 
          />
        )}
        right={() => (
          <Menu 
            visible={menuVisible === team.id} 
            onDismiss={() => setMenuVisible(null)} 
            anchor={
              <IconButton 
                icon="dots-vertical" 
                onPress={() => setMenuVisible(team.id)} 
              />
            }
          >
            <Menu.Item 
              onPress={() => {
                setMenuVisible(null);
                navigation.navigate('Lineup', { teamId: team.id, race: null });
              }} 
              title="Schiera Formazione" 
              leadingIcon="formation" 
            />
            <Menu.Item 
              onPress={() => {
                setMenuVisible(null);
                // TODO: Implementare statistiche
              }} 
              title="Statistiche" 
              leadingIcon="chart-line" 
            />
          </Menu>
        )}
      />
      <Card.Content>
        <View style={styles.budgetInfo}>
          <Text style={styles.budgetLabel}>Budget rimanente:</Text>
          <Text style={[
            styles.budgetValue, 
            { color: team.remainingBudget >= 0 ? '#4CAF50' : '#F44336' }
          ]}>
            {team.remainingBudget.toLocaleString()} crediti
          </Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
            <Text style={styles.statValue}>{team.totalPoints || 0} pts</Text>
          </View>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="account-group" size={20} color="#666" />
            <Text style={styles.statValue}>{team.riders.length}/9 piloti</Text>
          </View>
        </View>
        {selectedTeam === team.id && (
          <View style={styles.expandedContent}>
            <Title style={styles.sectionTitle}>Composizione Team</Title>
            <View style={styles.categorySection}>
              {['MOTOGP', 'MOTO2', 'MOTO3'].map(category => {
                const categoryRiders = team.riders.filter(tr => tr.rider.category === category);
                return (
                  <View key={category} style={styles.categoryContainer}>
                    <View style={styles.categoryHeader}>
                      <Chip 
                        style={[styles.categoryChip, { backgroundColor: getCategoryColor(category) }]}
                        textStyle={{ color: 'white' }}
                      >
                        {category}
                      </Chip>
                      <Text style={styles.categoryCount}>
                        {categoryRiders.length}/3
                      </Text>
                    </View>
                    {categoryRiders.map((teamRider) => (
                      <List.Item
                        key={teamRider.rider.id}
                        title={`${teamRider.rider.number}. ${teamRider.rider.name}`}
                        description={`${teamRider.rider.value.toLocaleString()} crediti`}
                        left={(props) => (
                          <Avatar.Text 
                            {...props} 
                            label={teamRider.rider.number.toString()} 
                            size={36} 
                            style={{ 
                              backgroundColor: getCategoryColor(category),
                              marginRight: 8 
                            }} 
                          />
                        )}
                        titleStyle={styles.riderName}
                        descriptionStyle={styles.riderValue}
                      />
                    ))}
                  </View>
                );
              })}
            </View>
            <Button 
              mode="contained" 
              style={styles.manageButton}
              onPress={() => navigation.navigate('Lineup', { teamId: team.id, race: null })}
            >
              Gestisci Schieramenti
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  if (loadingTeams) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar 
        placeholder="Cerca team o lega" 
        onChangeText={setSearchQuery} 
        value={searchQuery} 
        style={styles.searchbar} 
      />
      
      {filteredTeams.length > 0 ? (
        <FlatList
          data={filteredTeams}
          renderItem={renderTeamCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#FF6B00']}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-group-outline" size={80} color="#ccc" />
          <Title style={styles.emptyTitle}>Nessun team trovato</Title>
          <Paragraph style={styles.emptyText}>
            {teams.length === 0 
              ? 'Non hai ancora creato nessun team. Unisciti a una lega per iniziare!'
              : 'Nessun risultato per la ricerca.'}
          </Paragraph>
          {teams.length === 0 && (
            <Button 
              mode="contained" 
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Leagues')}
            >
              Vai alle Leghe
            </Button>
          )}
        </View>
      )}

      {/* FAB con menu per creare team */}
      {leaguesWithoutTeam.length > 0 && (
        <>
          <FAB
            icon="plus"
            style={styles.fab}
            onPress={() => {
              if (leaguesWithoutTeam.length === 1) {
                handleCreateTeam(leaguesWithoutTeam[0].id);
              } else {
                setShowLeagueSelector(true);
              }
            }}
          />
          
          <Portal>
            <Dialog visible={showLeagueSelector} onDismiss={() => setShowLeagueSelector(false)}>
              <Dialog.Title>Seleziona Lega</Dialog.Title>
              <Dialog.Content>
                <Paragraph style={styles.dialogText}>
                  In quale lega vuoi creare un team?
                </Paragraph>
                {leaguesWithoutTeam.map((league: League) => (
                  <List.Item
                    key={league.id}
                    title={league.name}
                    description={`${league.currentTeams}/${league.maxTeams} team • Codice: ${league.code}`}
                    left={(props) => (
                      <List.Icon {...props} icon="trophy" color="#FF6B00" />
                    )}
                    onPress={() => handleCreateTeam(league.id)}
                    style={styles.leagueItem}
                  />
                ))}
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setShowLeagueSelector(false)}>Annulla</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchbar: {
    margin: 16,
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 80,
  },
  teamCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  leagueInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  leagueName: {
    marginLeft: 4,
    color: '#666',
    flex: 1,
  },
  leagueCode: {
    marginLeft: 8,
    backgroundColor: '#E0E0E0',
  },
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  budgetLabel: {
    fontSize: 14,
    color: '#666',
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: 12,
    gap: 24,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  categorySection: {
    gap: 16,
  },
  categoryContainer: {
    marginBottom: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryChip: {
    height: 28,
  },
  categoryCount: {
    fontSize: 14,
    color: '#666',
  },
  riderName: {
    fontSize: 14,
  },
  riderValue: {
    fontSize: 12,
    color: '#666',
  },
  manageButton: {
    marginTop: 16,
    backgroundColor: '#FF6B00',
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
  emptyButton: {
    marginTop: 24,
    backgroundColor: '#FF6B00',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF6B00',
  },
  dialogText: {
    marginBottom: 16,
  },
  leagueItem: {
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: '#f8f8f8',
  },
});