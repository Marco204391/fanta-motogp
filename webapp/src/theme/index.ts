import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const palette = {
  primary: {
    main: '#E60023',
    light: '#FF4C4C', 
    dark: '#A8001A',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#FF6B00',
    light: '#FF8F40',
    dark: '#CC5500',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#0A0A0A',
    paper: '#141414',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#B8B8B8',
    disabled: '#666666'
  },
  error: {
    main: '#F44336',
    light: '#FF6659',
    dark: '#BA000D',
  },
  success: {
    main: '#4CAF50',
    light: '#80E27E',
    dark: '#087F23',
  },
  warning: {
    main: '#FF9800',
    light: '#FFB74D',
    dark: '#F57C00',
  },
  info: {
    main: '#2196F3',
    light: '#64B5F6',
    dark: '#1976D2',
  },
  divider: 'rgba(255, 255, 255, 0.08)',
  action: {
    hover: 'rgba(255, 255, 255, 0.08)',
    selected: 'rgba(255, 255, 255, 0.16)',
  }
};

let theme = createTheme({
  palette,
  typography: {
    fontFamily: '"Exo 2", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { 
      fontWeight: 800, 
      letterSpacing: '-2px',
      background: 'linear-gradient(45deg, #E60023 30%, #FF6B00 90%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    },
    h2: { fontWeight: 700, letterSpacing: '-1px' },
    h3: { fontWeight: 700, letterSpacing: '-0.5px' },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: {
      fontWeight: 500,
      color: palette.text.secondary,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      letterSpacing: '0.5px',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        body {
          scrollbar-color: #666 #1a1a1a;
          background: #0A0A0A;
          &::-webkit-scrollbar, & *::-webkit-scrollbar {
            background-color: #1a1a1a;
            width: 10px;
          }
          &::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb {
            background-color: #666;
            border-radius: 5px;
            &:hover {
              background-color: #888;
            }
          }
        }
        
        .fade-in {
          animation: fadeIn 0.6s ease-out;
        }
        
        .pulse {
          animation: pulse 2s infinite;
        }
      `,
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(10px)',
          backgroundImage: 'none',
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.5)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: palette.background.paper,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 20px -10px rgba(230, 0, 35, 0.3)',
            borderColor: 'rgba(230, 0, 35, 0.3)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          padding: '10px 24px',
          fontSize: '0.95rem',
          boxShadow: 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(230, 0, 35, 0.4)',
            transform: 'translateY(-2px)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #E60023 30%, #FF4C4C 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #A8001A 30%, #E60023 90%)',
          }
        },
        containedSecondary: {
          background: 'linear-gradient(45deg, #FF6B00 30%, #FF8F40 90%)',
          '&:hover': {
            background: 'linear-gradient(45deg, #CC5500 30%, #FF6B00 90%)',
          }
        }
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 600,
        },
        colorPrimary: {
          background: 'rgba(230, 0, 35, 0.15)',
          color: palette.primary.main,
          border: '1px solid rgba(230, 0, 35, 0.3)',
        },
        colorSecondary: {
          background: 'rgba(255, 107, 0, 0.15)',
          color: palette.secondary.main,
          border: '1px solid rgba(255, 107, 0, 0.3)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: palette.background.paper,
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        },
        elevation2: {
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        },
        elevation3: {
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        },
      }
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
        colorDefault: {
          backgroundColor: palette.primary.dark,
          color: palette.primary.contrastText,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        },
        head: {
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          fontWeight: 600,
          fontSize: '0.875rem',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
        },
        barColorPrimary: {
          borderRadius: 4,
          background: 'linear-gradient(90deg, #E60023 0%, #FF4C4C 100%)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.background.paper,
          backgroundImage: 'none',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        standardSuccess: {
          backgroundColor: 'rgba(76, 175, 80, 0.12)',
          color: palette.success.main,
        },
        standardError: {
          backgroundColor: 'rgba(244, 67, 54, 0.12)',
          color: palette.error.main,
        },
        standardWarning: {
          backgroundColor: 'rgba(255, 152, 0, 0.12)',
          color: palette.warning.main,
        },
        standardInfo: {
          backgroundColor: 'rgba(33, 150, 243, 0.12)',
          color: palette.info.main,
        },
      },
    },
  },
});

theme = responsiveFontSizes(theme);

export { theme };