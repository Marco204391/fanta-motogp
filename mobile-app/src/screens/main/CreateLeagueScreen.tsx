// mobile-app/src/screens/main/CreateLeagueScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Switch,
  Text,
  HelperText,
  Card,
  List,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLeague } from '../../services/api';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainStackParamList } from '../../../App';

type CreateLeagueNavigationProp = StackNavigationProp<MainStackParamList>;

export default function CreateLeagueScreen() {
  const navigation = useNavigation<CreateLeagueNavigationProp>();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [maxTeams, setMaxTeams] = useState('10');
  const [budget, setBudget] = useState('1000');

  const mutation = useMutation({
    mutationFn: createLeague,
    onSuccess: (data) => {
      // Invalida le query per forzare il refresh
      queryClient.invalidateQueries({ queryKey: ['myLeagues'] });
      
      Alert.alert(
        'Successo', 
        `La lega "${data.league.name}" è stata creata!\nCodice: ${data.league.code}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Naviga prima alla tab delle leghe
              navigation.reset({
                index: 1,
                routes: [
                  { name: 'Tabs' },
                  { name: 'LeagueDetail', params: { leagueId: data.league.id } }
                ],
              });
            }
          }
        ]
      );
    },
    onError: (error) => {
      Alert.alert('Errore', 'Impossibile creare la lega. Riprova più tardi.');
      console.error(error);
    },
  });

  const handleCreateLeague = () => {
    const parsedMaxTeams = parseInt(maxTeams, 10);
    const parsedBudget = parseInt(budget, 10);

    if (!name || name.length < 3) {
      Alert.alert('Errore', 'Il nome della lega deve essere di almeno 3 caratteri.');
      return;
    }
    if (isNaN(parsedMaxTeams) || parsedMaxTeams < 2 || parsedMaxTeams > 20) {
      Alert.alert('Errore', 'Il numero di team deve essere tra 2 e 20.');
      return;
    }
    if (isNaN(parsedBudget) || parsedBudget < 500) {
      Alert.alert('Errore', 'Il budget minimo è 500 crediti.');
      return;
    }

    mutation.mutate({
      name,
      isPrivate,
      maxTeams: parsedMaxTeams,
      budget: parsedBudget,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Impostazioni della Lega</Title>

          <TextInput
            label="Nome Lega"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
          />
          <HelperText type="info">Il nome che identificherà la tua competizione.</HelperText>

          <List.Item
            title="Lega Privata"
            description="Solo gli utenti con il codice potranno partecipare."
            right={() => (
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                color="#FF6B00"
              />
            )}
          />

          <TextInput
            label="Numero massimo di team"
            value={maxTeams}
            onChangeText={setMaxTeams}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
          <HelperText type="info">Quanti team possono partecipare (2-20).</HelperText>

          <TextInput
            label="Budget per team (crediti)"
            value={budget}
            onChangeText={setBudget}
            mode="outlined"
            keyboardType="numeric"
            style={styles.input}
          />
          <HelperText type="info">Crediti disponibili per ogni team (min. 500).</HelperText>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleCreateLeague}
        loading={mutation.isPending}
        disabled={mutation.isPending}
        style={styles.createButton}
      >
        Crea Lega
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
  },
  createButton: {
    margin: 16,
    paddingVertical: 8,
    backgroundColor: '#FF6B00',
  },
});