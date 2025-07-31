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
  const [lineup, setLineup] = useState<Record<string, { selected: boolean; predictedPosition: string }>>({});
  
  // Calcola statistiche dello schieramento
  const lineupStats = useMemo(() => {
    const stats = {
      categoryCounts: { MOTOGP: 0, MOTO2: 0, MOTO3: 0 },
      isValid: false,
      validationErrors: [] as string[],
      selectedRiders: [] as any[]
    };

    // Conta piloti selezionati per categoria
    Object.keys(lineup).forEach(riderId => {
      if (lineup[riderId].selected) {
        const riderData = team?.riders.find((r: any) => r.rider.id === riderId)?.rider;
        if (riderData) {
          stats.categoryCounts[riderData.category]++;
          stats.selectedRiders.push({
            ...riderData,
            predictedPosition: lineup[riderId].predictedPosition
          });
        }
      }
    });

    // Validazioni
    if (stats.categoryCounts.MOTOGP !== 2) {
      stats.validationErrors.push(`MotoGP: ${stats.categoryCounts.MOTOGP}/2 piloti`);
    }

    if (stats.categoryCounts.MOTO2 !== 2) {
      stats.validationErrors.push(`Moto2: ${stats.categoryCounts.MOTO2}/2 piloti`);
    }

    if (stats.categoryCounts.MOTO3 !== 2) {
      stats.validationErrors.push(`Moto3: ${stats.categoryCounts.MOTO3}/2 piloti`);
    }

    // Verifica posizioni previste
    stats.selectedRiders.forEach(rider => {
      const pos = parseInt(rider.predictedPosition);
      if (!rider.predictedPosition || isNaN(pos) || pos < 1 || pos > 30) {
        stats.validationErrors.push(`Posizione non valida per ${rider.name}`);
      }
    });

    stats.isValid = stats.validationErrors.length === 0 && 
                   stats.selectedRiders.length === 6;

    return stats;
  }, [lineup, team]);

  // Handler per toggle pilota
  const handleRiderToggle = (riderId: string, category: string) => {
    const ridersInCategory = team.riders.filter((r: any) => r.rider.category === category);
    const selectedInCategory = Object.keys(lineup).filter(id => 
      lineup[id].selected && ridersInCategory.some((r: any) => r.rider.id === id)
    );

    setLineup(prev => {
      const newLineup = { ...prev };
      const isCurrentlySelected = !!newLineup[riderId]?.selected;

      if (isCurrentlySelected) {
        // Deseleziona
        delete newLineup[riderId];
      } else if (selectedInCategory.length < 2) {
        // Seleziona
        newLineup[riderId] = { selected: true, predictedPosition: '' };
      } else {
        Alert.alert(
          'Limite Raggiunto', 
          `Puoi schierare solo 2 piloti per la categoria ${category}.`
        );
      }
      return newLineup;
    });
  };

  // Handler per cambiare posizione prevista
  const handlePredictionChange = (riderId: string, position: string) => {
    // Permetti solo numeri
    if (/^\d*$/.test(position)) {
      const posNum = parseInt(position);
      // Limita a 1-30
      if (position === '' || (posNum >= 1 && posNum <= 30)) {
        setLineup(prev => ({
          ...prev,
          [riderId]: { ...prev[riderId], predictedPosition: position },
        }));
      }
    }
  };

  // Render categoria con validazioni
  const renderCategory = (category: 'MOTOGP' | 'MOTO2' | 'MOTO3') => {
    const riders = team?.riders.filter((r: any) => r.rider.category === category) || [];
    const selectedCount = lineupStats.categoryCounts[category];
    
    return (
      <Card style={styles.card} key={category}>
        <Card.Content>
          <Title style={[
            styles.categoryTitle,
            selectedCount === 2 && styles.categoryComplete
          ]}>
            {category} ({selectedCount}/2)
          </Title>
          <Divider style={{ marginVertical: 8 }}/>
          
          {riders.map((teamRider: any) => {
            const rider = teamRider.rider;
            const isSelected = !!lineup[rider.id]?.selected;
            const canSelect = selectedCount < 2 || isSelected;
            
            return (
              <View key={rider.id} style={styles.riderRow}>
                <List.Item
                  title={`${rider.number}. ${rider.name}`}
                  description={rider.team}
                  left={() => (
                    <Checkbox
                      status={isSelected ? 'checked' : 'unchecked'}
                      disabled={!canSelect}
                      onPress={() => handleRiderToggle(rider.id, rider.category)}
                    />
                  )}
                  style={[
                    styles.riderItem,
                    isSelected && styles.selectedRider,
                    !canSelect && styles.disabledRider
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
                    error={
                      lineup[rider.id]?.predictedPosition && 
                      (parseInt(lineup[rider.id].predictedPosition) < 1 || 
                       parseInt(lineup[rider.id].predictedPosition) > 30)
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

  // Render riepilogo con validazioni
  const renderSummary = () => (
    <Card style={[styles.summaryCard, lineupStats.isValid && styles.validSummary]}>
      <Card.Content>
        <Title>Riepilogo Schieramento</Title>
        
        <View style={styles.deadlineRow}>
          <Icon name="clock-outline" size={20} />
          <Text>Deadline: {formatDate(deadline)}</Text>
          {isDeadlinePassed && (
            <Chip style={styles.expiredChip}>Scaduta</Chip>
          )}
        </View>

        {lineupStats.validationErrors.length > 0 && (
          <View style={styles.errorsContainer}>
            {lineupStats.validationErrors.map((error, index) => (
              <Text key={index} style={styles.errorText}>• {error}</Text>
            ))}
          </View>
        )}

        {lineupStats.selectedRiders.length === 6 && lineupStats.isValid && (
          <View style={styles.lineupPreview}>
            <Subheading>Schieramento completo:</Subheading>
            {['MOTOGP', 'MOTO2', 'MOTO3'].map(category => (
              <View key={category} style={styles.categoryPreview}>
                <Text style={styles.categoryLabel}>{category}:</Text>
                {lineupStats.selectedRiders
                  .filter(r => r.category === category)
                  .map(r => (
                    <Text key={r.id} style={styles.previewRider}>
                      {r.name} → {r.predictedPosition}°
                    </Text>
                  ))}
              </View>
            ))}
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleSaveLineup}
          disabled={!lineupStats.isValid || isDeadlinePassed}
          style={styles.saveButton}
        >
          {isDeadlinePassed ? 'Deadline Scaduta' : 'Salva Schieramento'}
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
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center'},
    card: { marginBottom: 12 },
    predictionInput: { marginHorizontal: 16, marginBottom: 8 },
    deadlineChip: { margin: 16, backgroundColor: '#FFC107' },
    saveButton: { margin: 16, padding: 8 },
});