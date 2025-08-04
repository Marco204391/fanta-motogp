// mobile-app/src/screens/main/LeagueDetailScreen.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import {
  ActivityIndicator, Avatar, Banner, Button, Card, Chip, DataTable,
  Divider, FAB, IconButton, List, Text, Title, useTheme
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, isPast } from 'date-fns';
import { getLeagueDetails, getMyTeamInLeague, getAllRaces, getLeagueRaceLineups } from '../../services/api';
import { MainStackParamList } from '../../../App';
import { useAuth } from '../../contexts/AuthContext';
import RaceCard from '../../components/RaceCard';

type LeagueDetailScreenRouteProp = RouteProp<MainStackParamList, 'LeagueDetail'>;
type LeagueDetailScreenNavigationProp = StackNavigationProp<MainStackParamList, 'LeagueDetail'>;

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

const { width: screenWidth } = Dimensions.get('window');

// Componente per mostrare lo schieramento di un singolo team
const TeamLineupCard = ({ lineupData }: { lineupData: any }) => {
    const theme = useTheme();
    const { teamName, userName, totalPoints, lineup } = lineupData;

    return (
        <Card style={styles.lineupCard}>
            <Card.Title
                title={teamName}
                subtitle={`di ${userName}`}
                left={(props) => <Avatar.Icon {...props} icon="racing-helmet" />}
                right={(props) => <Chip {...props} icon="star-circle" style={{ marginRight: 16 }}>{totalPoints ?? 'N/D'} pt</Chip>}
            />
            <Card.Content>
                {lineup.length > 0 ? (
                    lineup.map((lr: any) => (
                        <View key={lr.id} style={styles.riderRow}>
                            <Text style={styles.riderName}>{lr.rider.number}. {lr.rider.name}</Text>
                            <View style={styles.riderPredictions}>
                                <Text>Prev: <Text style={{ fontWeight: 'bold' }}>{lr.predictedPosition}°</Text></Text>
                                <Text>Reale: <Text style={{ fontWeight: 'bold' }}>{lr.actualPosition ?? '-'}</Text></Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={{ textAlign: 'center', paddingVertical: 16, opacity: 0.7 }}>Schieramento non effettuato</Text>
                )}
            </Card.Content>
        </Card>
    );
};


export default function LeagueDetailScreen() {
    const navigation = useNavigation<LeagueDetailScreenNavigationProp>();
    const route = useRoute<LeagueDetailScreenRouteProp>();
    const theme = useTheme();
    const { user } = useAuth();
    const { leagueId } = route.params;
    const queryClient = useQueryClient();

    const [refreshing, setRefreshing] = useState(false);
    const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // Query per i dettagli della lega
    const { data: leagueData, isLoading: isLoadingLeague, refetch: refetchLeague } = useQuery({
        queryKey: ['league', leagueId],
        queryFn: () => getLeagueDetails(leagueId),
    });

    // AGGIUNTO: Invalida i dati della lega ogni volta che la schermata ottiene il focus
    useFocusEffect(
      useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
      }, [queryClient, leagueId])
    );

    // Query per il mio team nella lega
    const { data: myTeamData } = useQuery({
        queryKey: ['myTeamInLeague', leagueId],
        queryFn: () => getMyTeamInLeague(leagueId),
        enabled: !!user,
    });

    // Query per il calendario completo della stagione
    const { data: calendarData, isLoading: isLoadingCalendar } = useQuery({
        queryKey: ['allRaces', new Date().getFullYear()],
        queryFn: () => getAllRaces(new Date().getFullYear()),
    });

    const allRaces = calendarData?.races || [];

    // Trova la prossima gara e imposta l'ID selezionato di default
    useEffect(() => {
        if (allRaces.length > 0 && !selectedRaceId) {
            const nextRaceIndex = allRaces.findIndex((race: any) => !isPast(new Date(race.gpDate)));
            const initialIndex = nextRaceIndex !== -1 ? nextRaceIndex : allRaces.length - 1;
            setSelectedRaceId(allRaces[initialIndex]?.id);

            setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false, viewPosition: 0.5 });
            }, 100);
        }
    }, [allRaces, selectedRaceId]);

    // Query per gli schieramenti della lega per la gara selezionata
    const { data: lineupsData, isLoading: isLoadingLineups, isFetching: isFetchingLineups } = useQuery({
        queryKey: ['leagueRaceLineups', leagueId, selectedRaceId],
        queryFn: () => getLeagueRaceLineups(leagueId, selectedRaceId!),
        enabled: !!selectedRaceId,
    });

    const league = leagueData?.league;
    const standings = league?.standings || [];
    const myTeam = myTeamData?.team;
    const nextRace = allRaces.find((race: any) => !isPast(new Date(race.gpDate)));
    const hasLineup = !!lineupsData?.lineups?.find((l: any) => l.teamId === myTeam?.id)?.lineup.length;

    const sortedStandings = [...standings].sort((a, b) => a.totalPoints - b.totalPoints);
    sortedStandings.forEach((team, index) => {
        team.position = index + 1;
    });

    const myPosition = sortedStandings.findIndex(s => s.userId === user?.id) + 1;
    const isMember = league?.members?.some((m: any) => m.userId === user?.id);
    const userHasTeamInLeague = !!myTeam;
    const memberCount = league?.teams?.length || 0;
    const isFull = memberCount >= (league?.maxTeams || 10);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['league', leagueId] }),
            queryClient.invalidateQueries({ queryKey: ['myTeamInLeague', leagueId] }),
            queryClient.invalidateQueries({ queryKey: ['leagueRaceLineups', leagueId, selectedRaceId] })
        ]);
        setRefreshing(false);
    };

    const handleCreateTeam = () => {
        navigation.navigate('CreateTeam', { leagueId });
    };

    const handleManageLineup = () => {
        if (myTeam && nextRace) {
        navigation.navigate('Lineup', { teamId: myTeam.id, race: nextRace });
        }
    };

    const renderStandingRow = (item: Standing, index: number) => {
        const isUserTeam = item.userId === user?.id;
        const trendIcon = item.trend === 'up' ? 'arrow-up-bold-circle' : item.trend === 'down' ? 'arrow-down-bold-circle' : 'minus-circle';
        const trendColor = item.trend === 'up' ? 'green' : item.trend === 'down' ? 'red' : 'grey';

        return (
            <DataTable.Row key={item.teamId} style={isUserTeam && styles.userRow}>
                <DataTable.Cell style={{ flex: 0.5 }}>{index + 1}</DataTable.Cell>
                <DataTable.Cell style={{ flex: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name={trendIcon} color={trendColor} size={16} style={{ marginRight: 8 }} />
                        <Text>{item.teamName}</Text>
                    </View>
                </DataTable.Cell>
                <DataTable.Cell numeric style={{ flex: 1 }}>{item.totalPoints}</DataTable.Cell>
                <DataTable.Cell numeric style={{ flex: 1 }}>{item.lastRacePoints || '-'}</DataTable.Cell>
            </DataTable.Row>
        );
    };


    if (isLoadingLeague || isLoadingCalendar) {
        return <View style={styles.loader}><ActivityIndicator size="large" /></View>;
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
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
                <IconButton
                    icon="refresh"
                    onPress={onRefresh}
                    style={styles.refreshButton}
                />
              </View>
            </Card.Content>
          </Card>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>GIORNATE DI GARA</Text>
            <FlatList
              ref={flatListRef}
              horizontal
              data={allRaces}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => {
                  setSelectedRaceId(item.id);
                  navigation.navigate('RaceDetail', { raceId: item.id });
                }}>
                  <View style={[styles.raceCardContainer, item.id === selectedRaceId && { borderColor: theme.colors.primary }]}>
                    <RaceCard race={item} variant={isPast(new Date(item.gpDate)) ? 'past' : 'upcoming'} />
                  </View>
                </TouchableOpacity>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.raceCarousel}
              getItemLayout={(data, index) => (
                { length: screenWidth * 0.9 + 12, offset: (screenWidth * 0.9 + 12) * index, index }
              )}
            />
          </View>

          <View style={styles.section}>
             <Text variant="titleMedium" style={styles.sectionTitle}>
                SCHIERAMENTI
            </Text>
            {isFetchingLineups ? (
                <ActivityIndicator style={{ marginTop: 20 }}/>
            ) : lineupsData?.lineups ? (
                lineupsData.lineups.length > 0 ? (
                    <FlatList
                        horizontal
                        data={lineupsData.lineups}
                        keyExtractor={(item) => item.teamId}
                        renderItem={({ item }) => (
                            <View style={styles.lineupCardContainer}>
                                <TeamLineupCard lineupData={item} />
                            </View>
                        )}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.lineupCarousel}
                    />
                ) : (
                    <Card style={styles.card}><Card.Content><Text style={{textAlign: 'center'}}>{lineupsData.message || 'Nessuno schieramento per questa gara.'}</Text></Card.Content></Card>
                )
            ) : (
                 <Card style={styles.card}><Card.Content><Text style={{textAlign: 'center'}}>Seleziona una gara per vedere gli schieramenti.</Text></Card.Content></Card>
            )}
          </View>

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
                    <DataTable.Title numeric style={{ flex: 1 }}>Punti Tot.</DataTable.Title>
                    <DataTable.Title numeric style={{ flex: 1 }}>Ultima Gara</DataTable.Title>
                </DataTable.Header>
                {sortedStandings.map(renderStandingRow)}
              </DataTable>
            ) : (
              <Card.Content>
                <Text style={{ textAlign: 'center', opacity: 0.6 }}>Nessun team presente</Text>
              </Card.Content>
            )}
          </Card>

        </ScrollView>

        {myTeam && nextRace && (
            <FAB
            icon={hasLineup ? "pencil" : "rocket-launch-outline"}
            style={styles.fab}
            onPress={handleManageLineup}
            label={hasLineup ? "Modifica" : "Schiera"}
            />
        )}
      </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { paddingBottom: 80 },
    headerCard: { margin: 16, marginBottom: 8 },
    leagueHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    leagueInfo: { flex: 1 },
    statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
    section: { marginVertical: 8 },
    sectionTitle: { fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 8 },
    card: { marginHorizontal: 16, marginTop: 8 },
    banner: { marginHorizontal: 16, marginTop: 8 },
    myPositionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    positionInfo: { flexDirection: 'row', alignItems: 'baseline', marginVertical: 4 },
    userRow: { backgroundColor: 'rgba(103, 80, 164, 0.08)' },
    podiumRow: { backgroundColor: 'rgba(255, 193, 7, 0.08)' },
    fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 },
    raceCarousel: { paddingHorizontal: 8, paddingVertical: 8 },
    raceCardContainer: { width: screenWidth * 0.9, marginRight: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
    lineupCarousel: { paddingHorizontal: 16, paddingVertical: 8 },
    lineupCardContainer: { width: screenWidth * 0.85, marginRight: 12 },
    lineupCard: { marginBottom: 12 },
    riderRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    riderName: { flex: 1 },
    riderPredictions: { flexDirection: 'row', gap: 16 },
    refreshButton: { alignSelf: 'flex-start' },
});