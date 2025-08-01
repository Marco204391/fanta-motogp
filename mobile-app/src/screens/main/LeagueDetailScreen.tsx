// mobile-app/src/screens/main/LeagueDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import {
  ActivityIndicator, Avatar, Banner, Button, Card, Chip, DataTable, 
  Divider, FAB, IconButton, List, Text, Title, useTheme
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, isBefore } from 'date-fns';
import { it } from 'date-fns/locale';
import { getLeagueById, getMyTeamInLeague, getUpcomingRaces } from '../../services/api';
import { MainStackParamList } from '../../../App';
import { useAuth } from '../../contexts/AuthContext';
import RaceCard from '../../components/RiderCard';

type LeagueDetailScreenRouteProp = RouteProp<MainStackParamList, 'LeagueDetail'>;

interface Standing {
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  totalPoints: number;
  lastRacePoints?: number;
  position?: number;
  trend?: 'up' | 'down' | 'stable';
}

export default function LeagueDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<LeagueDetailScreenRouteProp>();
  const theme = useTheme();
  const { user } = useAuth();
  const { leagueId } = route.params;
  
  const [refreshing, setRefreshing] = useState(false);

  // Query per i dettagli della lega
  const { data: leagueData, isLoading: isLoadingLeague, refetch: refetchLeague } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: () => getLeagueById(leagueId),
  });

  // Query per il mio team nella lega
  const { data: myTeamData } = useQuery({
    queryKey: ['myTeamInLeague', leagueId],
    queryFn: () => getMyTeamInLeague(leagueId),
    enabled: !!user,
  });

  // Query per le prossime gare
  const { data: racesData } = useQuery({
    queryKey: ['upcomingRaces'],
    queryFn: getUpcomingRaces,
  });

  const league = leagueData?.league;
  const standings = leagueData?.standings || [];
  const myTeam = myTeamData?.team;
  const nextRace = racesData?.races?.[0];

  // Calcola statistiche e posizioni
  const sortedStandings = [...standings].sort((a, b) => a.totalPoints - b.totalPoints);
  sortedStandings.forEach((team, index) => {
    team.position = index + 1;
  });

  const myPosition = sortedStandings.findIndex(s => s.userId === user?.id) + 1;
  const isMember = league?.members?.some((m: any) => m.userId === user?.id);
  const isAdmin = league?.members?.find((m: any) => m.userId === user?.id)?.role === 'ADMIN';
  const userHasTeamInLeague = !!myTeam;
  const memberCount = league?.teams?.length || 0;
  const isFull = memberCount >= (league?.maxTeams || 10);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchLeague()]);
    setRefreshing(false);
  };

  const handleCreateTeam = () => {
    navigation.navigate('CreateTeam', { leagueId });
  };

  const handleManageLineup = () => {
    if (myTeam) {
      navigation.navigate('Lineup', { teamId: myTeam.id });
    }
  };

  if (isLoadingLeague) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!league) {
    return (
      <View style={styles.loader}>
        <Text>Lega non trovata</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header con info lega */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.leagueHeader}>
              <Avatar.Icon size={64} icon="trophy" style={{ backgroundColor: theme.colors.primary }} />
              <View style={styles.leagueInfo}>
                <Title>{league.name}</Title>
                <Text variant="bodyMedium">Codice: {league.code}</Text>
                <View style={styles.statsRow}>
                  <Chip icon="account-multiple" compact>
                    {memberCount}/{league.maxTeams} Team
                  </Chip>
                  <Chip icon="currency-eur" compact>
                    {league.budget} crediti
                  </Chip>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Prossimo GP */}
        {nextRace && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                PROSSIMO GRAN PREMIO
              </Text>
              {myTeam && (
                <Button 
                  mode="text" 
                  onPress={handleManageLineup}
                  icon="pencil"
                  compact
                >
                  Schiera
                </Button>
              )}
            </View>
            <RaceCard 
              race={nextRace} 
              variant="upcoming"
              onPress={() => navigation.navigate('RaceDetail', { raceId: nextRace.id })}
            />
            {myTeam && isBefore(new Date(), new Date(nextRace.sprintDate || nextRace.date)) && (
              <Banner
                visible={true}
                icon="alert"
                style={[styles.banner, { backgroundColor: theme.colors.warningContainer }]}
              >
                Ricorda di schierare i tuoi piloti prima della gara sprint!
              </Banner>
            )}
          </View>
        )}

        {/* La mia posizione */}
        {myTeam && myPosition > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.primaryContainer }]}>
            <Card.Content>
              <View style={styles.myPositionRow}>
                <View>
                  <Text variant="labelMedium">LA TUA POSIZIONE</Text>
                  <View style={styles.positionInfo}>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>
                      {myPosition}°
                    </Text>
                    <Text variant="bodyLarge" style={{ marginLeft: 12 }}>
                      {myTeam.name}
                    </Text>
                  </View>
                  <Text variant="bodyMedium">
                    {sortedStandings.find(s => s.userId === user?.id)?.totalPoints || 0} punti totali
                  </Text>
                </View>
                <Avatar.Icon 
                  size={48} 
                  icon={myPosition <= 3 ? 'trophy' : 'chevron-up'} 
                  style={{ 
                    backgroundColor: myPosition === 1 ? '#FFD700' : 
                                   myPosition === 2 ? '#C0C0C0' : 
                                   myPosition === 3 ? '#CD7F32' : 
                                   theme.colors.primary 
                  }} 
                />
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Azioni disponibili */}
        {isMember && !userHasTeamInLeague && !isFull && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={{ marginBottom: 8 }}>
                Non hai ancora un team
              </Text>
              <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
                Crea il tuo team per partecipare a questa lega!
              </Text>
              <Button 
                mode="contained" 
                onPress={handleCreateTeam}
                icon="plus"
              >
                Crea il tuo team
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Classifica completa */}
        <Card style={styles.card}>
          <Card.Title 
            title="CLASSIFICA" 
            subtitle="Ricorda: vince chi fa meno punti!"
            left={(props) => <Avatar.Icon {...props} icon="podium" />}
          />
          
          {sortedStandings.length > 0 ? (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title style={{ flex: 0.5 }}>Pos</DataTable.Title>
                <DataTable.Title style={{ flex: 2 }}>Team</DataTable.Title>
                <DataTable.Title numeric style={{ flex: 1 }}>Punti</DataTable.Title>
                <DataTable.Title style={{ flex: 0.5 }}></DataTable.Title>
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
                        <Text variant="bodyMedium" style={{ fontWeight: isPodium ? 'bold' : 'normal' }}>
                          {index + 1}
                        </Text>
                      </View>
                    </DataTable.Cell>
                    
                    <DataTable.Cell style={{ flex: 2 }}>
                      <View>
                        <Text variant="bodyMedium" style={{ fontWeight: isUserTeam ? 'bold' : 'normal' }}>
                          {item.teamName}
                        </Text>
                        <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                          {item.userName}
                        </Text>
                      </View>
                    </DataTable.Cell>
                    
                    <DataTable.Cell numeric style={{ flex: 1 }}>
                      <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                        {item.totalPoints}
                      </Text>
                    </DataTable.Cell>
                    
                    <DataTable.Cell style={{ flex: 0.5 }}>
                      {item.trend === 'up' && <MaterialCommunityIcons name="trending-up" size={16} color="green" />}
                      {item.trend === 'down' && <MaterialCommunityIcons name="trending-down" size={16} color="red" />}
                    </DataTable.Cell>
                  </DataTable.Row>
                );
              })}
            </DataTable>
          ) : (
            <Card.Content>
              <Text style={{ textAlign: 'center', opacity: 0.6 }}>
                Nessun team presente nella lega
              </Text>
            </Card.Content>
          )}
        </Card>

        {/* Info regolamento */}
        <Card style={styles.card}>
          <Card.Title 
            title="REGOLAMENTO" 
            left={(props) => <Avatar.Icon {...props} icon="book-open-variant" />}
          />
          <Card.Content>
            <List.Item
              title="Budget"
              description={`${league.budget} crediti per creare il team`}
              left={(props) => <List.Icon {...props} icon="currency-eur" />}
            />
            <List.Item
              title="Composizione Team"
              description="3 piloti MotoGP + 3 Moto2 + 3 Moto3"
              left={(props) => <List.Icon {...props} icon="motorbike" />}
            />
            <List.Item
              title="Schieramento"
              description="2 piloti per categoria ogni GP"
              left={(props) => <List.Icon {...props} icon="strategy" />}
            />
            <List.Item
              title="Punteggio"
              description="Vince chi fa meno punti totali"
              left={(props) => <List.Icon {...props} icon="trophy-outline" />}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      {/* FAB per azioni rapide */}
      {myTeam && (
        <FAB
          icon="pencil"
          style={styles.fab}
          onPress={handleManageLineup}
          label="Schiera"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: 80,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  leagueInfo: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  section: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  card: {
    margin: 16,
    marginTop: 8,
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  myPositionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  positionInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  positionCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userRow: {
    backgroundColor: 'rgba(103, 80, 164, 0.08)',
  },
  podiumRow: {
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});