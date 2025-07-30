// backend/src/types/index.ts
import { Request } from 'express';

// Estendi Request per includere userId
export interface AuthRequest extends Request {
  userId?: string;
}

// Scoring rules type
export interface ScoringRules {
  position: {
    [key: number]: number;
  };
  polePosition: number;
  fastestLap: number;
  dnf: number;
  captainMultiplier: number;
}

// Response types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Query params types
export interface RiderQueryParams {
  category?: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  search?: string;
  sortBy?: 'value' | 'points' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface LeagueQueryParams {
  search?: string;
  page?: number;
  limit?: number;
}

// DTOs
export interface CreateTeamDTO {
  name: string;
  leagueId: string;
  riderIds: string[];
  captainId: string;
}

export interface UpdateTeamDTO {
  riderIds?: string[];
  captainId?: string;
}

export interface CreateLeagueDTO {
  name: string;
  isPrivate?: boolean;
  maxTeams?: number;
  budget?: number;
  scoringRules?: ScoringRules;
  startDate?: Date;
  endDate?: Date;
}

export interface JoinLeagueDTO {
  code: string;
}

export interface RaceFromAPI {
  id: string;
  name: string;
  circuit: string;
  country: string;
  date: Date;
  season: number;
  round: number;
  sprintDate?: Date; // Data della gara sprint, se disponibile
}