// src/pages/RaceDetailPage.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getRaceById } from '../services/api';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
} from '@mui/material';

interface RaceResult {
  rider: { name: string; number: number; team: string };
  position: number;
  status: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function RaceDetailPage() {
  const { raceId } = useParams<{ raceId: string }>();
  const [tabValue, setTabValue] = useState(0);

  const { data: raceData, isLoading, error } = useQuery({
    queryKey: ['raceDetails', raceId],
    queryFn: () => getRaceById(raceId!),
    enabled: !!raceId,
  });

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Errore nel caricamento della gara.</Alert>;
  }

  const race = raceData?.race;
  const resultsByCategory = race?.results.reduce((acc: any, result: any) => {
    const category = result.rider.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(result);
    return acc;
  }, {});

  return (
    <Box>
      <Typography variant="h4">{race.name}</Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>{race.circuit}, {race.country}</Typography>

      <Paper>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)} centered>
          {Object.keys(resultsByCategory).map(category => (
            <Tab label={category} key={category} />
          ))}
        </Tabs>

        {Object.entries(resultsByCategory).map(([category, results], index) => (
          <TabPanel value={tabValue} index={index} key={category}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Pos.</TableCell>
                    <TableCell>Pilota</TableCell>
                    <TableCell>Team</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(results as RaceResult[]).map((result, pos) => (
                    <TableRow key={pos}>
                      <TableCell>{result.position || result.status}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 32, height: 32, mr: 2, fontSize: '1rem' }}>{result.rider.number}</Avatar>
                          {result.rider.name}
                        </Box>
                      </TableCell>
                      <TableCell>{result.rider.team}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        ))}
      </Paper>
    </Box>
  );
}