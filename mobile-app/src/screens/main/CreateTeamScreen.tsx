// mobile-app/src/screens/main/CreateTeamScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Title } from 'react-native-paper';

export default function CreateTeamScreen() {
  return (
    <View style={styles.container}>
      <Title>Crea il tuo Team</Title>
      <Text>Qui potrai selezionare i tuoi 9 piloti (3 per categoria).</Text>
      <Text style={styles.info}>Budget: 1000 crediti</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  info: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
  },
});