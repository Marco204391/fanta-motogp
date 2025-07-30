// mobile-app/src/screens/main/LeagueDetailScreen.tsx
import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { ActivityIndicator, Card, List, Text, Title, DataTable, Avatar, Button } from 'react-native-paper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLeagueDetails } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function LeagueDetailScreen({ route }) {
  const { leagueId } = route.params;
  const { user } = useAuth();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data: leagueData, isLoading, isError, refetch } = useQuery({
    queryKey: ['leagueDetails', leagueId],
    queryFn: () => getLeagueDetails(leagueId),
  });

  const onRefresh = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['leagueDetails', leagueId] });
  }, [leagueId, queryClient]);

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} />;
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
  const userHasTeamInLeague = league.teams.some((team: any) => team.userId === user?.id);

  // Ordiniamo la classifica: meno punti = migliore posizione
  const sortedStandings = [...league.standings].sort((a, b) => a.totalPoints - b.totalPoints);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
    >
      <Card style={styles.card}>
        <Card.Title
          title={league.name}
          subtitle={`Codice: ${league.code} | Budget: ${league.budget} crediti`}
          left={(props) => <Avatar.Icon {...props} icon={league.isPrivate ? 'lock' : 'earth'} />}
        />
        <Card.Content>
            {!userHasTeamInLeague && (
                 <Button 
                    mode="contained" 
                    onPress={() => navigation.navigate('CreateTeam', { leagueId: league.id })}
                    style={{ marginTop: 10 }}
                >
                    Crea il tuo team in questa lega
                </Button>
            )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Classifica" />
        <DataTable>
          <DataTable.Header>
            <DataTable.Title style={{ flex: 0.5 }}>Pos.</DataTable.Title>
            <DataTable.Title style={{ flex: 2 }}>Team</DataTable.Title>
            <DataTable.Title numeric style={{ flex: 1 }}>Punti</DataTable.Title>
          </DataTable.Header>

          {sortedStandings.map((item, index) => (
            <DataTable.Row key={item.teamId} style={item.userId === user?.id ? styles.userRow : {}}>
              <DataTable.Cell style={{ flex: 0.5 }}>{index + 1}</DataTable.Cell>
              <DataTable.Cell style={{ flex: 2 }}>
                  <View>
                      <Text style={{ fontWeight: 'bold' }}>{item.teamName}</Text>
                      <Text style={{ fontSize: 12, color: 'gray' }}>{item.username}</Text>
                  </View>
              </DataTable.Cell>
              <DataTable.Cell numeric style={{ flex: 1 }}>{item.totalPoints}</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { margin: 16, marginBottom: 0 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  userRow: {
      backgroundColor: '#FFF3E0', // Un colore per evidenziare la riga dell'utente
  }
});