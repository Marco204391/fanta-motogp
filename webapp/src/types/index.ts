// src/types/index.ts

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  credits: number;
  createdAt: string;
  updatedAt: string;
}

// Rider types
export interface Rider {
  id: string;
  name: string;
  number: number;
  category: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  value: number;
  riderType: string;
  team: string;
  totalPoints?: number;
  averagePoints?: number;
}

// Team types
export interface Team {
  id: string;
  name: string;
  userId: string;
  leagueId: string;
  league: League;
  riders: TeamRider[];
  totalPoints: number;
  remainingBudget: number;
  createdAt: string;
  updatedAt: string;
  hasLineup?: boolean;
  lastRacePoints?: number;
  position?: number;
}

export interface TeamRider {
  teamId: string;
  riderId: string;
  rider: Rider;
  joinedAt: string;
}

// League types
export interface League {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  isPrivate: boolean;
  maxTeams: number;
  currentTeams: number;
  budget: number;
  scoringRules?: any;
  prizePool?: number;
  teamsLocked: boolean;
  currentRound?: number;
  totalPrizePool?: number;
  createdAt: string;
  updatedAt: string;
  userPosition?: number;
  userPoints?: number;
  hasTeam?: boolean;
}

// Race types
export interface Race {
  id: string;
  name: string;
  circuit: string;
  country: string;
  gpDate: string;
  sprintDate?: string;
  round: number;
  season: number;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  createdAt: string;
  updatedAt: string;
}

// Lineup types
export interface Lineup {
  id: string;
  teamId: string;
  raceId: string;
  activeRiderIds: string[];
  captainId?: string;
  points?: number;
  createdAt: string;
  updatedAt: string;
}

// Standing types
export interface Standing {
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  totalPoints: number;
  lastRacePoints?: number;
  position?: number;
  trend?: 'up' | 'down' | 'same';
  riders?: TeamRider[];
}

// Result types
export interface RaceResult {
  id: string;
  raceId: string;
  riderId: string;
  position: number;
  points: number;
  status: 'FINISHED' | 'DNF' | 'DNS' | 'DSQ';
  fastestLap?: boolean;
  polePosition?: boolean;
  rider: Rider;
}

export interface TeamRaceResult {
  teamId: string;
  raceId: string;
  totalPoints: number;
  riderResults: {
    riderId: string;
    points: number;
    isCaptain: boolean;
    rider: Rider;
  }[];
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form types
export interface CreateTeamForm {
  name: string;
  leagueId: string;
  riderIds: string[];
}

export interface CreateLeagueForm {
  name: string;
  isPrivate: boolean;
  maxTeams: number;
  budget: number;
  scoringRules?: any;
}

export interface LineupForm {
  teamId: string;
  activeRiderIds: string[];
  captainId?: string;
}