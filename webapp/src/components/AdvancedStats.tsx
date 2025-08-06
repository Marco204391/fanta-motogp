// webapp/src/components/AdvancedStats.tsx

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  LinearProgress,
  Stack,
  Chip,
  Avatar,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Remove,
  EmojiEvents,
  Speed,
  Timer,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface StatsData {
  teamPerformance: any[];
  riderStats: any[];
  categoryDistribution: any[];
  trendData: any[];
}

export default function AdvancedStats({ data }: { data: StatsData }) {
  const theme = useTheme();

  const COLORS = ['#FF6B00', '#1976D2', '#388E3C', '#FFC107', '#9C27B0'];

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp sx={{ color: 'success.main' }} />;
    if (trend < 0) return <TrendingDown sx={{ color: 'error.main' }} />;
    return <Remove sx={{ color: 'text.secondary' }} />;
  };

  return (
    <Grid container spacing={3}>
      {/* Grafico Performance Team */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Performance Team nel Tempo
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="race" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="points"
                stroke={theme.palette.primary.main}
                strokeWidth={2}
                dot={{ fill: theme.palette.primary.main }}
              />
              <Line
                type="monotone"
                dataKey="average"
                stroke={theme.palette.grey[400]}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Distribuzione Punti per Categoria */}
      <Grid item xs={12} md={4}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Distribuzione Punti
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.categoryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Top Performers */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Top Performers
          </Typography>
          <Stack spacing={2}>
            {data.riderStats.slice(0, 5).map((rider, index) => (
              <Box
                key={rider.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1.5,
                  borderRadius: 1,
                  backgroundColor: index === 0 ? 'warning.light' : 'grey.100',
                }}
              >
                <Avatar sx={{ mr: 2, bgcolor: `primary.${index === 0 ? 'dark' : 'main'}` }}>
                  {index + 1}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography fontWeight="bold">{rider.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {rider.team}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6" fontWeight="bold">
                    {rider.totalPoints}
                  </Typography>
                  <Typography variant="caption">pts</Typography>
                  {getTrendIcon(rider.trend)}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Grid>

      {/* Radar Chart Performance */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Analisi Performance Multidimensionale
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={[
              { subject: 'Costanza', A: 85, fullMark: 100 },
              { subject: 'Picchi', A: 92, fullMark: 100 },
              { subject: 'Media', A: 78, fullMark: 100 },
              { subject: 'Strategia', A: 88, fullMark: 100 },
              { subject: 'Fortuna', A: 65, fullMark: 100 },
            ]}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Performance"
                dataKey="A"
                stroke={theme.palette.primary.main}
                fill={theme.palette.primary.main}
                fillOpacity={0.6}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Statistiche Rapide */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          {[
            { label: 'Media Punti', value: 87.5, icon: Speed, change: +5.2 },
            { label: 'Posizione Media', value: 3.2, icon: EmojiEvents, change: -0.8 },
            { label: 'Gare Vinte', value: 4, icon: TrendingUp, change: +2 },
            { label: 'Tempo Reazione', value: '2.3s', icon: Timer, change: -0.5 },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Grid item xs={12} sm={6} md={3} key={stat.label}>
                <Paper sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {stat.label}
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {stat.value}
                      </Typography>
                      <Chip
                        label={`${stat.change > 0 ? '+' : ''}${stat.change}`}
                        size="small"
                        color={stat.change > 0 ? 'success' : 'error'}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    <Icon sx={{ fontSize: 40, opacity: 0.3 }} />
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Grid>
    </Grid>
  );
}
