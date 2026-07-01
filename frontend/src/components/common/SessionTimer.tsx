import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { Loader2, Clock } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SessionTimer: React.FC = () => {
  const { getAccessTokenExpiresAt, login, user } = useAuth();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshSession = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const { data } = await api.post('/auth/refresh');
      
      if (user) {
        login(user, data.access_token);
        toast.success("Sesi diperpanjang otomatis");
      }
    } catch (error) {
      console.error("Gagal refresh token:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, login, user]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expiresAt = getAccessTokenExpiresAt();
      if (!expiresAt) return null;

      const now = Date.now();
      const remaining = expiresAt - now;

      if (remaining <= 0) {
        refreshSession();
        return 0;
      }

      return remaining;
    };

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(interval);
  }, [getAccessTokenExpiresAt, refreshSession]);

  const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (timeLeft === null) return null;

  const isCritical = timeLeft < 60 * 1000;
  const isWarning = timeLeft < 5 * 60 * 1000;

  return (
    <div className="flex items-center">
        <Badge 
            variant="outline" 
            className={cn(
                "transition-colors duration-500 font-mono flex items-center gap-2",
                isRefreshing ? "bg-background text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900" :
                isCritical ? "bg-background text-red-600 dark:text-red-200 border-red-200 dark:border-red-700 animate-pulse" :
                isWarning ? "bg-background text-yellow-700 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700" :
                "bg-background text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700"
            )}
        >
            {isRefreshing ? (
                <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Refreshing...
                </>
            ) : (
                <>
                    <Clock className="w-3 h-3" />
                    {formatTime(timeLeft)}
                </>
            )}
        </Badge>
    </div>
  );
};

export default SessionTimer;