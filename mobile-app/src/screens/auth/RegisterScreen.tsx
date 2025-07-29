// mobile-app/src/screens/auth/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Snackbar,
  HelperText
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../../App';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { register } = useAuth();
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Validazioni
  const isEmailValid = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const isUsernameValid = (username: string) => {
    return username.length >= 3 && username.length <= 20 && /^[a-zA-Z0-9_]+$/.test(username);
  };

  const isPasswordValid = (password: string) => {
    return password.length >= 6;
  };

  const handleRegister = async () => {
    // Validazioni
    if (!email || !username || !password || !confirmPassword) {
      setError('Compila tutti i campi');
      return;
    }

    if (!isEmailValid(email)) {
      setError('Email non valida');
      return;
    }

    if (!isUsernameValid(username)) {
      setError('Username deve essere 3-20 caratteri, solo lettere, numeri e underscore');
      return;
    }

    if (!isPasswordValid(password)) {
      setError('La password deve essere almeno 6 caratteri');
      return;
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await register(email, username, password);
      // La navigazione avviene automaticamente
    } catch (err: any) {
      setError(err.message || 'Errore durante la registrazione');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Crea Account</Text>
          <Text style={styles.subtitle}>
            Unisciti al fantasy game della MotoGP
          </Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            style={styles.input}
            mode="outlined"
            left={<TextInput.Icon icon="email" />}
            error={email !== '' && !isEmailValid(email)}
          />
          <HelperText type="error" visible={email !== '' && !isEmailValid(email)}>
            Email non valida
          </HelperText>

          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            style={styles.input}
            mode="outlined"
            left={<TextInput.Icon icon="account" />}
            error={username !== '' && !isUsernameValid(username)}
          />
          <HelperText type="error" visible={username !== '' && !isUsernameValid(username)}>
            3-20 caratteri, solo lettere, numeri e underscore
          </HelperText>

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            style={styles.input}
            mode="outlined"
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            error={password !== '' && !isPasswordValid(password)}
          />
          <HelperText type="error" visible={password !== '' && !isPasswordValid(password)}>
            Minimo 6 caratteri
          </HelperText>

          <TextInput
            label="Conferma Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            style={styles.input}
            mode="outlined"
            left={<TextInput.Icon icon="lock-check" />}
            error={confirmPassword !== '' && password !== confirmPassword}
          />
          <HelperText type="error" visible={confirmPassword !== '' && password !== confirmPassword}>
            Le password non coincidono
          </HelperText>

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading}
            style={styles.registerButton}
            contentStyle={styles.registerButtonContent}
          >
            {isLoading ? 'Registrazione in corso...' : 'Registrati'}
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginButton}
          >
            Hai già un account? Accedi
          </Button>
        </View>

        <Snackbar
          visible={!!error}
          onDismiss={() => setError('')}
          duration={3000}
          style={styles.snackbar}
        >
          {error}
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B00',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  input: {
    marginBottom: 4,
  },
  registerButton: {
    marginTop: 16,
    marginBottom: 16,
  },
  registerButtonContent: {
    paddingVertical: 8,
  },
  loginButton: {
    marginBottom: 16,
  },
  snackbar: {
    backgroundColor: '#ff0000',
  },
});