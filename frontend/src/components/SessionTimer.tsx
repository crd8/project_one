import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const SessionTimer: React.FC = () => {
  const { expiresAt, logout } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft('');
      return;
    }

    const interval = setInterval(() => {
      const remaining = expiresAt - Date.now();

      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft('Sesi telah berakhir.');
        logout();
      } else {
        const minutes = Math.floor((remaining / 1000) / 60);
        const seconds = Math.floor((remaining / 1000) % 60);
        
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
    
  }, [expiresAt, logout]);

  if (!timeLeft) {
    return null;
  }

  return (
    <div style={{ padding: '0 10px', color: 'gray', fontSize: '0.9em' }}>
      Sesi berakhir dalam: {timeLeft}
    </div>
  );
};

export default SessionTimer;