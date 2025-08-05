// src/pages/RidersPage.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getRiders } from '../services/api';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Avatar,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Alert,
} from '@mui/material';
import { Search } from '@mui/icons-material';

interface Rider {
  id: string;
  name: string;
  number: number;
  team: string;
  category: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  nationality: string;
  value: number;
  photoUrl?: string | null;
  riderType: 'OFFICIAL' | 'REPLACEMENT' | 'WILDCARD' | 'TEST_RIDER';
}

const categoryColors = {
  MOTOGP: '#FF6B00',
  MOTO2: '#1976D2',
  MOTO3: '#388E3C',
};

function RiderCard({ rider }: { rider: Rider }) {
  return (
    <Card sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
      <Avatar
        sx={{
          bgcolor: categoryColors[rider.category],
          width: 56,
          height: 56,
          mr: 2,
        }}
        src={rider.photoUrl || undefined}
      >
        {rider.number}
      </Avatar>
      <Box>
        <Typography variant="h6">{rider.name}</Typography>
        <Typography variant="body2" color="text.secondary">
          {rider.team}
        </Typography>
        <Typography variant="body2" color="primary">
          {rider.value} crediti
        </Typography>
      </Box>
    </Card>
  );
}

export default function RidersPage() {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MOTOGP' | 'MOTO2' | 'MOTO3'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: ridersData, isLoading, error } = useQuery<{ riders: Rider[] }>({
    queryKey: ['allRiders'],
    queryFn: () => getRiders({ limit: 200 }),
  });

  const filteredRiders = useMemo(() => {
    if (!ridersData) return [];
    return ridersData.riders.filter(rider => {
      const matchesCategory = selectedCategory === 'ALL' || rider.category === selectedCategory;
      const matchesSearch =
        rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rider.team.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [ridersData, selectedCategory, searchQuery]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Errore nel caricamento dei piloti.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Piloti
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Cerca per nome o team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ToggleButtonGroup
              value={selectedCategory}
              exclusive
              onChange={(_, newValue) => newValue && setSelectedCategory(newValue)}
              fullWidth
            >
              <ToggleButton value="ALL">Tutti</ToggleButton>
              <ToggleButton value="MOTOGP">MotoGP</ToggleButton>
              <ToggleButton value="MOTO2">Moto2</ToggleButton>
              <ToggleButton value="MOTO3">Moto3</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {filteredRiders.length > 0 ? (
          filteredRiders.map(rider => (
            <Grid item xs={12} sm={6} md={4} key={rider.id}>
              <RiderCard rider={rider} />
            </Grid>
          ))
        ) : (
          <Grid item xs={12}>
            <Alert severity="info">Nessun pilota trovato con i filtri attuali.</Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}