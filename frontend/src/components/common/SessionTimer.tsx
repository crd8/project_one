import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

const SessionTimer: React.FC = () => {
  const { getAccessTokenExpiresAt, logout } = useAuth();
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const expiresAt = getAccessTokenExpiresAt();

    if (!expiresAt) {
      setTimeLeft('');
      return;
    }

    const interval = setInterval(() => {
      const remaining = expiresAt - Date.now();

      if (remaining <= 1000) {
        clearInterval(interval);
        setTimeLeft('Refreshing...');
      } else {
        const minutes = Math.floor((remaining / 1000) / 60);
        const seconds = Math.floor((remaining / 1000) % 60);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [getAccessTokenExpiresAt, logout]);

  if (!timeLeft) {
    return null;
  }

  return (
    <div className="text-sm text-neutral-600">
      Session timeout: {timeLeft}
    </div>
  );
};

export default SessionTimer;