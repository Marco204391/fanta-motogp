// webapp/src/App.tsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';

// Components & Pages
import { 
  AppBar, Box, Toolbar, IconButton, Typography, Drawer, List, 
  ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Avatar, Container, useMediaQuery, BottomNavigation, 
  BottomNavigationAction, Paper, Divider 
} from '@mui/material';
import {
  Menu as MenuIcon, Home, SportsMotorsports, Groups, 
  CalendarToday, Person, AdminPanelSettings, 
  ChevronLeft
} from '@mui/icons-material';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import TeamsPage from './pages/TeamsPage';
import LeaguesPage from './pages/LeaguesPage';
import RidersPage from './pages/RidersPage';
import RaceCalendarPage from './pages/RaceCalendarPage';
import ProfilePage from './pages/ProfilePage';
import EditTeamPage from './pages/EditTeamPage';
import LineupPage from './pages/LineupPage';
import CreateTeamPage from './pages/CreateTeamPage';
import CreateLeaguePage from './pages/CreateLeaguePage';
import LeagueDetailPage from './pages/LeagueDetailPage';
import RaceDetailPage from './pages/RaceDetailPage';
import RiderDetailPage from './pages/RiderDetailPage';
import AdminDashboard from './pages/admin/AdminDashboard';

const DRAWER_WIDTH = 240;

function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);

  // Gestione apertura drawer su mobile/desktop
  useEffect(() => {
    setDrawerOpen(!isMobile);
  }, [isMobile]);

  const toggleDrawer = () => setDrawerOpen(!drawerOpen);

  const menuItems = [
    { label: 'Dashboard', icon: <Home />, path: '/' },
    { label: 'I Miei Team', icon: <SportsMotorsports />, path: '/teams' },
    { label: 'Leghe', icon: <Groups />, path: '/leagues' },
    { label: 'Piloti', icon: <Person />, path: '/riders' },
    { label: 'Calendario', icon: <CalendarToday />, path: '/calendar' },
  ];

  if (user?.isAdmin) {
    menuItems.push({ label: 'Admin', icon: <AdminPanelSettings />, path: '/admin' });
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      
      {/* Desktop Sidebar (Drawer) */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          open={drawerOpen}
          sx={{
            width: drawerOpen ? DRAWER_WIDTH : 65,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
            '& .MuiDrawer-paper': {
              width: drawerOpen ? DRAWER_WIDTH : 65,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              overflowX: 'hidden',
              backgroundColor: theme.palette.background.paper, // Usa il colore dal tema
              borderRight: '1px solid rgba(255,255,255,0.08)',
            },
          }}
        >
          <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: drawerOpen ? 'space-between' : 'center', px: [1] }}>
            {drawerOpen && (
              <Typography variant="h6" color="primary" fontWeight="bold" sx={{ ml: 2, letterSpacing: 1, fontStyle: 'italic' }}>
                FANTA MGP
              </Typography>
            )}
            <IconButton onClick={toggleDrawer}>
              {drawerOpen ? <ChevronLeft /> : <MenuIcon />}
            </IconButton>
          </Toolbar>
          <Divider />
          <List component="nav" sx={{ mt: 1 }}>
            {menuItems.map((item) => (
              <ListItem key={item.label} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  sx={{
                    minHeight: 48,
                    justifyContent: drawerOpen ? 'initial' : 'center',
                    px: 2.5,
                    mb: 0.5,
                    bgcolor: location.pathname === item.path ? 'rgba(230, 0, 35, 0.08)' : 'transparent',
                    borderLeft: location.pathname === item.path ? '4px solid #E60023' : '4px solid transparent',
                    '&:hover': {
                       bgcolor: 'rgba(255, 255, 255, 0.05)',
                    }
                  }}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon sx={{ 
                    minWidth: 0, 
                    mr: drawerOpen ? 3 : 'auto', 
                    justifyContent: 'center', 
                    color: location.pathname === item.path ? 'primary.main' : 'text.secondary' 
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} sx={{ opacity: drawerOpen ? 1 : 0 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ mt: 'auto', p: 2 }}>
             <Divider sx={{ mb: 2 }} />
             <Box display="flex" alignItems="center" justifyContent={drawerOpen ? 'flex-start' : 'center'} gap={2}>
                <Avatar 
                  sx={{ bgcolor: 'secondary.main', cursor: 'pointer', width: 32, height: 32, fontSize: 14 }} 
                  onClick={() => navigate('/profile')}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </Avatar>
                {drawerOpen && (
                  <Box overflow="hidden">
                    <Typography variant="body2" noWrap fontWeight="bold">{user?.username}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ cursor: 'pointer', '&:hover': { color: 'error.main' } }} onClick={logout}>
                      Logout
                    </Typography>
                  </Box>
                )}
             </Box>
          </Box>
        </Drawer>
      )}

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, pb: { xs: 10, md: 4 }, width: '100%', overflowX: 'hidden' }}>
        {/* Mobile Header */}
        {isMobile && (
          <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.default', mb: 2, top: 0, zIndex: 1100 }}>
            <Toolbar>
               <Typography variant="h6" color="primary" sx={{ flexGrow: 1, fontWeight: 800, fontStyle: 'italic' }}>
                 FANTA MGP
               </Typography>
               <IconButton onClick={() => navigate('/profile')}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: 14 }}>
                    {user?.username?.charAt(0).toUpperCase()}
                  </Avatar>
               </IconButton>
            </Toolbar>
          </AppBar>
        )}
        <Outlet />
      </Box>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }} elevation={3}>
          <BottomNavigation
            showLabels={false}
            value={location.pathname}
            onChange={(_, newValue) => navigate(newValue)}
            sx={{ 
              bgcolor: 'background.paper', 
              height: 65,
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <BottomNavigationAction label="Home" value="/" icon={<Home />} />
            <BottomNavigationAction label="Team" value="/teams" icon={<SportsMotorsports />} />
            <BottomNavigationAction label="Leghe" value="/leagues" icon={<Groups />} />
            <BottomNavigationAction label="Gare" value="/calendar" icon={<CalendarToday />} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}

function AuthLayout() {
    return <Container component="main" maxWidth="xs" sx={{mt: 8}}><Outlet /></Container>;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <NotificationProvider>
          <Routes>
              {/* Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              
              {/* Main Routes */}
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
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>
              <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;