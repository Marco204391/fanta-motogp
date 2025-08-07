import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

export default function LeagueAdminPanel() {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Gestione Leghe
      </Typography>
      <Alert severity="info">
        Sezione in sviluppo - Qui potrai gestire tutte le leghe del sistema.
      </Alert>
    </Box>
  );
}