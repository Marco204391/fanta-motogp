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
  const [selectedRiders, setSelectedRiders] = useState<string[]>([]);
  const [teamName, setTeamName] = useState('');
  
  // Calcola statistiche di selezione
  const selectionStats = useMemo(() => {
    const stats = {
      totalCost: 0,
      totalRiders: selectedRiders.length,
      ridersByCategory: {
        MOTOGP: 0,
        MOTO2: 0,
        MOTO3: 0
      },
      isValid: false,
      validationErrors: [] as string[]
    };

    // Calcola costo totale e conta per categoria
    selectedRiders.forEach(riderId => {
      const rider = riders.find(r => r.id === riderId);
      if (rider) {
        stats.totalCost += rider.value;
        stats.ridersByCategory[rider.category]++;
      }
    });

    // Validazioni
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

    if (!teamName.trim()) {
      stats.validationErrors.push('Inserisci un nome per il team');
    }

    stats.isValid = stats.validationErrors.length === 0;
    return stats;
  }, [selectedRiders, teamName, riders, budget]);

  // Handler per toggle pilota
  const handleRiderToggle = (riderId: string) => {
    const rider = riders.find(r => r.id === riderId);
    if (!rider) return;

    const isSelected = selectedRiders.includes(riderId);
    
    if (isSelected) {
      // Rimuovi
      setSelectedRiders(prev => prev.filter(id => id !== riderId));
    } else {
      // Controlla se può aggiungere
      const currentInCategory = selectedRiders.filter(id => {
        const r = riders.find(r => r.id === id);
        return r?.category === rider.category;
      }).length;

      if (currentInCategory >= 3) {
        Alert.alert(
          'Limite raggiunto',
          `Hai già selezionato 3 piloti per la categoria ${rider.category}`
        );
        return;
      }

      // Controlla budget
      const newTotalCost = selectionStats.totalCost + rider.value;
      if (newTotalCost > budget) {
        Alert.alert(
          'Budget insufficiente',
          `Aggiungendo ${rider.name} supereresti il budget di ${budget} crediti`
        );
        return;
      }

      setSelectedRiders(prev => [...prev, riderId]);
    }
  };

  // Render delle categorie con contatori
  const renderCategory = (category: 'MOTOGP' | 'MOTO2' | 'MOTO3') => {
    const categoryRiders = riders.filter(r => r.category === category);
    const selectedCount = selectionStats.ridersByCategory[category];
    
    return (
      <Card style={styles.categoryCard}>
        <Card.Title 
          title={`${category} (${selectedCount}/3)`}
          titleStyle={[
            styles.categoryTitle,
            selectedCount === 3 && styles.categoryComplete
          ]}
        />
        <Card.Content>
          {categoryRiders.map(rider => {
            const isSelected = selectedRiders.includes(rider.id);
            const canSelect = !isSelected && selectedCount < 3 && 
                            selectionStats.totalCost + rider.value <= budget;
            
            return (
              <List.Item
                key={rider.id}
                title={`${rider.number}. ${rider.name}`}
                description={`${rider.team} - ${rider.value} crediti`}
                left={() => (
                  <Checkbox
                    status={isSelected ? 'checked' : 'unchecked'}
                    disabled={!isSelected && !canSelect}
                  />
                )}
                onPress={() => handleRiderToggle(rider.id)}
                style={[
                  styles.riderItem,
                  isSelected && styles.selectedRider,
                  !canSelect && !isSelected && styles.disabledRider
                ]}
              />
            );
          })}
        </Card.Content>
      </Card>
    );
  };

  // Render del riepilogo
  const renderSummary = () => (
    <Card style={[styles.summaryCard, selectionStats.isValid && styles.validSummary]}>
      <Card.Content>
        <Title>Riepilogo Team</Title>
        <View style={styles.statsRow}>
          <Text>Piloti selezionati: {selectionStats.totalRiders}/9</Text>
          <Text>Budget utilizzato: {selectionStats.totalCost}/{budget}</Text>
        </View>
        
        {selectionStats.validationErrors.length > 0 && (
          <View style={styles.errorsContainer}>
            {selectionStats.validationErrors.map((error, index) => (
              <Text key={index} style={styles.errorText}>• {error}</Text>
            ))}
          </View>
        )}
        
        <Button
          mode="contained"
          onPress={handleCreateTeam}
          disabled={!selectionStats.isValid}
          style={styles.createButton}
        >
          Crea Team
        </Button>
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView style={styles.container}>
      <TextInput
        label="Nome del Team"
        value={teamName}
        onChangeText={setTeamName}
        style={styles.teamNameInput}
        mode="outlined"
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