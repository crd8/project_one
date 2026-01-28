import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import api, { setAuthToken } from '@/services/api';
import { jwtDecode } from 'jwt-decode';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullname: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  is_2fa_enabled: boolean;
}

interface JwtPayload {
  sub: string;
  exp: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (user: UserProfile, token: string) => void;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
  getAccessTokenExpiresAt: () => number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getAccessToken = useCallback(() => accessToken, [accessToken]);

  const getAccessTokenExpiresAt = useCallback(() => {
    if (!accessToken) return null;
    try {
      const decodedToken: JwtPayload = jwtDecode(accessToken);
      return decodedToken.exp * 1000;
    } catch {
      return null;
    }
  }, [accessToken]);

  const login = useCallback((loggedInUser: UserProfile, token: string | null) => {
    setUser(loggedInUser);
    if (token) {
      setAccessToken(token);
      setAuthToken(token);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
    setAuthToken(null);
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API call failed', error);
    }
  }, []);

  useEffect(() => {
    const handleLogoutEvent = () => {
      logout();
    };
    window.addEventListener('logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('logout', handleLogoutEvent);
    };
  }, [logout]);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        const newAccessToken = data.access_token;
        
        setAccessToken(newAccessToken);
        setAuthToken(newAccessToken);
        
        const response = await api.get('/users/me');
        setUser(response.data);
      } catch (error) {
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, getAccessToken, getAccessTokenExpiresAt }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};