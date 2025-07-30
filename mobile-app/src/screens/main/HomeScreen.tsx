// mobile-app/src/screens/main/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions
} from 'react-native';
import {
  Card,
  Text,
  Title,
  Paragraph,
  Avatar,
  Button,
  Divider,
  ActivityIndicator,
  List,
  Surface
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getUpcomingRaces, getMyStats, getMyTeams } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../../../App';

const { width } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<MainStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>(); // Configura la navigazione
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Query per i dati dashboard
  const { data: upcomingRaces, isLoading: loadingRaces } = useQuery({
    queryKey: ['upcomingRaces'],
    queryFn: getUpcomingRaces,
  });

  const { data: myStats, isLoading: loadingStats } = useQuery({
    queryKey: ['myStats'],
    queryFn: getMyStats,
  });

  const { data: myTeams, isLoading: loadingTeams } = useQuery({
    queryKey: ['myTeams'],
    queryFn: getMyTeams,
    select: (data) => data.teams,
  });

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Ricarica tutti i dati
    Promise.all([
      // queryClient.invalidateQueries(['upcomingRaces']),
      // queryClient.invalidateQueries(['myStats']),
      // queryClient.invalidateQueries(['myTeams']),
    ]).finally(() => setRefreshing(false));
  }, []);

  if (loadingRaces || loadingStats || loadingTeams) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header con saluto */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <View>
              <Title style={styles.greeting}>
                Ciao {user?.username}! 👋
              </Title>
              <Paragraph style={styles.credits}>
                Crediti disponibili: €{user?.credits?.toLocaleString()}
              </Paragraph>
            </View>
            <Avatar.Icon
              size={50}
              icon="motorbike"
              style={styles.avatar}
            />
          </View>
        </Card.Content>
      </Card>

      {/* Prossima gara */}
      {upcomingRaces?.length > 0 && (
        <Card style={styles.card}>
          <Card.Title
            title="Prossima Gara"
            left={(props) => <Avatar.Icon {...props} icon="flag-checkered" />}
          />
          <Card.Content>
            <Title>{upcomingRaces[0].name}</Title>
            <Paragraph>
              📍 {upcomingRaces[0].circuit}, {upcomingRaces[0].country}
            </Paragraph>
            <Paragraph>
              📅 {new Date(upcomingRaces[0].date).toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button 
                mode="contained" 
                icon="racing-helmet"
                onPress={() => navigation.navigate('Lineup', { 
                    teamId: myTeams[0].id, // Esempio: usiamo il primo team
                    race: upcomingRaces[0] 
                })}
            >
              Schiera Team
            </Button>
          </Card.Actions>
          <Card.Actions>
            <Button mode="contained" icon="timer">
              Countdown
            </Button>
          </Card.Actions>
        </Card>
      )}

      {/* Statistiche rapide */}
      <View style={styles.statsContainer}>
        <Surface style={styles.statCard}>
          <MaterialCommunityIcons name="trophy" size={30} color="#FFD700" />
          <Text style={styles.statNumber}>{myStats?.wins || 0}</Text>
          <Text style={styles.statLabel}>Vittorie</Text>
        </Surface>

        <Surface style={styles.statCard}>
          <MaterialCommunityIcons name="podium" size={30} color="#C0C0C0" />
          <Text style={styles.statNumber}>{myStats?.podiums || 0}</Text>
          <Text style={styles.statLabel}>Podi</Text>
        </Surface>

        <Surface style={styles.statCard}>
          <MaterialCommunityIcons name="chart-line" size={30} color="#FF6B00" />
          <Text style={styles.statNumber}>{myStats?.totalPoints || 0}</Text>
          <Text style={styles.statLabel}>Punti Totali</Text>
        </Surface>
      </View>

      {/* I miei team */}
      <Card style={styles.card}>
        <Card.Title
          title="I Miei Team"
          subtitle={`${myTeams?.length || 0} team attivi`}
          left={(props) => <Avatar.Icon {...props} icon="account-group" />}
        />
        <Card.Content>
          {myTeams?.length > 0 ? (
            <List.Section>
              {myTeams.slice(0, 3).map((team: any) => (
                <List.Item
                  key={team.id}
                  title={team.name}
                  description={`Lega: ${team.league.name}`}
                  left={(props) => <List.Icon {...props} icon="racing-helmet" />}
                  right={() => (
                    <Text style={styles.teamPoints}>
                      {team.totalPoints || 0} pts
                    </Text>
                  )}
                />
              ))}
            </List.Section>
          ) : (
            <Paragraph>Nessun team creato ancora</Paragraph>
          )}
        </Card.Content>
        <Card.Actions>
          <Button mode="text">Vedi tutti</Button>
          <Button mode="contained" onPress={() => navigation.navigate('CreateTeam')}>Crea Team</Button>
        </Card.Actions>
      </Card>

      {/* Notifiche recenti */}
      <Card style={styles.card}>
        <Card.Title
          title="Attività Recenti"
          left={(props) => <Avatar.Icon {...props} icon="bell" />}
        />
        <Card.Content>
          <List.Item
            title="Gara completata"
            description="GP d'Italia - I tuoi team hanno totalizzato 145 punti"
            left={(props) => <List.Icon {...props} icon="flag-checkered" />}
          />
          <Divider />
          <List.Item
            title="Nuovo pilota disponibile"
            description="Marco Bezzecchi ha cambiato team"
            left={(props) => <List.Icon {...props} icon="account-plus" />}
          />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    margin: 16,
    backgroundColor: '#FF6B00',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: 'white',
    fontSize: 24,
  },
  credits: {
    color: 'white',
    fontSize: 16,
    marginTop: 4,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  card: {
    margin: 16,
    marginTop: 0,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginVertical: 16,
  },
  statCard: {
    width: width / 3 - 24,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  teamPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
});