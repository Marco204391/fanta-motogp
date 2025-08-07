// webapp/src/hooks/useRealTimeUpdates.ts
import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotification } from '../contexts/NotificationContext';

interface RealTimeConfig {
  enabled?: boolean;
  pollingInterval?: number;
  endpoints?: string[];
}

export function useRealTimeUpdates(config: RealTimeConfig = {}) {
  const {
    enabled = true,
    pollingInterval = 30000, // 30 secondi default
    endpoints = ['leagues', 'races', 'lineups']
  } = config;

  const queryClient = useQueryClient();
  const { notify } = useNotification();

  const checkForUpdates = useCallback(async () => {
    // Invalida query per forzare refresh
    endpoints.forEach(endpoint => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    });
  }, [queryClient, endpoints]);

  useEffect(() => {
    if (!enabled) return;

    // Setup polling
    const interval = setInterval(checkForUpdates, pollingInterval);

    // Listener per eventi custom
    const handleRaceUpdate = (event: CustomEvent) => {
      notify(`Aggiornamento gara: ${event.detail.raceName}`, 'info');
      queryClient.invalidateQueries({ queryKey: ['races'] });
    };

    const handleLineupDeadline = (event: CustomEvent) => {
      notify(`Deadline formazione in scadenza per ${event.detail.raceName}!`, 'warning');
    };

    const handleLeagueUpdate = (event: CustomEvent) => {
      queryClient.invalidateQueries({ queryKey: ['leagues'] });
    };

    // Aggiungi listener
    window.addEventListener('race-update', handleRaceUpdate as EventListener);
    window.addEventListener('lineup-deadline', handleLineupDeadline as EventListener);
    window.addEventListener('league-update', handleLeagueUpdate as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('race-update', handleRaceUpdate as EventListener);
      window.removeEventListener('lineup-deadline', handleLineupDeadline as EventListener);
      window.removeEventListener('league-update', handleLeagueUpdate as EventListener);
    };
  }, [enabled, pollingInterval, checkForUpdates, notify, queryClient]);

  // Funzione per trigger manuale refresh
  const forceRefresh = useCallback(() => {
    checkForUpdates();
    notify('Dati aggiornati', 'success');
  }, [checkForUpdates, notify]);

  return { forceRefresh };
}