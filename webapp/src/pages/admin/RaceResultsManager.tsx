import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Upload,
  Download,
  CheckCircle,
  Pending,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface RaceResult {
  riderId: string;
  riderName: string;
  position: number;
  points: number;
  qualifyingPosition?: number;
}

interface Race {
  id: string;
  name: string;
  date: string;
  hasResults: boolean;
  status: 'upcoming' | 'completed' | 'in_progress';
}

export default function RaceResultsManager() {
  const queryClient = useQueryClient();
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [results, setResults] = useState<RaceResult[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const { data: races, isLoading } = useQuery({
    queryKey: ['admin-races'],
    queryFn: async () => {
      // Chiamata API per ottenere le gare
      const response = await fetch('/api/races');
      return response.json();
    },
  });

  const saveResultsMutation = useMutation({
    mutationFn: async (data: { raceId: string; results: RaceResult[] }) => {
      const response = await fetch('/api/admin/race-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-races'] });
      setEditMode(false);
      // Notifica successo
    },
  });

  const handleEditResults = (race: Race) => {
    setSelectedRace(race);
    setEditMode(true);
    // Carica risultati esistenti se presenti
  };

  const handleSaveResults = () => {
    if (selectedRace) {
      saveResultsMutation.mutate({
        raceId: selectedRace.id,
        results,
      });
    }
  };

  const handleImportCSV = async (file: File) => {
    // Logica per importare CSV
    const text = await file.text();
    // Parse CSV e popola results
    setImportDialogOpen(false);
  };

  const exportTemplate = () => {
    // Genera e scarica template CSV
    const csvContent = "data:text/csv;charset=utf-8,Position,RiderName,RiderId,Points,QualifyingPosition\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "race_results_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Gestione Risultati Gare</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={exportTemplate}
          >
            Scarica Template
          </Button>
          <Button
            variant="contained"
            startIcon={<Upload />}
            onClick={() => setImportDialogOpen(true)}
          >
            Importa CSV
          </Button>
        </Stack>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Gara</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Stato</TableCell>
              <TableCell>Risultati</TableCell>
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {races?.map((race: Race) => (
              <TableRow key={race.id}>
                <TableCell>
                  <Typography fontWeight="bold">{race.name}</Typography>
                </TableCell>
                <TableCell>
                  {format(new Date(race.date), 'dd MMM yyyy', { locale: it })}
                </TableCell>
                <TableCell>
                  <Chip
                    label={race.status}
                    color={race.status === 'completed' ? 'success' : 'default'}
                    size="small"
                    icon={race.status === 'completed' ? <CheckCircle /> : <Pending />}
                  />
                </TableCell>
                <TableCell>
                  {race.hasResults ? (
                    <Chip label="Inseriti" color="success" size="small" />
                  ) : (
                    <Chip label="Mancanti" color="warning" size="small" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    color="primary"
                    onClick={() => handleEditResults(race)}
                  >
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog per importazione CSV */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)}>
        <DialogTitle>Importa Risultati da CSV</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Il file CSV deve contenere le colonne: Position, RiderName, RiderId, Points, QualifyingPosition
          </Alert>
          <Button variant="contained" component="label" fullWidth>
            Seleziona File CSV
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={(e) => e.target.files && handleImportCSV(e.target.files[0])}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Annulla</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
