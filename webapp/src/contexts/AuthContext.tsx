// webapp/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  username: string;
  credits: number;
  isAdmin?: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve essere usato dentro AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        try {
          const response = await api.get('/auth/profile');
          const userData = response.data.user;
          setToken(storedToken);
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          console.error('Token non valido o scaduto, logout in corso.');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setIsLoading(false);
    };

    validateToken();
  }, []);

  const handleAuthSuccess = (token: string, user: User) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setToken(token);
    setUser(user);
  };

  const login = async (emailOrUsername: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { emailOrUsername, password });
      handleAuthSuccess(response.data.token, response.data.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Errore durante il login');
    }
  };

  const register = async (email: string, username: string, password: string) => {
    try {
      const response = await api.post('/auth/register', { email, username, password });
      handleAuthSuccess(response.data.token, response.data.user);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Errore durante la registrazione');
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = { user, token, isAuthenticated: !!token, isLoading, login, register, logout, updateUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};