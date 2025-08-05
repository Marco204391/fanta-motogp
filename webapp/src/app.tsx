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
import LineupPage from './pages/LineupPage'; // Importa
import { AppBar, Toolbar, Typography, Button, Container, Box, CircularProgress } from '@mui/material';

// ... (i componenti MainLayout e AuthLayout rimangono invariati)

function MainLayout() {
  const { user, logout } = useAuth();
  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: '#FF6B00' }}>
        <Toolbar>
          <Typography variant="h6" component={RouterLink} to="/" sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}>
            Fanta MotoGP
          </Typography>
          <Button color="inherit" component={RouterLink} to="/teams">I Miei Team</Button>
          <Button color="inherit" component={RouterLink} to="/leagues">Leghe</Button>
          <Typography sx={{ ml: 4, mr: 2 }}>Ciao, {user?.username}!</Typography>
          <Button color="inherit" onClick={logout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4, mb: 4 }}>
        <Outlet />
      </Container>
    </>
  );
}

function AuthLayout() {
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
          <Route path="/teams/:teamId/lineup" element={<LineupPage />} /> {/* Aggiungi rotta */}
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/leagues/:leagueId" element={<LeagueDetailPage />} />
          <Route path="/leagues/:leagueId/create-team" element={<CreateTeamPage />} />
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