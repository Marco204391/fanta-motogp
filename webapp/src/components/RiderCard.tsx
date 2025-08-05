// webapp/src/components/RiderCard.tsx
import React from 'react';
import { Card, CardActionArea, CardMedia, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface Rider {
  id: string;
  name: string;
  number: number;
  team: string;
  category: 'MOTOGP' | 'MOTO2' | 'MOTO3';
  nationality: string;
  value: number;
  photoUrl?: string | null;
}

const categoryColors = {
  MOTOGP: '#E60023',
  MOTO2: '#FF6B00',
  MOTO3: '#1976D2',
};

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
}

export function RiderCard({ rider }: { rider: Rider }) {
  const navigate = useNavigate();

  return (
    <Card sx={{ 
        position: 'relative', 
        borderRadius: 2, 
        overflow: 'hidden',
        transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
        '&:hover': {
            transform: 'scale(1.03)',
            boxShadow: (theme) => `0 10px 20px -5px ${theme.palette.primary.main}55`,
        }
    }}>
      <CardActionArea onClick={() => navigate(`/riders/${rider.id}`)}>
        <CardMedia
          component="img"
          image={rider.photoUrl || `https://via.placeholder.com/400x500/1E1E1E/FFFFFF?text=${getInitials(rider.name)}`}
          alt={rider.name}
          sx={{
            height: 320, // <-- RIDOTTA ALTEZZA
            objectFit: 'cover', // <-- AGGIUNTO PER EVITARE DISTORSIONI
            objectPosition: 'center top', // Mette a fuoco la parte alta dell'immagine (viso)
            filter: 'brightness(0.85)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            color: 'white',
            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 25%, transparent 100%)', // Gradiente più forte
            padding: '24px 16px 8px 16px',
          }}
        >
          {/* Tipografia ridimensionata */}
          <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
            #{rider.number}
          </Typography>
           <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', textTransform: 'uppercase', lineHeight: 1.3 }}>
            {rider.name}
          </Typography>
        </Box>
        <Box sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '5px',
            backgroundColor: categoryColors[rider.category],
        }}/>
      </CardActionArea>
    </Card>
  );
}