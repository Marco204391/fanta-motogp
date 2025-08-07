// webapp/src/components/AchievementsSystem.tsx
import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Avatar,
  Stack,
  Tooltip,
  Badge,
  Alert
} from '@mui/material';
import {
  EmojiEvents,
  Star,
  LocalFireDepartment,
  Speed,
  Psychology,
  Rocket,
} from '@mui/icons-material';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: any;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const achievements: Achievement[] = [
  {
    id: '1',
    name: 'Prima Vittoria',
    description: 'Vinci la tua prima gara',
    icon: EmojiEvents,
    progress: 1,
    maxProgress: 1,
    unlocked: true,
    unlockedAt: new Date('2024-03-15'),
    rarity: 'common',
  },
  {
    id: '2',
    name: 'Streak Master',
    description: 'Vinci 5 gare consecutive',
    icon: LocalFireDepartment,
    progress: 3,
    maxProgress: 5,
    unlocked: false,
    rarity: 'epic',
  },
  {
    id: '3',
    name: 'Speed Demon',
    description: 'Totalizza 500 punti in una singola gara',
    icon: Speed,
    progress: 420,
    maxProgress: 500,
    unlocked: false,
    rarity: 'rare',
  },
  {
    id: '4',
    name: 'Stratega',
    description: 'Schiera la formazione perfetta 10 volte',
    icon: Psychology,
    progress: 7,
    maxProgress: 10,
    unlocked: false,
    rarity: 'rare',
  },
  {
    id: '5',
    name: 'Leggenda',
    description: 'Vinci 3 campionati',
    icon: Star,
    progress: 1,
    maxProgress: 3,
    unlocked: false,
    rarity: 'legendary',
  },
];

const rarityColors = {
  common: '#9E9E9E',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF9800',
};

export default function AchievementsSystem() {
  const getAchievementOpacity = (unlocked: boolean) => unlocked ? 1 : 0.4;

  return (
    <Box>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Achievements
      </Typography>
      
      <Grid container spacing={3}>
        {achievements.map((achievement) => {
          const Icon = achievement.icon;
          const progress = (achievement.progress / achievement.maxProgress) * 100;
          
          return (
            <Grid item xs={12} sm={6} md={4} key={achievement.id}>
              <Badge
                invisible={!achievement.unlocked}
                badgeContent="✓"
                color="success"
                sx={{
                  width: '100%',
                  '& .MuiBadge-badge': {
                    right: 20,
                    top: 20,
                    fontSize: '1.2rem',
                  },
                }}
              >
                <Card
                  sx={{
                    opacity: getAchievementOpacity(achievement.unlocked),
                    border: '2px solid',
                    borderColor: achievement.unlocked ? rarityColors[achievement.rarity] : 'transparent',
                    position: 'relative',
                    overflow: 'visible',
                  }}
                >
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                      <Avatar
                        sx={{
                          bgcolor: rarityColors[achievement.rarity],
                          width: 56,
                          height: 56,
                        }}
                      >
                        <Icon sx={{ fontSize: 30 }} />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {achievement.name}
                        </Typography>
                        <Chip
                          label={achievement.rarity}
                          size="small"
                          sx={{
                            bgcolor: rarityColors[achievement.rarity],
                            color: 'white',
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>
                    </Stack>
                    
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {achievement.description}
                    </Typography>
                    
                    {!achievement.unlocked && (
                      <>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'grey.300',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: rarityColors[achievement.rarity],
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                          {achievement.progress} / {achievement.maxProgress}
                        </Typography>
                      </>
                    )}
                    
                    {achievement.unlocked && achievement.unlockedAt && (
                      <Typography variant="caption" color="success.main">
                        Sbloccato il {achievement.unlockedAt.toLocaleDateString()}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Badge>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

// SystemSettings component for admin panel
function SystemSettings() {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Impostazioni Sistema
      </Typography>
      <Alert severity="info">
        Sezione in sviluppo - Qui potrai configurare le impostazioni globali del sistema
      </Alert>
    </Box>
  );
}

// LeagueAdminPanel component
function LeagueAdminPanel() {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Gestione Leghe
      </Typography>
      <Alert severity="info">
        Sezione in sviluppo - Qui potrai gestire tutte le leghe del sistema
      </Alert>
    </Box>
  );
}

// RiderSyncManager component  
function RiderSyncManager() {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Sincronizzazione Piloti
      </Typography>
      <Alert severity="info">
        Sezione in sviluppo - Qui potrai sincronizzare i dati dei piloti
      </Alert>
    </Box>
  );
}