// mobile-app/App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

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
import RaceCalendarScreen from './src/screens/main/RaceCalendarScreen';
import RaceDetailScreen from './src/screens/main/RaceDetailScreen';
import RiderDetailScreen from './src/screens/main/RiderDetailScreen';

// Import contexts
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

// Navigation types
export type RootStackParamList = { Auth: undefined; Main: undefined; };
export type AuthStackParamList = { Login: undefined; Register: undefined; };
export type MainStackParamList = {
  Tabs: undefined;
  CreateTeam: { leagueId: string };
  CreateLeague: undefined;
  Lineup: { teamId: string, race: any };
  LeagueDetail: { leagueId: string };
  RaceDetail: { raceId: string };
  RiderDetail: { riderId: string };
};
export type MainTabParamList = {
  Home: undefined;
  Teams: undefined;
  Leagues: undefined;
  Riders: undefined;
  Profile: undefined;
  Calendar: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainStack = createStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 2, staleTime: 5 * 60 * 1000 } } });
const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: '#FF6B00', accent: '#1E1E1E' } };

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

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
          else if (route.name === 'Calendar') iconName = 'calendar-check';
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
      <Tab.Screen name="Calendar" component={RaceCalendarScreen} options={{ title: 'Calendario' }} />
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
      <MainStack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }}/>
      <MainStack.Screen name="CreateTeam" component={CreateTeamScreen} options={{ title: 'Crea Team' }} />
      <MainStack.Screen name="CreateLeague" component={CreateLeagueScreen} options={{ title: 'Crea Lega' }} />
      <MainStack.Screen name="Lineup" component={LineupScreen} options={{ title: 'Schiera Formazione' }} />
      <MainStack.Screen name="LeagueDetail" component={LeagueDetailScreen} options={{ title: 'Dettagli Lega' }} />
      <MainStack.Screen name="RaceDetail" component={RaceDetailScreen} options={{ title: 'Dettagli Gara' }} />
      <MainStack.Screen name="RiderDetail" component={RiderDetailScreen} options={{ title: 'Dettagli Pilota' }} />
    </MainStack.Navigator>
  );
}

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

function AppContent() {
  const [fontsLoaded, fontError] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  const { isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    async function hideSplash() {
      if (fontsLoaded && !isAuthLoading) {
        await SplashScreen.hideAsync();
      }
    }
    hideSplash();
  }, [fontsLoaded, isAuthLoading]);

  if (!fontsLoaded || fontError) {
    return null;
  }

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}