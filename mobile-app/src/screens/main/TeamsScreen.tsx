// mobile-app/src/screens/main/TeamsScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
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
  Dialog,
  Divider
} from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyTeams, getMyLeagues, getUpcomingRaces, getLineup } from '../../services/api';
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
  const [teamLineupStatus, setTeamLineupStatus] = useState<Record<string, boolean>>({});

  const { data: teamsData, isLoading: loadingTeams, refetch: refetchTeams } = useQuery({
    queryKey: ['myTeams'],
    queryFn: getMyTeams,
  });

  const { data: leaguesData } = useQuery({
    queryKey: ['myLeagues'],
    queryFn: getMyLeagues,
  });

  // Query per la prossima gara
  const { data: raceData } = useQuery({
    queryKey: ['upcomingRaces'],
    queryFn: getUpcomingRaces,
  });
  const upcomingRace = raceData?.races?.[0];

  const teams = teamsData?.teams || [];
  const leagues = leaguesData?.leagues || [];

  // Leghe in cui non ho ancora un team
  const leaguesWithoutTeam = leagues.filter(
    (league: League) => !teams.some((team: Team) => team.league.id === league.id)
  );

  // Controlla lo stato dello schieramento per ogni team quando cambia la lista dei team o la gara
  useEffect(() => {
    const checkLineupStatus = async () => {
      if (!upcomingRace || teams.length === 0) return;
      
      const statusMap: Record<string, boolean> = {};
      
      // Controlla lo schieramento per ogni team
      for (const team of teams) {
        try {
          const response = await getLineup(team.id, upcomingRace.id);
          statusMap[team.id] = !!response.lineup;
        } catch (error) {
          statusMap[team.id] = false;
        }
      }
      
      setTeamLineupStatus(statusMap);
    };

    checkLineupStatus();
  }, [teams, upcomingRace]);

  // Refresh automatico quando la schermata diventa attiva
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['myTeams'] });
      queryClient.invalidateQueries({ queryKey: ['myLeagues'] });
      queryClient.invalidateQueries({ queryKey: ['upcomingRaces'] });
    }, [queryClient])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchTeams(), 
        queryClient.invalidateQueries({ queryKey: ['myLeagues'] }),
        queryClient.invalidateQueries({ queryKey: ['upcomingRaces'] })
      ]);
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

  const renderTeamCard = ({ item: team }: { item: Team }) => {
    const hasLineup = teamLineupStatus[team.id];
    
    return (
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
            <View style={styles.rightContainer}>
              {hasLineup && upcomingRace && (
                <Chip 
                  icon="check-circle" 
                  mode="flat"
                  style={styles.lineupChip}
                  textStyle={styles.lineupChipText}
                >
                  Schierato
                </Chip>
              )}
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
                  title={hasLineup ? "Modifica Schieramento" : "Schiera Formazione"} 
                  leadingIcon={hasLineup ? "pencil" : "rocket-launch-outline"}
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
            </View>
          )}
        />
        <Card.Content>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetLabel}>Budget rimanente:</Text>
            <Text style={[
              styles.budgetValue, 
              { color: team.remainingBudget >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              {team.remainingBudget} crediti
            </Text>
          </View>
          {team.totalPoints !== undefined && team.totalPoints > 0 && (
            <View style={styles.pointsInfo}>
              <Text style={styles.pointsLabel}>Punti totali:</Text>
              <Text style={styles.pointsValue}>{team.totalPoints}</Text>
            </View>
          )}
        
          {selectedTeam === team.id && (
            <>
              <Divider style={{ marginVertical: 8 }} />
              <View style={styles.expandedContent}>
                {['MOTOGP', 'MOTO2', 'MOTO3'].map((category) => {
                  const categoryRiders = team.riders.filter(tr => tr.rider.category === category);
                  if (categoryRiders.length === 0) return null;
                  
                  return (
                    <View key={category} style={styles.categorySection}>
                      <Text style={[styles.categoryTitle, { color: getCategoryColor(category) }]}>
                        {category}
                      </Text>
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
                icon={hasLineup ? "pencil" : "rocket-launch-outline"}
              >
                {hasLineup ? 'Modifica Schieramento' : 'Gestisci Schieramenti'}
              </Button>
            </>
          )}
        </Card.Content>
      </Card>
    );
  };

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
        </View>
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          if (leaguesWithoutTeam.length > 0) {
            setShowLeagueSelector(true);
          } else {
            navigation.navigate('Leagues' as any);
          }
        }}
        label={leaguesWithoutTeam.length > 0 ? "Crea Team" : "Unisciti a Lega"}
      />

      <Portal>
        <Dialog visible={showLeagueSelector} onDismiss={() => setShowLeagueSelector(false)}>
          <Dialog.Title>Seleziona una lega</Dialog.Title>
          <Dialog.Content>
            {leaguesWithoutTeam.map((league: League) => (
              <List.Item
                key={league.id}
                title={league.name}
                description={`${league.currentTeams}/${league.maxTeams} team`}
                onPress={() => handleCreateTeam(league.id)}
                left={(props) => <List.Icon {...props} icon="trophy" />}
              />
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLeagueSelector(false)}>Annulla</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchbar: { margin: 16 },
  listContent: { padding: 16, paddingBottom: 80 },
  teamCard: { marginBottom: 16 },
  leagueInfoContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  leagueName: { marginLeft: 4, color: '#666', flex: 1 },
  leagueCode: { marginLeft: 8, backgroundColor: '#e0e0e0' },
  rightContainer: { flexDirection: 'row', alignItems: 'center' },
  lineupChip: { marginRight: 8, backgroundColor: '#4CAF50', height: 28 },
  lineupChipText: { fontSize: 12, color: 'white' },
  budgetInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  budgetLabel: { color: '#666' },
  budgetValue: { fontWeight: 'bold' },
  pointsInfo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  pointsLabel: { color: '#666' },
  pointsValue: { fontWeight: 'bold', color: '#FF6B00' },
  expandedContent: { marginTop: 8 },
  categorySection: { marginBottom: 12 },
  categoryTitle: { fontWeight: 'bold', marginBottom: 4 },
  riderName: { fontSize: 14 },
  riderValue: { fontSize: 12 },
  manageButton: { marginTop: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { marginTop: 16, color: '#666' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 8 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});