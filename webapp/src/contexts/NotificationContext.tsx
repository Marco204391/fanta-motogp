import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';

interface Notification {
  id: string;
  message: string;
  severity: AlertColor;
  duration?: number;
}

interface NotificationContextType {
  notify: (message: string, severity?: AlertColor, duration?: number) => void;
  notifications: Notification[];
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (message: string, severity: AlertColor = 'info', duration: number = 5000) => {
    const id = Date.now().toString();
    const notification: Notification = { id, message, severity, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    if (duration > 0) {
      setTimeout(() => {
        clearNotification(id);
      }, duration);
    }
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify, notifications, clearNotification }}>
      {children}
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration}
          onClose={() => clearNotification(notification.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          TransitionComponent={SlideTransition}
          sx={{ bottom: { xs: 90 + (index * 70), sm: 24 + (index * 70) } }}
        >
          <Alert 
            onClose={() => clearNotification(notification.id)} 
            severity={notification.severity}
            sx={{ 
              width: '100%',
              boxShadow: 3,
              '& .MuiAlert-icon': {
                fontSize: '1.5rem'
              }
            }}
            elevation={6}
            variant="filled"
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};