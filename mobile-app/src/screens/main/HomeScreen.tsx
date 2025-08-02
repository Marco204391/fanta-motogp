// mobile-app/src/screens/main/HomeScreen.tsx
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { 
  ActivityIndicator, Avatar, Banner, Button, Card, Chip, FAB, 
  IconButton, List, Surface, Text, Title, useTheme 
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, differenceInDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { getUpcomingRaces, getMyLeagues, getMyTeams } from '../../services/api';
import RaceCard from '../../components/RaceCard';

export default function HomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Query per le prossime gare
  const { data: racesData, refetch: refetchRaces } = useQuery({
    queryKey: ['upcomingRaces'],
    queryFn: getUpcomingRaces,
  });

  // Query per le mie leghe
  const { data: leaguesData, refetch: refetchLeagues } = useQuery({
    queryKey: ['myLeagues'],
    queryFn: getMyLeagues,
    enabled: !!user,
  });

  // Query per i miei team
  const { data: teamsData, refetch: refetchTeams } = useQuery({
    queryKey: ['myTeams'],
    queryFn: getMyTeams,
    enabled: !!user,
  });

  const nextRace = racesData?.races?.[0];
  const myLeagues = leaguesData?.leagues || [];
  const myTeams = teamsData?.teams || [];
  const activeLeagues = myLeagues.filter((l: any) => 
    !l.endDate || new Date(l.endDate) > new Date()
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchRaces(),
      refetchLeagues(),
      refetchTeams(),
    ]);
    setRefreshing(false);
  };

  const getDaysUntilRace = () => {
    if (!nextRace) return null;
    return differenceInDays(new Date(nextRace.date), new Date());
  };

  const daysUntilRace = getDaysUntilRace();

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Benvenuto */}
        <Surface style={styles.headerSurface} elevation={2}>
          <View style={styles.header}>
            <View>
              <Text variant="headlineSmall">
                Ciao, {user?.username || 'Pilota'}! 👋
              </Text>
              <Text variant="bodyMedium" style={{ opacity: 0.7 }}>
                Bentornato nel Fanta MotoGP
              </Text>
            </View>
            <Avatar.Icon 
              size={48} 
              icon="motorbike" 
              style={{ backgroundColor: theme.colors.primary }}
            />
          </View>
        </Surface>

        {/* Prossimo GP */}
        {nextRace && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                PROSSIMA GARA
              </Text>
              <IconButton
                icon="arrow-right"
                size={20}
                onPress={() => navigation.navigate('Calendar' as any)}
              />
            </View>
            
            <RaceCard 
              race={nextRace} 
              variant="upcoming"
              onPress={() => navigation.navigate('RaceDetail' as any, { raceId: nextRace.id })}
            />

            {daysUntilRace !== null && daysUntilRace <= 7 && daysUntilRace >= 0 && (
              <Banner
                visible={true}
                icon="alert-circle"
                style={[styles.banner, { backgroundColor: theme.colors.warningContainer }]}
              >
                {daysUntilRace === 0 
                  ? 'La gara è oggi! Hai schierato i tuoi piloti?' 
                  : `Mancano solo ${daysUntilRace} giorni! Ricorda di schierare i tuoi piloti.`
                }
              </Banner>
            )}
          </View>
        )}

        {/* Le mie Leghe */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              LE MIE LEGHE
            </Text>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('Leagues' as any)}
              compact
            >
              Vedi tutte
            </Button>
          </View>

          {activeLeagues.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {activeLeagues.slice(0, 3).map((league: any) => {
                const myTeamInLeague = myTeams.find((t: any) => t.league.id === league.id);
                return (
                  <Card 
                    key={league.id} 
                    style={styles.leagueCard}
                    onPress={() => navigation.navigate('LeagueDetail' as any, { leagueId: league.id })}
                  >
                    <Card.Content>
                      <View style={styles.leagueCardHeader}>
                        <Avatar.Icon 
                          size={40} 
                          icon="trophy" 
                          style={{ backgroundColor: theme.colors.primaryContainer }}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text variant="titleMedium" numberOfLines={1}>
                            {league.name}
                          </Text>
                          <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                            {league.currentTeams}/{league.maxTeams} team
                          </Text>
                        </View>
                      </View>
                      
                      {myTeamInLeague ? (
                        <View style={styles.teamInfo}>
                          <Chip icon="shield-account" compact style={{ marginBottom: 4 }}>
                            {myTeamInLeague.name}
                          </Chip>
                          <Text variant="bodySmall">
                            Posizione: {league.userPosition || '-'}° • {league.userPoints || 0} punti
                          </Text>
                        </View>
                      ) : (
                        <Button 
                          mode="outlined" 
                          onPress={() => navigation.navigate('CreateTeam' as any, { leagueId: league.id })}
                          compact
                          style={{ marginTop: 8 }}
                        >
                          Crea Team
                        </Button>
                      )}
                    </Card.Content>
                  </Card>
                );
              })}
              
              <Card 
                style={[styles.leagueCard, styles.createLeagueCard]}
                onPress={() => navigation.navigate('Leagues' as any)}
              >
                <Card.Content style={styles.createLeagueContent}>
                  <MaterialCommunityIcons 
                    name="plus-circle-outline" 
                    size={48} 
                    color={theme.colors.primary} 
                  />
                  <Text variant="bodyMedium" style={{ marginTop: 8 }}>
                    Crea o unisciti{'\n'}a una lega
                  </Text>
                </Card.Content>
              </Card>
            </ScrollView>
          ) : (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons 
                  name="trophy-outline" 
                  size={64} 
                  color={theme.colors.onSurfaceVariant} 
                  style={{ opacity: 0.5 }}
                />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  Non sei ancora in nessuna lega
                </Text>
                <Button 
                  mode="contained" 
                  onPress={() => navigation.navigate('Leagues' as any)}
                  style={{ marginTop: 16 }}
                >
                  Esplora Leghe
                </Button>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Azioni Rapide */}
        <View style={styles.section}>
          
          <View style={styles.quickActions}>
            <Surface style={styles.actionCard} elevation={1}>
              <IconButton
                icon="calendar-check"
                size={32}
                iconColor={theme.colors.primary}
                onPress={() => navigation.navigate('Calendar' as any)}
              />
              <Text variant="bodySmall">Calendario</Text>
            </Surface>
            
            <Surface style={styles.actionCard} elevation={1}>
              <IconButton
                icon="account-group"
                size={32}
                iconColor={theme.colors.primary}
                onPress={() => navigation.navigate('Riders' as any)}
              />
              <Text variant="bodySmall">Piloti</Text>
            </Surface>
            
            <Surface style={styles.actionCard} elevation={1}>
              <IconButton
                icon="trophy"
                size={32}
                iconColor={theme.colors.primary}
                onPress={() => navigation.navigate('Leagues' as any)}
              />
              <Text variant="bodySmall">Leghe</Text>
            </Surface>
            
            <Surface style={styles.actionCard} elevation={1}>
              <IconButton
                icon="account"
                size={32}
                iconColor={theme.colors.primary}
                onPress={() => navigation.navigate('Profile' as any)}
              />
              <Text variant="bodySmall">Profilo</Text>
            </Surface>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    paddingBottom: 80,
  },
  headerSurface: {
    backgroundColor: 'white',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  section: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  leagueCard: {
    width: 280,
    marginRight: 12,
    minHeight: 150, 
    justifyContent: 'space-between',
  },
  leagueCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    minHeight: 60, 
  },
  createLeagueCard: {
    width: 180,
    backgroundColor: '#F5F5F5',
  },
  createLeagueContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    flex: 1, 
  },
  emptyCard: {
    marginHorizontal: 16,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    opacity: 0.7,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  actionCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    width: 80,
  },
});