// mobile-app/src/screens/main/LeagueDetailScreen.tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Card, List, Text, Title, DataTable } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { getLeagueDetails } from '../../services/api';

export default function LeagueDetailScreen({ route }) {
  const { leagueId } = route.params;

  const { data: leagueData, isLoading } = useQuery({
    queryKey: ['leagueDetails', leagueId],
    queryFn: () => getLeagueDetails(leagueId),
  });

  if (isLoading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  const { league } = leagueData;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>{league.name}</Title>
          <Text>Codice: {league.code} | Budget: {league.budget}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Classifica" />
        <DataTable>
          <DataTable.Header>
            <DataTable.Title>Pos.</DataTable.Title>
            <DataTable.Title>Team</DataTable.Title>
            <DataTable.Title numeric>Punti</DataTable.Title>
          </DataTable.Header>

          {league.standings.map((item, index) => (
            <DataTable.Row key={item.teamId}>
              <DataTable.Cell>{index + 1}</DataTable.Cell>
              <DataTable.Cell>{item.teamName} ({item.username})</DataTable.Cell>
              <DataTable.Cell numeric>{item.totalPoints}</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </Card>

      {/* Altre sezioni, come la lista dei membri... */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { margin: 16 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});