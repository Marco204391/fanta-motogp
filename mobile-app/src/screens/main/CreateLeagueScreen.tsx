import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Title } from 'react-native-paper';

export default function CreateLeagueScreen() {
  return (
    <View style={styles.container}>
      <Title>Crea una Nuova Lega</Title>
      <Text>Qui potrai impostare il nome e le regole della tua lega.</Text>
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
});