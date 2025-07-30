// mobile-app/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/main/HomeScreen';
import TeamsScreen from './src/screens/main/TeamsScreen';
import LeaguesScreen from './src/screens/main/LeaguesScreen';
import RidersScreen from './src/screens/main/RidersScreen';
import ProfileScreen from './src/screens/main/ProfileScreen';
import CreateTeamScreen from './src/screens/main/CreateTeamScreen';
import CreateLeagueScreen from './src/screens/main/CreateLeagueScreen';
import LineupScreen from './src/screens/main/LineupScreen';
import LeagueDetailScreen from './src/screens/main/LeagueDetailScreen';

// Import contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  CreateTeam: undefined;
  CreateLeague: undefined;
  Lineup: { teamId: string, race: any };
  LeagueDetail: { leagueId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Teams: undefined;
  Leagues: undefined;
  Riders: undefined;
  Profile: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainStack = createStackNavigator<MainStackParamList>(); // Stack principale
const Tab = createBottomTabNavigator<MainTabParamList>(); // Schede

// Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minuti
    },
  },
});

// Theme
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FF6B00',
    accent: '#1E1E1E',
  },
};

// Auth Navigator (invariato)
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Navigatore a Schede (ora è un componente separato)
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: any = 'home';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Teams') iconName = 'account-group';
          else if (route.name === 'Leagues') iconName = 'trophy';
          else if (route.name === 'Riders') iconName = 'motorbike';
          else if (route.name === 'Profile') iconName = 'account';
          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#fff',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="Teams" component={TeamsScreen} options={{ title: 'I Miei Team' }} />
      <Tab.Screen name="Leagues" component={LeaguesScreen} options={{ title: 'Leghe' }} />
      <Tab.Screen name="Riders" component={RidersScreen} options={{ title: 'Piloti' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profilo' }} />
    </Tab.Navigator>
  );
}


function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: '#fff',
      }}
    >
      <MainStack.Screen 
        name="Tabs" 
        component={TabNavigator} 
        options={{ headerShown: false }} // Nasconde l'header doppio
      />
      <MainStack.Screen 
        name="CreateTeam" 
        component={CreateTeamScreen} 
        options={{ title: 'Crea Team' }} 
      />
      <MainStack.Screen 
        name="CreateLeague" 
        component={CreateLeagueScreen} 
        options={{ title: 'Crea Lega' }} 
      />
      <MainStack.Screen 
        name="Lineup" 
        component={LineupScreen} 
        options={{ title: 'Schiera Formazione' }} 
      />
      <MainStack.Screen 
        name="LeagueDetail" 
        component={LeagueDetailScreen} 
        options={{ title: 'Dettagli Lega' }} 
      />
    </MainStack.Navigator>
  );
}


// Root Navigator (invariato)
function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return null;
  }
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name="Main" component={MainNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}

// Main App (invariato)
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}