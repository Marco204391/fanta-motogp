// mobile-app/src/screens/main/LineupScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import {
  Button, Card, Text, Title, TextInput, List, Checkbox, HelperText, ActivityIndicator
} from 'react-native-paper';

// Questa schermata riceverà teamId e raceId come parametri di navigazione
export default function LineupScreen({ route }) {
  const { teamId, race } = route.params;
  const [lineup, setLineup] = useState({});
  const [predictions, setPredictions] = useState({});

  const deadline = new Date(race.sprintDate || race.date);
  const isDeadlinePassed = new Date() > deadline;

  // Qui andrebbe la logica per caricare il team e lo schieramento esistente

  const handleRiderToggle = (riderId, category) => {
    // Logica per selezionare/deselezionare un pilota
  };

  const handlePredictionChange = (riderId, position) => {
    // Logica per aggiornare la previsione di posizione
  };

  const renderCategory = (category, riders) => {
    // Funzione per mostrare i piloti di una categoria
    return (
        <Card style={styles.card}>
            <Card.Content>
                <Title>{category}</Title>
                {/* Logica per mappare e visualizzare i piloti */}
            </Card.Content>
        </Card>
    );
  };

  return (
    <ScrollView style={styles.container}>
        <Card style={styles.card}>
            <Card.Title title={race.name} subtitle={`Scadenza: ${deadline.toLocaleString('it-IT')}`} />
        </Card>

        {/* Render delle 3 categorie (MotoGP, Moto2, Moto3) */}

        <Button
          mode="contained"
          style={styles.saveButton}
          disabled={isDeadlinePassed}
          onPress={() => { /* Logica per salvare lo schieramento */ }}
        >
          {isDeadlinePassed ? 'Scadenza Superata' : 'Salva Schieramento'}
        </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 8 },
    card: { marginBottom: 12 },
    saveButton: { margin: 16, padding: 8 },
});