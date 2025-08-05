// mobile-app/src/screens/main/EditTeamScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  TextInput, Button, Text, Card, List, Checkbox, ActivityIndicator, Title, Banner
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTeamById, getRiders, updateTeam } from '../../services/api';
import { MainStackParamList } from '../../../App';

interface Rider {
  id: string; name: string; number: number; team: string;
  category: 'MOTOGP' | 'MOTO2' | 'MOTO3'; value: number;
  riderType: 'OFFICIAL' | 'REPLACEMENT' | 'WILDCARD' | 'TEST_RIDER';
}

interface RidersResponse {
  riders: Rider[];
}

type EditTeamScreenRouteProp = RouteProp<MainStackParamList, 'EditTeam'>;

export default function EditTeamScreen() {
  const navigation = useNavigation();
  const route = useRoute<EditTeamScreenRouteProp>();
  const queryClient = useQueryClient();
  const { teamId } = route.params;

  const [selectedRiders, setSelectedRiders] = useState<string[]>([]);
  const [teamName, setTeamName] = useState('');

  // 1. Carica dati del team da modificare
  const { data: teamData, isLoading: isLoadingTeam } = useQuery({
    queryKey: ['teamDetails', teamId],
    queryFn: () => getTeamById(teamId),
  });
  const team = teamData?.team;
  const league = team?.league;
  const budget = league?.budget || 1000;
  const teamsLocked = league?.teamsLocked ?? true;

  // 2. Carica tutti i piloti disponibili
  const { data: ridersData, isLoading: isLoadingRiders } = useQuery<{ riders: Rider[] }>({
    queryKey: ['riders', 'all'],
    queryFn: () => getRiders({ limit: 100 } as any),
  });
  const riders = ridersData?.riders || [];
  
  const officialRiders = useMemo(() => 
    riders.filter((r: Rider) => r.riderType === 'OFFICIAL'), 
  [riders]);

  // Pre-compila lo stato con i dati del team esistente
  useEffect(() => {
    if (team) {
      setTeamName(team.name);
      setSelectedRiders(team.riders.map((tr: any) => tr.riderId));
    }
  }, [team]);
  
  const takenRiderIds = useMemo(() => {
    if (!league?.teams) return new Set<string>();
    const ids = new Set<string>();
    league.teams.forEach((t: any) => {
        if (t.id !== teamId) { // Escludi i piloti del team corrente
            t.riders.forEach((teamRider: any) => {
                ids.add(teamRider.riderId);
            });
        }
    });
    return ids;
  }, [league, teamId]);
  
  const updateTeamMutation = useMutation({
    mutationFn: (data: { teamId: string, riderIds: string[] }) => updateTeam(data.teamId, { riderIds: data.riderIds }),
    onSuccess: () => {
      Alert.alert('Successo', 'Team aggiornato con successo!');
      queryClient.invalidateQueries({ queryKey: ['myTeams'] });
      queryClient.invalidateQueries({ queryKey: ['teamDetails', teamId] });
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert('Errore', error.response?.data?.error || 'Impossibile aggiornare il team.');
    },
  });

  const handleUpdateTeam = () => {
    if (teamsLocked) {
        Alert.alert('Lega Bloccata', 'L\'amministratore ha bloccato la modifica dei team.');
        return;
    }
    if (selectionStats.isValid) {
      updateTeamMutation.mutate({ teamId, riderIds: selectedRiders });
    }
  };

  const selectionStats = useMemo(() => {
    const stats = {
      totalCost: 0,
      totalRiders: selectedRiders.length,
      ridersByCategory: {
        MOTOGP: 0,
        MOTO2: 0,
        MOTO3: 0,
      } as Record<Rider['category'], number>,
      isValid: false,
      validationErrors: [] as string[],
    };

    if (!riders || riders.length === 0) {
      return stats;
    }

    selectedRiders.forEach((riderId) => {
      const rider = riders.find((r) => r.id === riderId);
      if (rider) {
        stats.totalCost += rider.value;
        stats.ridersByCategory[rider.category]++;
      }
    });

    if (stats.totalRiders !== 9) {
      stats.validationErrors.push(`Seleziona 9 piloti (attualmente: ${stats.totalRiders})`);
    }
    if (stats.ridersByCategory.MOTOGP !== 3) {
      stats.validationErrors.push(`MotoGP: ${stats.ridersByCategory.MOTOGP}/3 piloti`);
    }
    if (stats.ridersByCategory.MOTO2 !== 3) {
      stats.validationErrors.push(`Moto2: ${stats.ridersByCategory.MOTO2}/3 piloti`);
    }
    if (stats.ridersByCategory.MOTO3 !== 3) {
      stats.validationErrors.push(`Moto3: ${stats.ridersByCategory.MOTO3}/3 piloti`);
    }
    if (stats.totalCost > budget) {
      stats.validationErrors.push(`Budget superato: ${stats.totalCost}/${budget} crediti`);
    }

    stats.isValid = stats.validationErrors.length === 0;
    return stats;
  }, [selectedRiders, riders, budget]);
  
  const handleRiderToggle = (riderId: string) => {
    const rider = riders.find((r) => r.id === riderId);
    if (!rider) return;
    if (rider.riderType !== 'OFFICIAL') {
      Alert.alert('Pilota non selezionabile', 'Puoi scegliere solo piloti ufficiali per il tuo team.');
      return;
    }
    if (takenRiderIds.has(riderId)) {
      Alert.alert('Pilota non disponibile', 'Questo pilota è già stato selezionato da un altro team in questa lega.');
      return;
    }
    const isSelected = selectedRiders.includes(riderId);
    if (isSelected) {
      setSelectedRiders((prev) => prev.filter((id) => id !== riderId));
    } else {
      const currentInCategory = selectedRiders.filter((id) => {
        const r = riders.find((r) => r.id === id);
        return r?.category === rider.category;
      }).length;
      if (currentInCategory >= 3) {
        Alert.alert('Limite raggiunto', `Hai già selezionato 3 piloti per la categoria ${rider.category}`);
        return;
      }
      const newTotalCost = selectionStats.totalCost + rider.value;
      if (newTotalCost > budget) {
        Alert.alert('Budget insufficiente', `Aggiungendo ${rider.name} supereresti il budget di ${budget} crediti`);
        return;
      }
      setSelectedRiders((prev) => [...prev, riderId]);
    }
  };

  const renderCategory = (category: Rider['category']) => {
    const categoryRiders = officialRiders.filter((r) => r.category === category);
    const selectedCount = selectionStats.ridersByCategory[category];

    return (
      <Card style={styles.categoryCard} key={category}>
        <Card.Title
          title={`${category} (${selectedCount}/3)`}
          titleStyle={[
            styles.categoryTitle,
            selectedCount === 3 && styles.categoryComplete,
          ]}
        />
        <Card.Content>
          {categoryRiders.map((rider) => {
            const isSelected = selectedRiders.includes(rider.id);
            const isTaken = takenRiderIds.has(rider.id);
            const canSelect =
              !isSelected &&
              !isTaken &&
              selectedCount < 3 &&
              selectionStats.totalCost + rider.value <= budget;

            return (
              <List.Item
                key={rider.id}
                title={`${rider.number}. ${rider.name}`}
                description={isTaken ? 'Già selezionato' : `${rider.team} - ${rider.value} crediti`}
                left={() => (
                  <Checkbox
                    status={isSelected ? 'checked' : 'unchecked'}
                    disabled={!isSelected && (!canSelect || isTaken)}
                  />
                )}
                onPress={() => handleRiderToggle(rider.id)}
                style={[
                  styles.riderItem,
                  isSelected && styles.selectedRider,
                  (isTaken || (!canSelect && !isSelected)) && styles.disabledRider,
                ]}
                titleStyle={isTaken ? { color: 'grey' } : {}}
              />
            );
          })}
        </Card.Content>
      </Card>
    );
  };
  
  const renderSummary = () => (
    <Card
      style={[
        styles.summaryCard,
        selectionStats.isValid && styles.validSummary,
      ]}
    >
      <Card.Content>
        <Title>Riepilogo Team</Title>
        <View style={styles.statsRow}>
          <Text>Piloti selezionati: {selectionStats.totalRiders}/9</Text>
          <Text>
            Budget: {selectionStats.totalCost}/{budget}
          </Text>
        </View>

        {selectionStats.validationErrors.length > 0 && (
          <View style={styles.errorsContainer}>
            {selectionStats.validationErrors.map((error, index) => (
              <Text key={index} style={styles.errorText}>
                • {error}
              </Text>
            ))}
          </View>
        )}
        
        {teamsLocked && (
            <Banner visible icon="lock">
                L'amministratore ha bloccato la creazione e modifica dei team per questa lega.
            </Banner>
        )}

        <Button
          mode="contained"
          onPress={handleUpdateTeam}
          disabled={!selectionStats.isValid || updateTeamMutation.isPending || teamsLocked}
          style={styles.createButton}
          loading={updateTeamMutation.isPending}
        >
          {teamsLocked ? 'Modifiche Bloccate' : 'Salva Modifiche'}
        </Button>
      </Card.Content>
    </Card>
  );
  
  if (isLoadingTeam || isLoadingRiders) {
      return (
        <View style={styles.loader}>
            <ActivityIndicator size="large" />
        </View>
      );
  }

  return (
    <ScrollView style={styles.container}>
      <TextInput
        label="Nome del Team"
        value={teamName}
        onChangeText={setTeamName}
        style={styles.teamNameInput}
        mode="outlined"
        disabled
      />
      {renderSummary()}
      {renderCategory('MOTOGP')}
      {renderCategory('MOTO2')}
      {renderCategory('MOTO3')}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamNameInput: {
    margin: 8,
  },
  summaryCard: {
    margin: 8,
    backgroundColor: '#fff0f0',
  },
  validSummary: {
    backgroundColor: '#f0fff0',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  errorsContainer: {
    marginVertical: 8,
  },
  errorText: {
    color: 'red',
  },
  createButton: {
    marginTop: 8,
  },
  categoryCard: {
    margin: 8,
  },
  categoryTitle: {
    color: 'grey',
  },
  categoryComplete: {
    color: 'green',
  },
  riderItem: {
    padding: 2,
  },
  selectedRider: {
    backgroundColor: '#e0f0ff',
  },
  disabledRider: {
    opacity: 0.5,
  },
});