// mobile-app/src/components/RiderCard.tsx
import React from 'react';
import { View, StyleSheet, ImageBackground, Image } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

interface RiderCardProps {
  rider: {
    id: string;
    name: string;
    number: number;
    team: string;
    category: 'MOTOGP' | 'MOTO2' | 'MOTO3';
    nationality: string;
    value: number;
    photoUrl?: string | null;
  };
  selected?: boolean;
  onPress?: () => void;
  showValue?: boolean;
  variant?: 'default' | 'compact';
}

// Mappatura bandiere per nazionalità
const nationalityFlags: Record<string, string> = {
  'IT': '🇮🇹',
  'ES': '🇪🇸',
  'FR': '🇫🇷',
  'PT': '🇵🇹',
  'DE': '🇩🇪',
  'AT': '🇦🇹',
  'NL': '🇳🇱',
  'BE': '🇧🇪',
  'GB': '🇬🇧',
  'US': '🇺🇸',
  'AR': '🇦🇷',
  'AU': '🇦🇺',
  'JP': '🇯🇵',
  'TH': '🇹🇭',
  'MY': '🇲🇾',
  'ID': '🇮🇩',
  'IN': '🇮🇳',
  'BR': '🇧🇷',
  'ZA': '🇿🇦',
  'TR': '🇹🇷',
};

// Colori per categoria
const categoryColors = {
  MOTOGP: ['#E53935', '#B71C1C'],
  MOTO2: ['#1E88E5', '#0D47A1'],
  MOTO3: ['#43A047', '#1B5E20'],
};

// Placeholder per foto piloti
const riderPlaceholder = 'https://via.placeholder.com/150x200/cccccc/666666?text=Rider';

export default function RiderCard({ 
  rider, 
  selected = false, 
  onPress, 
  showValue = true,
  variant = 'default' 
}: RiderCardProps) {
  const theme = useTheme();
  const gradientColors = categoryColors[rider.category];

  if (variant === 'compact') {
    return (
      <Card 
        style={[styles.compactCard, selected && styles.selectedCard]} 
        onPress={onPress}
        mode={selected ? 'elevated' : 'contained'}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactNumber}>
            <Text variant="titleLarge" style={styles.numberText}>
              #{rider.number}
            </Text>
          </View>
          <View style={styles.compactInfo}>
            <Text variant="titleSmall" numberOfLines={1}>
              {rider.name}
            </Text>
            <Text variant="bodySmall" numberOfLines={1} style={{ opacity: 0.7 }}>
              {rider.team}
            </Text>
          </View>
          {showValue && (
            <Chip compact style={styles.valueChip}>
              {rider.value}
            </Chip>
          )}
        </View>
      </Card>
    );
  }

  return (
    <Card 
      style={[styles.card, selected && styles.selectedCard]} 
      onPress={onPress}
      mode={selected ? 'elevated' : 'contained'}
    >
      <View style={styles.cardContent}>
        <LinearGradient
          colors={gradientColors}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <View style={styles.categoryBadge}>
              <Text variant="labelSmall" style={styles.categoryText}>
                {rider.category}
              </Text>
            </View>
            {selected && (
              <View style={styles.selectedBadge}>
                <Text variant="labelSmall" style={styles.selectedText}>
                  ✓ SELECTED
                </Text>
              </View>
            )}
          </View>

          <View style={styles.riderImageContainer}>
            {rider.photoUrl ? (
              <Image 
                source={{ uri: rider.photoUrl }} 
                style={styles.riderImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Text variant="displayMedium" style={styles.placeholderNumber}>
                  {rider.number}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.numberOverlay}>
            <Text variant="displayLarge" style={styles.bigNumber}>
              #{rider.number}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.infoSection}>
          <View style={styles.nameRow}>
            <Text variant="titleMedium" style={styles.riderName}>
              {rider.name.toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.detailsRow}>
            <Text variant="bodySmall" style={styles.nationality}>
              {nationalityFlags[rider.nationality] || '🏁'} {rider.nationality}
            </Text>
            <Text variant="bodySmall" style={styles.separator}>•</Text>
            <Text variant="bodySmall" style={styles.team} numberOfLines={1}>
              {rider.team}
            </Text>
          </View>

          {showValue && (
            <View style={styles.valueRow}>
              <Text variant="labelMedium">Valore:</Text>
              <Chip compact style={styles.valueChip}>
                {rider.value} crediti
              </Chip>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    overflow: 'hidden',
    flex: 1,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  cardContent: {
    overflow: 'hidden',
  },
  gradient: {
    height: 160,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    color: 'white',
    fontWeight: 'bold',
  },
  selectedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  selectedText: {
    color: 'white',
    fontWeight: 'bold',
  },
  riderImageContainer: {
    position: 'absolute',
    right: 10,
    bottom: 0,
    height: 130,
    width: 100,
  },
  riderImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  placeholderNumber: {
    color: 'rgba(255,255,255,0.3)',
    fontWeight: 'bold',
  },
  numberOverlay: {
    position: 'absolute',
    left: 12,
    bottom: 4, 
  },
  bigNumber: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 40, // Reduced size
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  infoSection: {
    padding: 12, // Reduced padding
    backgroundColor: 'white',
  },
  nameRow: {
    marginBottom: 4,
  },
  riderName: {
    fontWeight: 'bold',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nationality: {
    opacity: 0.7,
  },
  separator: {
    marginHorizontal: 8,
    opacity: 0.5,
  },
  team: {
    opacity: 0.7,
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  valueChip: {
    backgroundColor: '#E3F2FD',
  },
  // Stili per variant compact
  compactCard: {
    marginHorizontal: 8,
    marginVertical: 4,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  compactNumber: {
    width: 50,
    alignItems: 'center',
  },
  numberText: {
    fontWeight: 'bold',
    color: '#666',
  },
  compactInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
});