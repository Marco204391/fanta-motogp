// src/pages/ProfilePage.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Box, Typography, Card, CardContent, Button, Avatar } from '@mui/material';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profilo
      </Typography>
      <Card>
        <CardContent sx={{ textAlign: 'center' }}>
          <Avatar sx={{ width: 80, height: 80, margin: '0 auto 16px' }}>
            {user.username.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h5">{user.username}</Typography>
          <Typography color="text.secondary">{user.email}</Typography>
          <Typography sx={{ mt: 2 }}>Crediti: {user.credits}</Typography>
          <Button variant="contained" color="error" onClick={logout} sx={{ mt: 3 }}>
            Logout
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}