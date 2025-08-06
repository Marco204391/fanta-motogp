// webapp/src/pages/admin/AdminDashboard.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  Chip,
  Alert,
} from '@mui/material';
import {
  AdminPanelSettings,
  SportsScore,
  Sync,
  Group,
  EmojiEvents,
  Settings,
} from '@mui/icons-material';
import RaceResultsManager from './RaceResultsManager';
import RiderSyncManager from './RiderSyncManager';
import LeagueAdminPanel from './LeagueAdminPanel';
import { useAuth } from '../../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  // Verifica permessi admin
  if (!user?.isAdmin) {
    return (
      <Alert severity="error">
        Non hai i permessi per accedere a questa sezione.
      </Alert>
    );
  }

  const stats = [
    { label: 'Utenti Totali', value: 1234, icon: Group, color: 'primary' },
    { label: 'Leghe Attive', value: 56, icon: EmojiEvents, color: 'success' },
    { label: 'Gare Completate', value: 18, icon: SportsScore, color: 'info' },
    { label: 'Sincronizzazioni', value: 342, icon: Sync, color: 'warning' },
  ];

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <AdminPanelSettings sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Pannello Amministrazione
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestisci risultati, sincronizzazioni e impostazioni del sistema
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={3} mb={3}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={stat.label}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {stat.label}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {stat.value}
                      </Typography>
                    </Box>
                    <Icon sx={{ fontSize: 40, color: `${stat.color}.main`, opacity: 0.3 }} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Risultati Gare" icon={<SportsScore />} iconPosition="start" />
          <Tab label="Sincronizzazione Piloti" icon={<Sync />} iconPosition="start" />
          <Tab label="Gestione Leghe" icon={<EmojiEvents />} iconPosition="start" />
          <Tab label="Impostazioni" icon={<Settings />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tabValue} index={0}>
            <RaceResultsManager />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <RiderSyncManager />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <LeagueAdminPanel />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <SystemSettings />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}