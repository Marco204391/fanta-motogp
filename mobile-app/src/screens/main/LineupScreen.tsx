// mobile-app/src/screens/main/LineupScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Button, Card, Text, Title, TextInput, List, Checkbox, HelperText, ActivityIndicator, Divider, Chip, Subheading
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTeamById, getLineup, setLineup as apiSetLineup, getUpcomingRaces } from '../../services/api';
import { MainStackParamList } from '../../../App';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';


// Tipi
type LineupScreenRouteProp = RouteProp<MainStackParamList, 'Lineup'>;

interface RiderSelection {
  [riderId: string]: {
    selected: boolean;
    predictedPosition: string;
  };
}

// Funzione helper per formattare la data
const formatDate = (dateString: string | Date | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function LineupScreen() {
  const navigation = useNavigation();
  const route = useRoute<LineupScreenRouteProp>();
  const queryClient = useQueryClient();
  const { teamId } = route.params;

  const [lineup, setLineup] = useState<RiderSelection>({});

  // 1. Query per i dati del team
  const { data: teamData, isLoading: isLoadingTeam } = useQuery({
    queryKey: ['teamDetails', teamId],
    queryFn: () => getTeamById(teamId),
  });
  const team = teamData?.team;

  // 2. Query per la prossima gara (per la deadline)
  const { data: raceData } = useQuery({
    queryKey: ['upcomingRaces'],
    queryFn: getUpcomingRaces,
  });
  const upcomingRace = raceData?.races?.[0];
  const raceId = upcomingRace?.id;

  // 3. Query per lo schieramento esistente
  const { data: existingLineup, isLoading: isLoadingLineup } = useQuery({
    queryKey: ['lineup', teamId, raceId],
    queryFn: () => getLineup(teamId, raceId!),
    enabled: !!teamId && !!raceId,
  });

  // Popola lo stato con lo schieramento esistente quando viene caricato
  useEffect(() => {
    if (existingLineup?.lineup?.lineupRiders) {
      const newLineup: RiderSelection = {};
      existingLineup.lineup.lineupRiders.forEach((lr: any) => {
        newLineup[lr.riderId] = {
          selected: true,
          predictedPosition: lr.predictedPosition.toString(),
        };
      });
      setLineup(newLineup);
    }
  }, [existingLineup]);

  const saveLineupMutation = useMutation({
      mutationFn: (data: { raceId: string; teamId: string; riders: any[] }) =>
      apiSetLineup(raceId, { teamId: data.teamId, riders: data.riders }),
        onSuccess: () => {
          Alert.alert(
            'Successo',
            'Schieramento salvato con successo!',
            [
              {
                text: 'OK',
                onPress: () => {
                  queryClient.invalidateQueries({ queryKey: ['lineup', teamId, raceId] });
                  queryClient.invalidateQueries({ queryKey: ['myTeams'] });
                  queryClient.invalidateQueries({queryKey: ['league', team?.leagueId]})
                  queryClient.invalidateQueries({ queryKey: ['leagueRaceLineups', team?.leagueId, raceId] });
                  navigation.goBack();
                }
              }
            ]
          );
      },
      onError: (error: any) => {
          Alert.alert('Errore', error.response?.data?.error || 'Impossibile salvare lo schieramento.');
      },
  });

  const deadline = upcomingRace?.sprintDate || upcomingRace?.date;
  const isDeadlinePassed = deadline ? new Date() > new Date(deadline) : false;

  const lineupStats = useMemo(() => {
    const stats = {
      categoryCounts: { MOTOGP: 0, MOTO2: 0, MOTO3: 0 } as Record<string, number>,
      isValid: false,
      validationErrors: [] as string[],
      selectedRiders: [] as any[],
    };

    if (!team) return stats;

    Object.keys(lineup).forEach(riderId => {
      if (lineup[riderId].selected) {
        const riderData = team.riders.find((r: any) => r.rider.id === riderId)?.rider;
        if (riderData) {
          stats.categoryCounts[riderData.category]++;
          stats.selectedRiders.push({
            ...riderData,
            predictedPosition: lineup[riderId].predictedPosition,
          });
        }
      }
    });

    if (stats.categoryCounts.MOTOGP !== 2) stats.validationErrors.push(`MotoGP: ${stats.categoryCounts.MOTOGP}/2 piloti`);
    if (stats.categoryCounts.MOTO2 !== 2) stats.validationErrors.push(`Moto2: ${stats.categoryCounts.MOTO2}/2 piloti`);
    if (stats.categoryCounts.MOTO3 !== 2) stats.validationErrors.push(`Moto3: ${stats.categoryCounts.MOTO3}/2 piloti`);

    stats.selectedRiders.forEach(rider => {
      const pos = parseInt(rider.predictedPosition, 10);
      if (isNaN(pos) || pos < 1 || pos > 30) {
        stats.validationErrors.push(`Posizione non valida per ${rider.name}`);
      }
    });

    stats.isValid = stats.validationErrors.length === 0 && stats.selectedRiders.length === 6;
    return stats;
  }, [lineup, team]);

  const handleRiderToggle = (riderId: string, category: string) => {
      if (isDeadlinePassed || !team) return;

      setLineup(prev => {
          const newLineup = { ...prev };
          const isCurrentlySelected = !!newLineup[riderId]?.selected;

          if (isCurrentlySelected) {
              delete newLineup[riderId];
              return newLineup;
          }

          const ridersInCategory = team.riders.filter((r: any) => r.rider.category === category);
          const selectedInCategoryCount = Object.keys(prev).filter(id =>
              prev[id]?.selected && ridersInCategory.some((r: any) => r.rider.id === id)
          ).length;

          if (selectedInCategoryCount < 2) {
              newLineup[riderId] = { selected: true, predictedPosition: '' };
          } else {
              Alert.alert('Limite Raggiunto', `Puoi schierare solo 2 piloti per la categoria ${category}.`);
          }

          return newLineup;
      });
  };

  const handlePredictionChange = (riderId: string, position: string) => {
    if (isDeadlinePassed) return;
    if (/^\d*$/.test(position)) {
      const posNum = parseInt(position, 10);
      if (position === '' || (posNum >= 1 && posNum <= 30)) {
        setLineup(prev => ({
          ...prev,
          [riderId]: { ...prev[riderId], predictedPosition: position },
        }));
      }
    }
  };

  const handleSaveLineup = () => {
    if (!raceId) {
        Alert.alert("Errore", "Nessuna gara imminente trovata.");
        return;
    }
    const ridersToSave = Object.keys(lineup)
        .filter(id => lineup[id].selected)
        .map(id => ({
            riderId: id,
            predictedPosition: parseInt(lineup[id].predictedPosition, 10),
        }));

    saveLineupMutation.mutate({ raceId, teamId, riders: ridersToSave });
  };

  if (isLoadingTeam || isLoadingLineup) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
        <Text>Caricamento dati team...</Text>
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.loader}>
        <Text>Team non trovato.</Text>
      </View>
    );
  }

  const renderCategory = (category: 'MOTOGP' | 'MOTO2' | 'MOTO3') => {
    const riders = team?.riders.filter((r: any) => r.rider.category === category) || [];
    const selectedCount = lineupStats.categoryCounts[category];

    return (
      <Card style={styles.card} key={category}>
        <Card.Content>
          <Title style={[styles.categoryTitle, selectedCount === 2 && styles.categoryComplete]}>
            {category} ({selectedCount}/2)
          </Title>
          <Divider style={{ marginVertical: 8 }} />
          {riders.map((teamRider: any) => {
            const rider = teamRider.rider;
            const isSelected = !!lineup[rider.id]?.selected;
            const canSelect = selectedCount < 2;

            return (
              <View key={rider.id} style={styles.riderRow}>
                <List.Item
                  title={`${rider.number}. ${rider.name}`}
                  description={rider.team}
                  onPress={() => handleRiderToggle(rider.id, rider.category)}
                  disabled={isDeadlinePassed || (!isSelected && !canSelect)}
                  left={() => (
                    <Checkbox
                      status={isSelected ? 'checked' : 'unchecked'}
                      disabled={isDeadlinePassed || (!isSelected && !canSelect)}
                    />
                  )}
                  style={[
                    styles.riderItem,
                    isSelected && styles.selectedRider,
                    (!canSelect || isDeadlinePassed) && !isSelected && styles.disabledRider,
                  ]}
                />
                {isSelected && (
                  <TextInput
                    label="Pos."
                    value={lineup[rider.id]?.predictedPosition || ''}
                    onChangeText={(text) => handlePredictionChange(rider.id, text)}
                    keyboardType="numeric"
                    mode="outlined"
                    style={styles.positionInput}
                    placeholder="1-30"
                    maxLength={2}
                    disabled={isDeadlinePassed}
                    error={
                      lineup[rider.id]?.predictedPosition
                        ? !/^(?:[1-9]|[12][0-9]|30)$/.test(lineup[rider.id].predictedPosition)
                        : false
                    }
                  />
                )}
              </View>
            );
          })}
        </Card.Content>
      </Card>
    );
  };

  const renderSummary = () => (
    <Card style={[styles.summaryCard, lineupStats.isValid && styles.validSummary]}>
      <Card.Content>
        <Title>{upcomingRace?.name || "Riepilogo Schieramento"}</Title>
        <Subheading style={{ marginBottom: 8 }}>Weekend di gara</Subheading>
        <View style={styles.deadlineRow}>
          <Icon name="clock-outline" size={20} color={isDeadlinePassed ? 'red' : 'green'} />
          <Text style={{color: isDeadlinePassed ? 'red' : 'green'}}>Deadline: {formatDate(deadline)}</Text>
          {isDeadlinePassed && (
            <Chip style={styles.expiredChip}>SCADUTA</Chip>
          )}
        </View>

        {existingLineup?.lineup && (
          <View style={styles.existingLineupInfo}>
            <Icon name="information-outline" size={16} color="#2196F3" />
            <Text style={styles.existingLineupText}>
              Schieramento già salvato per questo weekend. Le modifiche sovrascriveranno quello esistente.
            </Text>
          </View>
        )}

        {lineupStats.validationErrors.length > 0 && (
          <View style={styles.errorsContainer}>
            {lineupStats.validationErrors.map((error, index) => (
              <HelperText type="error" key={index}>• {error}</HelperText>
            ))}
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleSaveLineup}
          disabled={!lineupStats.isValid || isDeadlinePassed || saveLineupMutation.isPending}
          loading={saveLineupMutation.isPending}
          style={styles.saveButton}
        >
          {isDeadlinePassed ? 'Deadline Scaduta' : existingLineup?.lineup ? 'Aggiorna Schieramento' : 'Salva Schieramento'}
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView style={styles.container}>
      {renderSummary()}
      {renderCategory('MOTOGP')}
      {renderCategory('MOTO2')}
      {renderCategory('MOTO3')}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 8 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { marginBottom: 12 },
  summaryCard: { margin: 8, backgroundColor: '#fff0f0' },
  validSummary: { backgroundColor: '#f0fff0' },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 8 },
  expiredChip: { backgroundColor: 'red', marginLeft: 'auto' },
  existingLineupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  existingLineupText: { flex: 1, fontSize: 12, color: '#1976D2' },
  errorsContainer: { marginVertical: 8 },
  errorText: { color: 'red' },
  saveButton: { marginTop: 8, padding: 4 },
  categoryTitle: { color: 'grey' },
  categoryComplete: { color: 'green' },
  riderRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  riderItem: { flex: 1, padding: 2 },
  selectedRider: { backgroundColor: '#e0f0ff', borderRadius: 8 },
  disabledRider: { opacity: 0.5 },
  positionInput: { width: 80, height: 50, textAlign: 'center' },
});