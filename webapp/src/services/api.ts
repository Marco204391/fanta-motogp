// src/services/api.ts
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Funzioni API ---

// Auth
export const login = (data: any) => api.post('/auth/login', data);
export const register = (data: any) => api.post('/auth/register', data);
export const getProfile = () => api.get('/auth/profile');

// Teams
export const getMyTeams = async () => (await api.get('/teams/my-teams')).data;
export const createTeam = async (data: { name: string; leagueId: string; riderIds: string[] }) => (await api.post('/teams', data)).data;
export const getTeamById = async (teamId: string) => (await api.get(`/teams/${teamId}`)).data;

// Leagues
export const getMyLeagues = async () => (await api.get('/leagues/my-leagues')).data;
export const getPublicLeagues = async () => (await api.get('/leagues/public')).data;
export const getLeagueDetails = async (leagueId: string) => (await api.get(`/leagues/${leagueId}`)).data;
export const joinLeague = async (code: string) => (await api.post('/leagues/join', { code })).data;

// Races
export const getUpcomingRaces = async () => (await api.get('/races/upcoming')).data;

// Riders
export const getRiders = async (params?: any) => (await api.get('/riders', { params })).data;

// Lineups
export const getLineup = async (teamId: string, raceId: string) => (await api.get(`/lineups/${raceId}`, { params: { teamId } })).data;
export const setLineup = async (raceId: string, lineupData: any) => (await api.post(`/lineups/${raceId}`, lineupData)).data;

export default api;