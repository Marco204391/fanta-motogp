import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

export default function SystemSettings() {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Impostazioni Sistema
      </Typography>
      <Alert severity="info">
        Sezione in sviluppo - Qui potrai configurare le impostazioni globali del sistema.
      </Alert>
    </Box>
  );
}