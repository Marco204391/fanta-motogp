import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyStats, updateProfile, changePassword } from '../services/api';
import {
  Box, Typography, Card, CardContent, Button, Avatar, Grid,
  Paper, Stack, Divider, List, ListItem, ListItemText,
  ListItemIcon, Chip, CircularProgress, TextField,
  Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, Switch, Alert
} from '@mui/material';
import {
  EmojiEvents, SportsMotorsports, Groups, TrendingUp, Star,
  AccountCircle, Logout, Settings, Edit, Save, Cancel,
  Lock, Delete, Notifications, Email, CalendarToday
} from '@mui/icons-material';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNotification } from '../contexts/NotificationContext';

export default function ProfilePage() {
  const { user, logout, updateUser: updateAuthUser } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['myStats'],
    queryFn: getMyStats,
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  const profileUpdateMutation = useMutation({
    mutationFn: (data: { username?: string; email?: string }) => updateProfile(data),
    onSuccess: (response: any) => {
        const updatedUser = response.user;
        notify('Profilo aggiornato con successo!', 'success');
        if (updatedUser) {
            const newUser = { ...user, ...updatedUser };
            updateAuthUser(newUser as any);
        }
        queryClient.invalidateQueries({ queryKey: ['myStats'] });
        setEditMode(false);
    },
    onError: (error: any) => {
      notify(error.response?.data?.error || 'Errore durante l\'aggiornamento', 'error');
    },
  });

  const passwordChangeMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) => changePassword(data),
    onSuccess: () => {
      notify('Password cambiata con successo!', 'success');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      notify(error.response?.data?.error || 'Errore durante il cambio password', 'error');
    },
  });

  const handleProfileSave = () => {
    const changes: { username?: string; email?: string } = {};
    if (username !== user?.username) changes.username = username;
    if (email !== user?.email) changes.email = email;

    if (Object.keys(changes).length > 0) {
      profileUpdateMutation.mutate(changes);
    } else {
      setEditMode(false);
    }
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      notify('Le nuove password non coincidono', 'error');
      return;
    }
    if (newPassword.length < 6) {
      notify('La nuova password deve essere di almeno 6 caratteri', 'warning');
      return;
    }
    passwordChangeMutation.mutate({ currentPassword, newPassword });
  };

  if (isLoadingStats || !user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }
  
  // Utilizziamo i dati utente dal contesto Auth, che sono sempre aggiornati
  const stats = statsData?.user || {};

  return (
    <Box className="fade-in">
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Profilo Utente
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Info Column */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  bgcolor: 'primary.main',
                  fontSize: 48,
                  mb: 2,
                  mx: 'auto'
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
              
              {!editMode ? (
                <>
                  <Typography variant="h5" fontWeight="bold">{user.username}</Typography>
                  <Typography color="text.secondary" gutterBottom>{user.email}</Typography>
                </>
              ) : (
                <Stack spacing={2} sx={{ my: 2 }}>
                  <TextField label="Username" value={username} onChange={e => setUsername(e.target.value)} />
                  <TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </Stack>
              )}

              <Divider sx={{ my: 2 }} />

              <List dense sx={{ textAlign: 'left' }}>
                  <ListItem disableGutters>
                      <ListItemIcon><Star sx={{color: 'warning.main'}} /></ListItemIcon>
                      <ListItemText primary="Crediti Disponibili" secondary={`${user.credits || 0}`} />
                  </ListItem>
                  <ListItem disableGutters>
                      <ListItemIcon><CalendarToday sx={{color: 'info.main'}}/></ListItemIcon>
                      <ListItemText primary="Membro dal" secondary={user.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy', { locale: it }) : 'N/A'} />
                  </ListItem>
              </List>

              <Box sx={{ mt: 3 }}>
                {!editMode ? (
                  <Button variant="contained" startIcon={<Edit />} onClick={() => setEditMode(true)}>
                    Modifica Profilo
                  </Button>
                ) : (
                  <Stack direction="row" spacing={2}>
                    <Button variant="outlined" startIcon={<Cancel />} onClick={() => setEditMode(false)}>
                      Annulla
                    </Button>
                    <Button variant="contained" startIcon={<Save />} onClick={handleProfileSave} disabled={profileUpdateMutation.isPending}>
                      {profileUpdateMutation.isPending ? 'Salvataggio...' : 'Salva'}
                    </Button>
                  </Stack>
                )}
              </Box>
              
            </CardContent>
          </Card>
        </Grid>

        {/* Stats and Settings Column */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* Stats Card */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Le Tue Statistiche</Typography>
                <Grid container spacing={2}>
                  {[
                    { label: 'Team Totali', value: stats.teams?.length || 0, icon: SportsMotorsports, color: 'primary' },
                    { label: 'Leghe Attive', value: stats.leagues?.length || 0, icon: Groups, color: 'secondary' },
                    { label: 'Punti Totali', value: 'N/A', icon: TrendingUp, color: 'success' },
                    { label: 'Miglior Pos.', value: 'N/A', icon: EmojiEvents, color: 'warning' }
                  ].map(stat => {
                    const Icon = stat.icon;
                    return (
                    <Grid item xs={6} sm={3} key={stat.label}>
                      <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                         <Icon sx={{ fontSize: 32, color: `${stat.color}.main`, mb: 1 }} />
                        <Typography variant="h5" fontWeight="bold">{stat.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                      </Paper>
                    </Grid>
                  )})}
                </Grid>
              </CardContent>
            </Card>

            {/* Settings Card */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Impostazioni</Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><Notifications /></ListItemIcon>
                    <ListItemText primary="Notifiche Push" secondary="Ricevi notifiche per gare e risultati" />
                    <Switch edge="end" defaultChecked />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem>
                    <ListItemIcon><Email /></ListItemIcon>
                    <ListItemText primary="Notifiche Email" secondary="Ricevi aggiornamenti settimanali" />
                    <Switch edge="end" />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem button onClick={() => setShowPasswordModal(true)}>
                    <ListItemIcon><Lock /></ListItemIcon>
                    <ListItemText primary="Cambia Password" />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem button onClick={() => alert('Funzionalità in arrivo!')}>
                    <ListItemIcon><Delete sx={{ color: 'error.main' }} /></ListItemIcon>
                    <ListItemText primary="Elimina Account" sx={{ color: 'error.main' }} />
                  </ListItem>
                  <Divider component="li" />
                  <ListItem button onClick={logout}>
                    <ListItemIcon><Logout /></ListItemIcon>
                    <ListItemText primary="Logout" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
      
      {/* Password Change Modal */}
      <Dialog open={showPasswordModal} onClose={() => setShowPasswordModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cambia Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField type="password" label="Password Attuale" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} fullWidth />
            <TextField type="password" label="Nuova Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} fullWidth />
            <TextField type="password" label="Conferma Nuova Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordModal(false)}>Annulla</Button>
          <Button variant="contained" onClick={handlePasswordChange} disabled={passwordChangeMutation.isPending}>
            {passwordChangeMutation.isPending ? 'Aggiornamento...' : 'Aggiorna'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}