// webapp/src/theme/index.ts
import { createTheme, responsiveFontSizes } from '@mui/material/styles';

// Palette di colori ispirata al motorsport
const palette = {
  primary: {
    main: '#E60023', // Un rosso vibrante e deciso
    light: '#FF4C4C',
    dark: '#A8001A',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#FF6B00', // L'arancione che già usavi, come colore secondario
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#121212', // Sfondo scuro per un look premium
    paper: '#1E1E1E',   // Sfondo per le card, leggermente più chiaro
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#BDBDBD',
    disabled: '#757575'
  },
  error: {
    main: '#D32F2F',
  },
  success: {
    main: '#388E3C',
  },
  warning: {
    main: '#F57C00',
  },
  divider: 'rgba(255, 255, 255, 0.12)',
};

let theme = createTheme({
  palette,
  typography: {
    fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-1.5px' },
    h2: { fontWeight: 700, letterSpacing: '-0.5px' },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: {
        fontWeight: 500,
        color: palette.text.secondary,
    },
    button: {
      textTransform: 'none',
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
        styleOverrides: `
            body {
                scrollbar-color: #6b6b6b #2b2b2b;
                &::-webkit-scrollbar, & *::-webkit-scrollbar {
                    background-color: #2b2b2b;
                    width: 8px;
                }
                &::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb {
                    background-color: #6b6b6b;
                    border-radius: 4px;
                }
            }
        `,
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: palette.background.paper,
          backgroundImage: 'none',
          boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          padding: '8px 20px',
        },
        containedPrimary: {
            '&:hover': {
                backgroundColor: '#C0001D',
            }
        }
      },
    },
     MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255,255,255,0.05)',
        }
      }
    },
    MuiToggleButton: {
        styleOverrides: {
            root: {
                color: palette.text.secondary,
                '&.Mui-selected': {
                    color: palette.primary.main,
                    backgroundColor: 'rgba(230, 0, 35, 0.2)',
                    fontWeight: 'bold'
                }
            }
        }
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                backgroundImage: 'none',
            }
        }
    }
  },
});

theme = responsiveFontSizes(theme);

export { theme };