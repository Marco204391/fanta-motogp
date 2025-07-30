import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
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
  Menu,
  IconButton
} from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { getMyTeams } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Team {
  id: string;
  name: string;
  budget: number;
  league: {
    id: string;
    name: string;
  };
  riders: Array<{
    rider: {
      id: string;
      name: string;
      number: number;
      category: string;
      value: number;
    };
    isCaptain: boolean;
  }>;
  totalPoints?: number;
}

export default function TeamsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: teams, isLoading, refetch } = useQuery({
    queryKey: ['myTeams'],
    queryFn: getMyTeams,
  
    select: (data) => data.teams,
  });

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  }, [refetch]);

  const filteredTeams = teams?.filter((team: Team) =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.league.name.toLowerCase().includes(searchQuery.toLowerCase())
  )|| [];

  const calculateTeamValue = (team: Team) => {
    return team.riders.reduce((sum, r) => sum + r.rider.value, 0);
  };

  const renderTeamCard = ({ item: team }: { item: Team }) => {
    const teamValue = calculateTeamValue(team);
    const remainingBudget = team.budget - teamValue;

    return (
      <Card 
        style={styles.teamCard}
        onPress={() => setSelectedTeam(team.id === selectedTeam ? null : team.id)}
      >
        <Card.Title
          title={team.name}
          subtitle={`Lega: ${team.league.name}`}
          left={(props) => (
            <Avatar.Text 
              {...props} 
              label={team.name.substring(0, 2).toUpperCase()}
              style={{ backgroundColor: '#FF6B00' }}
            />
          )}
          right={(props) => (
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
                  // Naviga a modifica team
                }} 
                title="Modifica"
                leadingIcon="pencil"
              />
              <Menu.Item 
                onPress={() => {
                  setMenuVisible(null);
                  // Mostra statistiche
                }} 
                title="Statistiche"
                leadingIcon="chart-line"
              />
              <Menu.Item 
                onPress={() => {
                  setMenuVisible(null);
                  // Elimina team
                }} 
                title="Elimina"
                leadingIcon="delete"
              />
            </Menu>
          )}
        />
        
        <Card.Content>
          <View style={styles.budgetInfo}>
            <Text style={styles.budgetLabel}>Budget rimanente:</Text>
            <Text style={[
              styles.budgetValue,
              { color: remainingBudget >= 0 ? '#4CAF50' : '#F44336' }
            ]}>
              €{remainingBudget.toLocaleString()}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <MaterialCommunityIcons name="trophy" size={20} color="#FFD700" />
              <Text style={styles.statValue}>{team.totalPoints || 0} pts</Text>
            </View>
            <View style={styles.stat}>
              <MaterialCommunityIcons name="account-group" size={20} color="#666" />
              <Text style={styles.statValue}>{team.riders.length}/5 piloti</Text>
            </View>
          </View>

          {selectedTeam === team.id && (
            <View style={styles.expandedContent}>
              <Title style={styles.sectionTitle}>Piloti</Title>
              {team.riders.map((teamRider) => (
                <List.Item
                  key={teamRider.rider.id}
                  title={`${teamRider.rider.number}. ${teamRider.rider.name}`}
                  description={`${teamRider.rider.category} - €${teamRider.rider.value.toLocaleString()}`}
                  left={(props) => (
                    <Avatar.Text 
                      {...props} 
                      label={teamRider.rider.number.toString()}
                      size={40}
                      style={{ backgroundColor: '#1E1E1E' }}
                    />
                  )}
                  right={() => teamRider.isCaptain && (
                    <Chip 
                      mode="flat" 
                      style={styles.captainChip}
                      textStyle={{ fontSize: 12 }}
                    >
                      C
                    </Chip>
                  )}
                />
              ))}
              
              <Button 
                mode="contained" 
                style={styles.manageButton}
                onPress={() => {/* Naviga a gestione team */}}
              >
                Gestisci Team
              </Button>
            </View>
          )}
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

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Cerca team o lega"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchbar}
      />

      {filteredTeams?.length > 0 ? (
        <FlatList
          data={filteredTeams}
          renderItem={renderTeamCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="account-group-outline" 
            size={80} 
            color="#ccc" 
          />
          <Title style={styles.emptyTitle}>Nessun team trovato</Title>
          <Paragraph style={styles.emptyText}>
            {searchQuery ? 
              'Prova con una ricerca diversa' : 
              'Crea il tuo primo team per iniziare!'
            }
          </Paragraph>
          {!searchQuery && (
            <Button 
              mode="contained" 
              style={styles.createButton}
              onPress={() => {/* Naviga a creazione team */}}
            >
              Crea Team
            </Button>
          )}
        </View>
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {/* Naviga a creazione team */}}
      />
    </View>
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
  searchbar: {
    margin: 16,
    elevation: 2,
  },
  listContent: {
    paddingBottom: 80,
  },
  teamCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  captainChip: {
    backgroundColor: '#FFD700',
    height: 24,
  },
  manageButton: {
    marginTop: 16,
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
  createButton: {
    marginTop: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF6B00',
  },
});