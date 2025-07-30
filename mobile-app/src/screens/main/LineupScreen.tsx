// mobile-app/src/screens/main/LineupScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Button, Card, Text, Title, TextInput, List, Checkbox, HelperText, ActivityIndicator, Divider, Chip
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTeamById, getLineup, setLineup } from '../../services/api';
import { MainStackParamList } from '../../../App';

// Tipi
type LineupScreenRouteProp = RouteProp<MainStackParamList, 'Lineup'>;

interface RiderSelection {
  [riderId: string]: {
    selected: boolean;
    predictedPosition: string;
  };
}

export default function LineupScreen() {
  const navigation = useNavigation();
  const route = useRoute<LineupScreenRouteProp>();
  const queryClient = useQueryClient();
  const { teamId, race } = route.params;

  const [lineup, setLineup] = useState<RiderSelection>({});

  // Carica i dati del team (per avere la lista dei piloti)
  const { data: team, isLoading: isLoadingTeam } = useQuery({
    queryKey: ['teamDetails', teamId],
    queryFn: () => getTeamById(teamId),
    select: data => data.team,
  });

  // Carica uno schieramento esistente per questa gara
  const { data: existingLineup, isLoading: isLoadingLineup } = useQuery({
    queryKey: ['lineup', teamId, race.id],
    queryFn: () => getLineup(teamId, race.id),
    enabled: !!team, // Esegui solo dopo aver caricato il team
  });
  
  // Imposta lo stato iniziale quando lo schieramento esistente viene caricato
  useEffect(() => {
    if (existingLineup?.lineup?.lineupRiders) {
      const initialLineup: RiderSelection = {};
      existingLineup.lineup.lineupRiders.forEach((lr: any) => {
        initialLineup[lr.riderId] = {
          selected: true,
          predictedPosition: lr.predictedPosition.toString(),
        };
      });
      setLineup(initialLineup);
    }
  }, [existingLineup]);


  const mutation = useMutation({
    mutationFn: (lineupData: any) => setLineup(race.id, lineupData),
    onSuccess: () => {
      Alert.alert('Successo', 'Schieramento salvato!');
      queryClient.invalidateQueries({ queryKey: ['lineup', teamId, race.id] });
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert('Errore', error.response?.data?.error || 'Impossibile salvare lo schieramento.');
    },
  });

  // Logica per selezionare/deselezionare un pilota
  const handleRiderToggle = (riderId: string, category: string) => {
    const ridersInCategory = team.riders.filter((r: any) => r.rider.category === category);
    const selectedInCategory = Object.keys(lineup).filter(id => lineup[id].selected && ridersInCategory.some((r: any) => r.rider.id === id));

    setLineup(prev => {
      const newLinup = { ...prev };
      const isCurrentlySelected = !!newLinup[riderId]?.selected;

      if (isCurrentlySelected) {
        delete newLinup[riderId];
      } else if (selectedInCategory.length < 2) {
        newLinup[riderId] = { selected: true, predictedPosition: '' };
      } else {
        Alert.alert('Limite Raggiunto', `Puoi schierare solo 2 piloti per la ${category}.`);
      }
      return newLinup;
    });
  };

  const handlePredictionChange = (riderId: string, position: string) => {
    if (/^\d*$/.test(position)) { // Permette solo numeri
        setLineup(prev => ({
            ...prev,
            [riderId]: { ...prev[riderId], predictedPosition: position },
        }));
    }
  };
  
  const { isLineupValid, categoryCounts } = useMemo(() => {
    const selectedRiders = Object.keys(lineup).filter(id => lineup[id].selected);
    const categoryCounts = { MOTOGP: 0, MOTO2: 0, MOTO3: 0 };
    let allPositionsFilled = true;

    selectedRiders.forEach(riderId => {
        const riderData = team?.riders.find((r: any) => r.rider.id === riderId)?.rider;
        if (riderData) {
            categoryCounts[riderData.category]++;
        }
        if (!lineup[riderId].predictedPosition) {
            allPositionsFilled = false;
        }
    });

    const isValid = categoryCounts.MOTOGP === 2 &&
                    categoryCounts.MOTO2 === 2 &&
                    categoryCounts.MOTO3 === 2 &&
                    allPositionsFilled;
                    
    return { isLineupValid: isValid, categoryCounts };
  }, [lineup, team]);


  const deadline = new Date(race.sprintDate || race.date);
  const isDeadlinePassed = new Date() > deadline;

  const renderCategory = (category: 'MOTOGP' | 'MOTO2' | 'MOTO3') => {
    const riders = team?.riders.filter((r: any) => r.rider.category === category) || [];
    return (
        <Card style={styles.card} key={category}>
            <Card.Content>
                <Title>{category} ({categoryCounts[category]}/2)</Title>
                <Divider style={{ marginVertical: 8 }}/>
                {riders.map((teamRider: any) => {
                    const rider = teamRider.rider;
                    const isSelected = !!lineup[rider.id]?.selected;
                    return (
                        <View key={rider.id}>
                            <List.Item
                                title={`${rider.number}. ${rider.name}`}
                                description={rider.team}
                                onPress={() => handleRiderToggle(rider.id, category)}
                                left={props => <Checkbox.Android {...props} status={isSelected ? 'checked' : 'unchecked'} />}
                            />
                            {isSelected && (
                                <TextInput
                                    label="Posizione Prevista"
                                    value={lineup[rider.id].predictedPosition}
                                    onChangeText={text => handlePredictionChange(rider.id, text)}
                                    keyboardType="number-pad"
                                    mode="outlined"
                                    style={styles.predictionInput}
                                />
                            )}
                        </View>
                    );
                })}
            </Card.Content>
        </Card>
    );
  };
  
  if (isLoadingTeam || isLoadingLineup) {
      return <ActivityIndicator style={styles.loader} />;
  }
  
  return (
    <ScrollView style={styles.container}>
        <Card style={styles.card}>
            <Card.Title 
                title={race.name} 
                subtitle={`Scadenza: ${deadline.toLocaleString('it-IT')}`} 
            />
            {isDeadlinePassed && <Chip icon="alert-circle" style={styles.deadlineChip}>Deadline Superata</Chip>}
        </Card>

        {renderCategory('MOTOGP')}
        {renderCategory('MOTO2')}
        {renderCategory('MOTO3')}

        <Button
          mode="contained"
          style={styles.saveButton}
          disabled={isDeadlinePassed || !isLineupValid || mutation.isPending}
          onPress={() => {
              const lineupData = {
                  teamId,
                  riders: Object.keys(lineup).map(riderId => ({
                      riderId,
                      predictedPosition: parseInt(lineup[riderId].predictedPosition, 10),
                  }))
              };
              mutation.mutate(lineupData);
          }}
          loading={mutation.isPending}
        >
          {isDeadlinePassed ? 'Scadenza Superata' : 'Salva Schieramento'}
        </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 8 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center'},
    card: { marginBottom: 12 },
    predictionInput: { marginHorizontal: 16, marginBottom: 8 },
    deadlineChip: { margin: 16, backgroundColor: '#FFC107' },
    saveButton: { margin: 16, padding: 8 },
});