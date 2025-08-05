// src/App.tsx
import { Routes, Route, Navigate, Outlet, Link as RouterLink } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import LeaguesPage from './pages/LeaguesPage';
import LeagueDetailPage from './pages/LeagueDetailPage';
import CreateTeamPage from './pages/CreateTeamPage';
import TeamsPage from './pages/TeamsPage';
import LineupPage from './pages/LineupPage';
import RidersPage from './pages/RidersPage';
import RiderDetailPage from './pages/RiderDetailPage';
import RaceCalendarPage from './pages/RaceCalendarPage'; // <-- Importa
import RaceDetailPage from './pages/RaceDetailPage'; // <-- Importa
import ProfilePage from './pages/ProfilePage'; // <-- Importa
import { AppBar, Toolbar, Typography, Button, Container, Box, CircularProgress, Menu, MenuItem, IconButton } from '@mui/material';
import { AccountCircle } from '@mui/icons-material';
import React from 'react';

function MainLayout() {
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: '#FF6B00' }}>
        <Toolbar>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}>
            Fanta MotoGP
          </Typography>
          <Button color="inherit" component={RouterLink} to="/teams">I Miei Team</Button>
          <Button color="inherit" component={RouterLink} to="/leagues">Leghe</Button>
          <Button color="inherit" component={RouterLink} to="/riders">Piloti</Button>
          <Button color="inherit" component={RouterLink} to="/calendar">Calendario</Button> {/* <-- Aggiungi link */}
          
          <IconButton
            size="large"
            onClick={handleMenu}
            color="inherit"
          >
            <AccountCircle />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem component={RouterLink} to="/profile" onClick={handleClose}>Profilo</MenuItem>
            <MenuItem onClick={() => { handleClose(); logout(); }}>Logout</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Outlet />
      </Container>
    </>
  );
}

function AuthLayout() {
  // ... (invariato)
  return (
    <Container>
      <Outlet />
    </Container>
  );
}

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      {isAuthenticated ? (
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:teamId/lineup" element={<LineupPage />} />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/leagues/:leagueId" element={<LeagueDetailPage />} />
          <Route path="/leagues/:leagueId/create-team" element={<CreateTeamPage />} />
          <Route path="/riders" element={<RidersPage />} />
          <Route path="/riders/:riderId" element={<RiderDetailPage />} />
          <Route path="/calendar" element={<RaceCalendarPage />} /> {/* <-- Aggiungi rotta */}
          <Route path="/races/:raceId" element={<RaceDetailPage />} /> {/* <-- Aggiungi rotta */}
          <Route path="/profile" element={<ProfilePage />} /> {/* <-- Aggiungi rotta */}
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      ) : (
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Route>
      )}
    </Routes>
  );
}

export default App;