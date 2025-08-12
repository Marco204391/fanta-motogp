// webapp/src/App.tsx
import { Routes, Route, Navigate, Outlet, Link as RouterLink, useLocation } from 'react-router-dom';
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
import RaceCalendarPage from './pages/RaceCalendarPage';
import RaceDetailPage from './pages/RaceDetailPage';
import ProfilePage from './pages/ProfilePage';
import EditTeamPage from './pages/EditTeamPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import { AppBar, Toolbar, Typography, Button, Container, Box, CircularProgress, Menu, MenuItem, IconButton, Avatar } from '@mui/material';
import React from 'react';
import CreateLeaguePage from './pages/CreateLeaguePage';
import MenuIcon from '@mui/icons-material/Menu';


const Logo = () => (
    <svg width="40" height="40" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 0L122.451 69.0983H195.106L136.327 111.803L158.779 180.902L100 138.197L41.2215 180.902L63.6729 111.803L4.89435 69.0983H77.5492L100 0Z" fill="#E60023"/>
    </svg>
);

function MainLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  // State per il menu mobile
  const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);
  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElNav(event.currentTarget);
  };
  const handleCloseNavMenu = () => {
    setAnchorElNav(null);
  };

  // State per il menu utente
  const [anchorElUser, setAnchorElUser] = React.useState<null | HTMLElement>(null);
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };
  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const navLinks = [
    { label: 'Dashboard', path: '/' },
    { label: 'I Miei Team', path: '/teams' },
    { label: 'Leghe', path: '/leagues' },
    { label: 'Piloti', path: '/riders' },
    { label: 'Calendario', path: '/calendar' },
  ];

  if (user?.isAdmin) {
    navLinks.push({ label: 'Admin', path: '/admin' });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {/* Logo e Titolo per Desktop */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mr: 2 }}>
                <Logo />
                <Typography
                    variant="h6"
                    noWrap
                    component={RouterLink}
                    to="/"
                    sx={{
                        ml: 2,
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        letterSpacing: '.2rem',
                        color: 'inherit',
                        textDecoration: 'none',
                    }}
                >
                    FANTA MOTOGP
                </Typography>
            </Box>
            
            {/* Hamburger Menu per Mobile */}
            <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{
                  display: { xs: 'block', md: 'none' },
                }}
              >
                {navLinks.map((link) => (
                  <MenuItem key={link.label} onClick={handleCloseNavMenu} component={RouterLink} to={link.path}>
                    <Typography textAlign="center">{link.label}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </Box>
            
            {/* Logo e Titolo per Mobile (centrato) */}
             <Typography
                variant="h6"
                noWrap
                component={RouterLink}
                to="/"
                sx={{
                  display: { xs: 'flex', md: 'none' },
                  flexGrow: 1,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '.2rem',
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                FANTA MOTOGP
            </Typography>

            {/* Menu Desktop */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
              {navLinks.map((link) => (
                <Button
                  key={link.label}
                  onClick={handleCloseNavMenu}
                  component={RouterLink}
                  to={link.path}
                  sx={{ my: 2, color: 'white', display: 'block', position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      width: '100%',
                      transform: location.pathname === link.path ? 'scaleX(1)' : 'scaleX(0)',
                      height: '2px',
                      bottom: 0,
                      left: 0,
                      backgroundColor: 'secondary.main',
                      transformOrigin: 'bottom center',
                      transition: 'transform 0.25s ease-out',
                    }
                  }}
                >
                  {link.label}
                </Button>
              ))}
            </Box>

            {/* Menu Utente (invariato) */}
            <Box sx={{ flexGrow: 0 }}>
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                        {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
                    </Avatar>
                </IconButton>
              <Menu
                sx={{ mt: '45px' }}
                anchorEl={anchorElUser}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                <MenuItem component={RouterLink} to="/profile" onClick={handleCloseUserMenu}>
                    <Typography textAlign="center">Profilo</Typography>
                </MenuItem>
                <MenuItem onClick={() => { handleCloseUserMenu(); logout(); }}>
                  <Typography textAlign="center">Logout</Typography>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        <Outlet />
      </Container>
    </Box>
  );
}

function AuthLayout() {
  return (
    <Container component="main" maxWidth="xs">
      <Outlet />
    </Container>
  );
}

function App() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      {isAuthenticated && user ? (
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/teams/:teamId/edit" element={<EditTeamPage />} />
          <Route path="/teams/:teamId/lineup/:raceId" element={<LineupPage />} />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/leagues/create" element={<CreateLeaguePage />} />
          <Route path="/leagues/:leagueId" element={<LeagueDetailPage />} />
          <Route path="/leagues/:leagueId/create-team" element={<CreateTeamPage />} />
          <Route path="/riders" element={<RidersPage />} />
          <Route path="/riders/:riderId" element={<RiderDetailPage />} />
          <Route path="/calendar" element={<RaceCalendarPage />} />
          <Route path="/races/:raceId" element={<RaceDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {user && user.isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
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