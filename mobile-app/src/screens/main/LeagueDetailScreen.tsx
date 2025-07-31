// mobile-app/src/screens/main/LeagueDetailScreen.tsx
import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { 
  ActivityIndicator, 
  Card, 
  List, 
  Text, 
  Title, 
  DataTable, 
  Avatar, 
  Button,
  Chip,
  Divider,
  Banner
} from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLeagueDetails } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '../../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type LeagueDetailNavigationProp = StackNavigationProp<MainStackParamList, 'LeagueDetail'>;

export default function LeagueDetailScreen({ route }: any) {
  const { leagueId } = route.params;
  const { user } = useAuth();
  const navigation = useNavigation<LeagueDetailNavigationProp>();
  const queryClient = useQueryClient();

  const { data: leagueData, isLoading, isError, refetch } = useQuery({
    queryKey: ['leagueDetails', leagueId],
    queryFn: () => getLeagueDetails(leagueId),
  });

  const onRefresh = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['leagueDetails', leagueId] });
  }, [leagueId, queryClient]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  if (isError || !leagueData?.league) {
    return (
      <View style={styles.loader}>
        <Text>Impossibile caricare i dati della lega.</Text>
        <Button onPress={() => refetch()}>Riprova</Button>
      </View>
    );
  }

  const { league } = leagueData;
  const userTeam = league.teams.find((team: any) => team.userId === user?.id);
  const userHasTeamInLeague = !!userTeam;
  const isMember = league.isMember;
  const isFull = league.teams.length >= league.maxTeams;

  // Ordiniamo la classifica: meno punti = migliore posizione
  const sortedStandings = [...league.standings].sort((a, b) => a.totalPoints - b.totalPoints);

  const handleCreateTeam = () => {
    if (!isMember) {
      Alert.alert(
        'Non sei membro',
        'Devi prima unirti a questa lega per creare un team.',
        [
          { text: 'Annulla', style: 'cancel' },
          { 
            text: 'Unisciti', 
            onPress: () => {
              // TODO: Implementare join dalla schermata di dettaglio
              navigation.goBack();
            }
          }
        ]
      );
      return;
    }

    if (isFull) {
      Alert.alert('Lega Piena', 'Questa lega ha raggiunto il numero massimo di team.');
      return;
    }

    navigation.navigate('CreateTeam', { leagueId: league.id });
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
    >
      {/* Card Info Lega */}
      <Card style={styles.card}>
        <Card.Title
          title={league.name}
          subtitle={`Codice: ${league.code}`}
          left={(props) => (
            <Avatar.Icon 
              {...props} 
              icon={league.isPrivate ? 'lock' : 'earth'}
              style={{ backgroundColor: league.isPrivate ? '#666' : '#4CAF50' }}
            />
          )}
        />
        <Card.Content>
          <View style={styles.leagueStats}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account-group" size={24} color="#666" />
              <Text style={styles.statLabel}>Team</Text>
              <Text style={styles.statValue}>{league.teams.length}/{league.maxTeams}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="currency-eur" size={24} color="#666" />
              <Text style={styles.statLabel}>Budget</Text>
              <Text style={styles.statValue}>{league.budget}</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="trophy" size={24} color="#FFD700" />
              <Text style={styles.statLabel}>Stato</Text>
              <Text style={styles.statValue}>{isFull ? 'Piena' : 'Aperta'}</Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          {/* Stato utente nella lega */}
          {isMember ? (
            <View style={styles.membershipInfo}>
              <Chip icon="check-circle" style={styles.memberChip}>
                Sei membro di questa lega
              </Chip>
              {userTeam && (
                <View style={styles.userTeamInfo}>
                  <Text style={styles.userTeamName}>Il tuo team: {userTeam.teamName}</Text>
                  <Text style={styles.userTeamStats}>
                    Posizione: {sortedStandings.findIndex(s => s.teamId === userTeam.teamId) + 1}° • 
                    Punti: {userTeam.totalPoints}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Banner
              visible={true}
              icon="information"
              style={styles.banner}
            >
              Non sei ancora membro di questa lega. Usa il codice {league.code} per unirti.
            </Banner>
          )}
          
          {/* Azioni disponibili */}
          {isMember && !userHasTeamInLeague && !isFull && (
            <Button 
              mode="contained" 
              onPress={handleCreateTeam}
              style={styles.createTeamButton}
              icon="plus"
            >
              Crea il tuo team
            </Button>
          )}
          
          {isFull && !userHasTeamInLeague && (
            <Banner
              visible={true}
              icon="alert"
              style={[styles.banner, { backgroundColor: '#FFF3E0' }]}
            >
              Questa lega è piena. Non è possibile creare nuovi team.
            </Banner>
          )}
        </Card.Content>
      </Card>

      {/* Card Classifica */}
      <Card style={styles.card}>
        <Card.Title 
          title="Classifica" 
          subtitle="Ricorda: nel Fanta-MotoGP vince chi fa meno punti!"
          left={(props) => <Avatar.Icon {...props} icon="podium" />}
        />
        
        {sortedStandings.length > 0 ? (
          <DataTable>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 0.5 }}>Pos.</DataTable.Title>
              <DataTable.Title style={{ flex: 2 }}>Team</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 1 }}>Punti</DataTable.Title>
            </DataTable.Header>

            {sortedStandings.map((item, index) => {
              const isUserTeam = item.userId === user?.id;
              const isPodium = index < 3;
              
              return (
                <DataTable.Row 
                  key={item.teamId} 
                  style={[
                    isUserTeam && styles.userRow,
                    isPodium && styles.podiumRow
                  ]}
                >
                  <DataTable.Cell style={{ flex: 0.5 }}>
                    <View style={styles.positionCell}>
                      {isPodium && (
                        <MaterialCommunityIcons 
                          name={index === 0 ? 'trophy' : index === 1 ? 'medal' : 'medal-outline'} 
                          size={20} 
                          color={index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'} 
                        />
                      )}
                      <Text style={[styles.positionText, isPodium && styles.podiumText]}>
                        {index + 1}
                      </Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={{ flex: 2 }}>
                    <View>
                      <Text style={[styles.teamName, isUserTeam && styles.userTeamName]}>
                        {item.teamName}
                      </Text>
                      <Text style={styles.username}>{item.username}</Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell numeric style={{ flex: 1 }}>
                    <Text style={[styles.points, isUserTeam && styles.userPoints]}>
                      {item.totalPoints}
                    </Text>
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })}
          </DataTable>
        ) : (
          <Card.Content>
            <Text style={styles.emptyText}>
              Nessun team ha ancora totalizzato punti in questa lega.
            </Text>
          </Card.Content>
        )}
      </Card>

      {/* Card Membri */}
      <Card style={[styles.card, styles.lastCard]}>
        <Card.Title 
          title="Membri della Lega" 
          subtitle={`${league.members.length} partecipanti`}
          left={(props) => <Avatar.Icon {...props} icon="account-multiple" />}
        />
        <Card.Content>
          {league.members.map((member: any) => (
            <List.Item
              key={member.user.id}
              title={member.user.username}
              description={member.role === 'ADMIN' ? 'Amministratore' : 'Membro'}
              left={(props) => (
                <Avatar.Text 
                  {...props} 
                  label={member.user.username.substring(0, 2).toUpperCase()} 
                  size={40}
                  style={{ backgroundColor: member.role === 'ADMIN' ? '#FF6B00' : '#666' }}
                />
              )}
              right={() => member.role === 'ADMIN' && (
                <Chip icon="crown" style={styles.adminChip}>Admin</Chip>
              )}
            />
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  card: { 
    margin: 16, 
    marginBottom: 0,
    elevation: 2,
  },
  lastCard: {
    marginBottom: 16,
  },
  loader: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  leagueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  divider: {
    marginVertical: 16,
  },
  membershipInfo: {
    marginBottom: 16,
  },
  memberChip: {
    alignSelf: 'center',
    backgroundColor: '#E8F5E9',
  },
  userTeamInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  userTeamName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userTeamStats: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  banner: {
    marginBottom: 16,
  },
  createTeamButton: {
    marginTop: 16,
    backgroundColor: '#FF6B00',
  },
  userRow: {
    backgroundColor: '#FFF3E0',
  },
  podiumRow: {
    backgroundColor: '#F5F5F5',
  },
  positionCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  positionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  podiumText: {
    fontWeight: 'bold',
  },
  teamName: {
    fontSize: 14,
    fontWeight: '500',
  },
  username: {
    fontSize: 12,
    color: '#666',
  },
  points: {
    fontSize: 16,
    fontWeight: '500',
  },
  userPoints: {
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    paddingVertical: 24,
  },
  adminChip: {
    backgroundColor: '#FFF3E0',
  },
});