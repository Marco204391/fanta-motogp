// mobile-app/src/services/api.ts
import axios from 'axios';
import { Platform } from 'react-native';

// URL base API - cambia in produzione
const BASE_URL = Platform.select({
  ios: 'http://localhost:3000/api',
  android: 'http://10.0.2.2:3000/api', // Per emulatore Android
  default: 'http://localhost:3000/api'
});

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per gestire errori globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token scaduto o non valido
      // Qui potresti emettere un evento per fare logout globale
    }
    return Promise.reject(error);
  }
);

export default api;

// Funzioni helper per le API

// Piloti
export const getRiders = async (params?: {
  category?: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  search?: string;
  sortBy?: 'value' | 'points' | 'name';
}) => {
  const response = await api.get('/riders', { params });
  return response.data;
};

export const getRiderDetails = async (riderId: string) => {
  const response = await api.get(`/riders/${riderId}`);
  return response.data;
};

// Team
export const getMyTeams = async () => {
  const response = await api.get('/teams/my-teams');
  return response.data;
};

export const createTeam = async (data: {
  name: string;
  leagueId: string;
  riderIds: string[];
  captainId: string;
}) => {
  const response = await api.post('/teams', data);
  return response.data;
};

export const updateTeam = async (teamId: string, data: {
  riderIds?: string[];
  captainId?: string;
}) => {
  const response = await api.put(`/teams/${teamId}`, data);
  return response.data;
};

// Leghe
export const getMyLeagues = async () => {
  const response = await api.get('/leagues/my-leagues');
  return response.data;
};

export const getPublicLeagues = async () => {
  const response = await api.get('/leagues/public');
  return response.data;
};

export const createLeague = async (data: {
  name: string;
  isPrivate: boolean;
  maxTeams: number;
  budget: number;
  scoringRules?: any;
}) => {
  const response = await api.post('/leagues', data);
  return response.data;
};

export const joinLeague = async (code: string) => {
  const response = await api.post('/leagues/join', { code });
  return response.data;
};

export const getLeagueDetails = async (leagueId: string) => {
  const response = await api.get(`/leagues/${leagueId}`);
  return response.data;
};

export const getLeagueStandings = async (leagueId: string) => {
  const response = await api.get(`/leagues/${leagueId}/standings`);
  return response.data;
};

// Gare
export const getUpcomingRaces = async () => {
  const response = await api.get('/races/upcoming');
  return response.data;
};

export const getPastRaces = async () => {
  const response = await api.get('/races/past');
  return response.data;
};

export const getRaceResults = async (raceId: string) => {
  const response = await api.get(`/races/${raceId}/results`);
  return response.data;
};

// Schieramenti
export const getLineup = async (teamId: string, raceId: string) => {
  const response = await api.get(`/lineups/${raceId}`, { params: { teamId } });
  return response.data;
};

export const setLineup = async (raceId: string, lineupData: any) => {
  const response = await api.post(`/lineups/${raceId}`, lineupData);
  return response.data;
};


// Statistiche
export const getMyStats = async () => {
  const response = await api.get('/stats/my-stats');
  return response.data;
};

export const getRiderStats = async (riderId: string, season?: number) => {
  const response = await api.get(`/stats/rider/${riderId}`, {
    params: { season }
  });
  return response.data;
};