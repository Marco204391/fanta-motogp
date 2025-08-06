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
    // Qui potresti implementare WebSocket o Server-Sent Events
    // Per ora usiamo il polling
    endpoints.forEach(endpoint => {
      queryClient.invalidateQueries({ queryKey: [endpoint] });
    });
  }, [queryClient, endpoints]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(checkForUpdates, pollingInterval);

    // Listener per eventi custom
    const handleRaceUpdate = (event: CustomEvent) => {
      notify(`Aggiornamento gara: ${event.detail.raceName}`, 'info');
      queryClient.invalidateQueries({ queryKey: ['races'] });
    };

    const handleLineupDeadline = (event: CustomEvent) => {
      notify(`Deadline formazione in scadenza per ${event.detail.raceName}!`, 'warning');
    };

    window.addEventListener('race-update', handleRaceUpdate as EventListener);
    window.addEventListener('lineup-deadline', handleLineupDeadline as EventListener);

    return () => {
      clearInterval(interval);
      window.removeEventListener('race-update', handleRaceUpdate as EventListener);
      window.removeEventListener('lineup-deadline', handleLineupDeadline as EventListener);
    };
  }, [enabled, pollingInterval, checkForUpdates, notify, queryClient]);

  return { checkForUpdates };
}
