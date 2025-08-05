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
  riderIds: string[];
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
  lineupVisibility?: 'ALWAYS_VISIBLE' | 'AFTER_DEADLINE';
}) => {
  const response = await api.post('/leagues', data);
  return response.data;
};

export const joinLeague = async (code: string) => {
  const response = await api.post('/leagues/join', { code });
  return response.data;
};

export const getLeagueDetails = async (leagueId: string) => {
  // NOTA: Il backend dovrebbe essere aggiornato per calcolare
  // e includere `lastRacePoints` e `trend` nella classifica.
  const response = await api.get(`/leagues/${leagueId}`);
  return response.data;
};

export const getLeagueStandings = async (leagueId: string) => {
  const response = await api.get(`/leagues/${leagueId}/standings`);
  return response.data;
};

export const updateLeagueSettings = async (leagueId: string, settings: { teamsLocked: boolean }) => {
    const response = await api.put(`/leagues/${leagueId}/settings`, settings);
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

export const getAllRaces = async (season: number) => {
  const response = await api.get(`/races/calendar/${season}`);
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

export const getLeagueRaceLineups = async (leagueId: string, raceId: string) => {
    const response = await api.get(`/leagues/${leagueId}/race/${raceId}/lineups`);
    return response.data;
};

// Statistiche
export const getMyStats = async () => {
  const response = await api.get('/stats/my-stats');
  return response.data;
};

// Funzioni Admin
export const getRaceResultsTemplate = async (raceId: string, category: string) => {
  const response = await api.get(`/sync/results/template/${raceId}/${category}`);
  return response.data;
};

export const postRaceResults = async (data: { raceId: string; results: any[] }) => {
  const response = await api.post('/sync/results', data);
  return response.data;
};

// Ottieni dettagli di una gara specifica
export const getRaceById = async (raceId: string) => {
  const response = await api.get(`/races/${raceId}`);
  return response.data;
};

// Ottieni risultati di una gara
export const getRaceResults = async (raceId: string, session?: 'RACE' | 'SPRINT') => {
    const response = await api.get(`/races/${raceId}/results`, { params: { session } });
    return response.data;
};

// Nuova funzione per i risultati delle qualifiche
export const getQualifyingResults = async (raceId: string) => {
  // Questo endpoint è ipotetico e andrebbe implementato nel backend
  const response = await api.get(`/races/${raceId}/qualifying`);
  return response.data;
};

// Ottieni dettagli di un pilota
export const getRiderById = async (riderId: string) => {
  const response = await api.get(`/riders/${riderId}`);
  return response.data;
};

export const getTeamById = async (teamId: string) => {
  const response = await api.get(`/teams/${teamId}`);
  return response.data;
};

// Ottieni statistiche di un pilota
export const getRiderStats = async (riderId: string, season?: number) => {
  const params = season ? { season } : {};
  const response = await api.get(`/riders/${riderId}/stats`, { params });
  return response.data;
};

// Ottieni il mio team in una lega specifica
export const getMyTeamInLeague = async (leagueId: string) => {
  const response = await api.get(`/teams/my-team/${leagueId}`);
  return response.data;
};