// mobile-app/src/screens/main/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';
import {
  Avatar,
  Card,
  Title,
  Paragraph,
  List,
  Switch,
  Button,
  Portal,
  Dialog,
  TextInput,
  Divider,
  Text,
  ActivityIndicator
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getMyStats } from '../../services/api';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['myStats'],
    queryFn: getMyStats,
  });

  const handleLogout = () => {
    Alert.alert(
      'Conferma Logout',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Esci', 
          style: 'destructive',
          onPress: logout 
        }
      ]
    );
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Errore', 'Le password non coincidono');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Errore', 'La password deve essere almeno 6 caratteri');
      return;
    }

    // Chiamata API per cambiare password
    try {
      // await changePassword(currentPassword, newPassword);
      Alert.alert('Successo', 'Password cambiata con successo');
      setChangePasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile cambiare la password');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Profilo */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Avatar.Text 
            size={80} 
            label={user?.username?.substring(0, 2).toUpperCase() || '??'}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Title style={styles.username}>{user?.username}</Title>
            <Paragraph style={styles.email}>{user?.email}</Paragraph>
            <View style={styles.creditsContainer}>
              <MaterialCommunityIcons name="cash" size={20} color="#FF6B00" />
              <Text style={styles.credits}>€{user?.credits?.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Statistiche */}
      <Card style={styles.card}>
        <Card.Title title="Le Mie Statistiche" />
        <Card.Content>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="trophy" size={30} color="#FFD700" />
              <Text style={styles.statValue}>{stats?.totalWins || 0}</Text>
              <Text style={styles.statLabel}>Vittorie</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="podium" size={30} color="#C0C0C0" />
              <Text style={styles.statValue}>{stats?.totalPodiums || 0}</Text>
              <Text style={styles.statLabel}>Podi</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account-group" size={30} color="#4CAF50" />
              <Text style={styles.statValue}>{stats?.totalTeams || 0}</Text>
              <Text style={styles.statLabel}>Team</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="star" size={30} color="#FF6B00" />
              <Text style={styles.statValue}>{stats?.totalPoints || 0}</Text>
              <Text style={styles.statLabel}>Punti Totali</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Impostazioni */}
      <Card style={styles.card}>
        <Card.Title title="Impostazioni" />
        <List.Section>
          <List.Item
            title="Notifiche Push"
            description="Ricevi notifiche per gare e risultati"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                color="#FF6B00"
              />
            )}
          />
          <Divider />
          <List.Item
            title="Modalità Scura"
            description="Attiva il tema scuro"
            left={(props) => <List.Icon {...props} icon="weather-night" />}
            right={() => (
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                color="#FF6B00"
              />
            )}
          />
          <Divider />
          <List.Item
            title="Cambia Password"
            left={(props) => <List.Icon {...props} icon="lock" />}
            onPress={() => setChangePasswordDialog(true)}
          />
        </List.Section>
      </Card>

      {/* Altro */}
      <Card style={styles.card}>
        <Card.Title title="Altro" />
        <List.Section>
          <List.Item
            title="Termini di Servizio"
            left={(props) => <List.Icon {...props} icon="file-document" />}
            onPress={() => {/* Naviga ai termini */}}
          />
          <Divider />
          <List.Item
            title="Privacy Policy"
            left={(props) => <List.Icon {...props} icon="shield-lock" />}
            onPress={() => {/* Naviga alla privacy */}}
          />
          <Divider />
          <List.Item
            title="Contattaci"
            left={(props) => <List.Icon {...props} icon="email" />}
            onPress={() => {/* Apri email */}}
          />
          <Divider />
          <List.Item
            title="Valuta l'App"
            left={(props) => <List.Icon {...props} icon="star" />}
            onPress={() => {/* Apri store per valutazione */}}
          />
        </List.Section>
      </Card>

      {/* Logout */}
      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor="#F44336"
      >
        Esci
      </Button>

      {/* Dialog Cambio Password */}
      <Portal>
        <Dialog visible={changePasswordDialog} onDismiss={() => setChangePasswordDialog(false)}>
          <Dialog.Title>Cambia Password</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Password Attuale"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Nuova Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Conferma Nuova Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              mode="outlined"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setChangePasswordDialog(false)}>Annulla</Button>
            <Button onPress={handleChangePassword}>Conferma</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    margin: 16,
    paddingVertical: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  avatar: {
    backgroundColor: '#FF6B00',
  },
  profileInfo: {
    marginLeft: 20,
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  creditsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  credits: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  card: {
    margin: 16,
    marginTop: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    width: '40%',
    alignItems: 'center',
    marginVertical: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    margin: 16,
    marginBottom: 32,
    borderColor: '#F44336',
  },
  input: {
    marginBottom: 12,
  },
});