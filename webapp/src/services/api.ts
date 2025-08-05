// src/services/api.ts
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor per aggiungere il token di autenticazione
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor per gestire errori globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token scaduto o non valido
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// --- Funzioni API ---

// Auth
export const login = (data: any) => api.post('/auth/login', data);
export const register = (data: any) => api.post('/auth/register', data);
export const getProfile = () => api.get('/auth/profile');

// Teams
export const getMyTeams = async () => {
  const response = await api.get('/teams/my-teams');
  return response.data;
};

export const createTeam = async (data: { 
  name: string; 
  leagueId: string; 
  riderIds: string[] 
}) => {
  const response = await api.post('/teams', data);
  return response.data;
};

export const getTeamById = async (teamId: string) => {
  const response = await api.get(`/teams/${teamId}`);
  return response.data;
};

export const updateTeam = async (teamId: string, data: {
  name?: string;
  riderIds?: string[];
}) => {
  const response = await api.put(`/teams/${teamId}`, data);
  return response.data;
};

export const getMyTeamInLeague = async (leagueId: string) => {
  const response = await api.get(`/teams/my-team-in-league/${leagueId}`);
  return response.data;
};

// Leagues
export const getMyLeagues = async () => {
  const response = await api.get('/leagues/my-leagues');
  return response.data;
};

export const getPublicLeagues = async () => {
  const response = await api.get('/leagues/public');
  return response.data;
};

export const getLeagueDetails = async (leagueId: string) => {
  const response = await api.get(`/leagues/${leagueId}`);
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

export const updateLeagueSettings = async (leagueId: string, data: any) => {
  const response = await api.put(`/leagues/${leagueId}/settings`, data);
  return response.data;
};

// Races
export const getAllRaces = async () => {
  const response = await api.get('/races');
  return response.data;
};

export const getUpcomingRaces = async () => {
  const response = await api.get('/races/upcoming');
  return response.data;
};

export const getRaceById = async (raceId: string) => {
  const response = await api.get(`/races/${raceId}`);
  return response.data;
};

// Riders
export const getRiders = async (params?: {
  category?: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  search?: string;
  sortBy?: 'value' | 'points' | 'name';
  limit?: number;
}) => {
  const response = await api.get('/riders', { params });
  return response.data;
};

export const getRiderById = async (riderId: string) => {
  const response = await api.get(`/riders/${riderId}`);
  return response.data;
};

export const getRiderStats = async (riderId: string, season?: number) => {
  const response = await api.get(`/riders/${riderId}/stats`, {
    params: { season }
  });
  return response.data;
};

// Lineups
export const getLineup = async (teamId: string, raceId: string) => {
  const response = await api.get(`/lineups/${raceId}`, { 
    params: { teamId } 
  });
  return response.data;
};

export const setLineup = async (raceId: string, lineupData: {
  teamId: string;
  activeRiderIds: string[];
  captainId?: string;
}) => {
  const response = await api.post(`/lineups/${raceId}`, lineupData);
  return response.data;
};

export const getLeagueRaceLineups = async (leagueId: string, raceId: string) => {
  const response = await api.get(`/lineups/league/${leagueId}/race/${raceId}`);
  return response.data;
};

// Results
export const getRaceResults = async (raceId: string) => {
  const response = await api.get(`/results/race/${raceId}`);
  return response.data;
};

export const getTeamRaceResults = async (teamId: string, raceId: string) => {
  const response = await api.get(`/results/team/${teamId}/race/${raceId}`);
  return response.data;
};

// Statistics
export const getLeagueStats = async (leagueId: string) => {
  const response = await api.get(`/stats/league/${leagueId}`);
  return response.data;
};

export const getTeamStats = async (teamId: string) => {
  const response = await api.get(`/stats/team/${teamId}`);
  return response.data;
};

export default api;