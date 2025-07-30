// mobile-app/src/screens/main/CreateTeamScreen.tsx
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, SectionList, Alert } from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  List,
  Checkbox,
  ActivityIndicator,
  Chip,
  Divider,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTeam, getRiders } from '../../services/api';
import { MainStackParamList } from '../../../App';

interface Rider {
  id: string;
  name: string;
  number: number;
  team: string;
  category: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  value: number;
}

type CreateTeamScreenRouteProp = RouteProp<MainStackParamList, 'CreateTeam'>;

export default function CreateTeamScreen() {
  const navigation = useNavigation();
  const route = useRoute<CreateTeamScreenRouteProp>();
  const queryClient = useQueryClient();

  const { leagueId } = route.params;

  const [teamName, setTeamName] = useState('');
  const [selectedRiders, setSelectedRiders] = useState<Record<string, Rider>>({});

  const { data: riders, isLoading: isLoadingRiders } = useQuery({
    queryKey: ['allRiders'],
    queryFn: () => getRiders({ limit: 100 }),
    select: data => data.riders,
  });

  const mutation = useMutation({
    mutationFn: (newTeam: { name: string; leagueId: string; riderIds: string[] }) =>
      createTeam(newTeam),
    onSuccess: () => {
      Alert.alert('Successo', 'Il tuo team è stato creato!');
      queryClient.invalidateQueries({ queryKey: ['myTeams'] });
      navigation.goBack();
    },
    onError: (error: any) => {
        const errorMessage = error.response?.data?.error || 'Impossibile creare il team. Riprova più tardi.';
        Alert.alert('Errore', errorMessage);
    },
  });

  const { budgetLeft, ridersByCat, isTeamValid } = useMemo(() => {
    const totalCost = Object.values(selectedRiders).reduce((sum, rider) => sum + rider.value, 0);
    const budgetLeft = 1000 - totalCost;

    const ridersByCat = {
      MOTOGP: Object.values(selectedRiders).filter(r => r.category === 'MOTOGP').length,
      MOTO2: Object.values(selectedRiders).filter(r => r.category === 'MOTO2').length,
      MOTO3: Object.values(selectedRiders).filter(r => r.category === 'MOTO3').length,
    };

    const isTeamValid =
      teamName.length >= 3 &&
      ridersByCat.MOTOGP === 3 &&
      ridersByCat.MOTO2 === 3 &&
      ridersByCat.MOTO3 === 3 &&
      budgetLeft >= 0;

    return { budgetLeft, ridersByCat, isTeamValid };
  }, [selectedRiders, teamName]);

  const handleSelectRider = (rider: Rider) => {
    const newSelection = { ...selectedRiders };
    if (newSelection[rider.id]) {
      delete newSelection[rider.id];
    } else {
      if (ridersByCat[rider.category] < 3) {
        newSelection[rider.id] = rider;
      } else {
        Alert.alert('Limite Raggiunto', `Puoi selezionare solo 3 piloti per la categoria ${rider.category}.`);
      }
    }
    setSelectedRiders(newSelection);
  };

  const handleCreateTeam = () => {
    if (!leagueId) {
        Alert.alert('Errore', 'ID della lega non trovato. Torna indietro e riprova.');
        return;
    }
    mutation.mutate({
      name: teamName,
      leagueId: leagueId,
      riderIds: Object.keys(selectedRiders),
    });
  };
  
  const sections = useMemo(() => {
    if (!riders) return [];
    return [
      { title: 'MotoGP', data: riders.filter((r: Rider) => r.category === 'MOTOGP') },
      { title: 'Moto2', data: riders.filter((r: Rider) => r.category === 'MOTO2') },
      { title: 'Moto3', data: riders.filter((r: Rider) => r.category === 'MOTO3') },
    ];
  }, [riders]);

  if (isLoadingRiders) {
    return <ActivityIndicator style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard}>
        <Card.Content>
          <TextInput
            label="Nome del Team"
            value={teamName}
            onChangeText={setTeamName}
            mode="outlined"
            style={{ marginBottom: 12 }}
          />
          <View style={styles.summaryDetails}>
            <Chip icon="cash" selected={budgetLeft < 0}>
              Budget: {budgetLeft}
            </Chip>
            <Text>MotoGP: {ridersByCat.MOTOGP}/3</Text>
            <Text>Moto2: {ridersByCat.MOTO2}/3</Text>
            <Text>Moto3: {ridersByCat.MOTO3}/3</Text>
          </View>
        </Card.Content>
      </Card>
      
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={`${item.number}. ${item.name}`}
            description={`Valore: ${item.value} crediti - Team: ${item.team}`}
            onPress={() => handleSelectRider(item)}
            right={() => <Checkbox status={selectedRiders[item.id] ? 'checked' : 'unchecked'} />}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <List.Subheader style={styles.sectionHeader}>{title}</List.Subheader>
        )}
        ItemSeparatorComponent={() => <Divider />}
      />
      
      <Button
        mode="contained"
        onPress={handleCreateTeam}
        loading={mutation.isPending}
        disabled={!isTeamValid || mutation.isPending}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        Crea Team
      </Button>
    </View>
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
  summaryCard: {
    margin: 8,
  },
  summaryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sectionHeader: {
    backgroundColor: '#f5f5f5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    margin: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});