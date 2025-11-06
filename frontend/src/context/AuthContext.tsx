import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { jwtDecode } from 'jwt-decode';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullname: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

interface JwtPayload {
  sub: string;
  exp: number;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  expiresAt: number | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const login = async (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    api.defaults.headers.Authorization = `Bearer ${newToken}`;
    try {
      const decodedToken: JwtPayload = jwtDecode(newToken);
      const expiresTimeStamp = decodedToken.exp * 1000;
      setExpiresAt(expiresTimeStamp);

      const response = await api.get('/users/me/');
      setUser(response.data);
    } catch (error) {
      console.error("Gagal mengambil data user setelah login", error);
      logout();
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setExpiresAt(null);
    delete api.defaults.headers.Authorization;
  };

  useEffect(() => {
    const checkUser = async () => {
      if (token) {
        api.defaults.headers.Authorization = `Bearer ${token}`;
        try {
          const decodedToken: JwtPayload = jwtDecode(token);
          const expiresTimeStamp = decodedToken.exp * 1000;

          if (expiresTimeStamp < Date.now()) {
            console.log("Token sudah kedaluwarsa saat memuat.");
          } else {
            setExpiresAt(expiresTimeStamp);
            api.defaults.headers.Authorization = `Bearer ${token}`;
            const response = await api.get('/users/me/');
            setUser(response.data);
          }
        } catch (error) {
          console.log("Token tidak valid atau kedaluwarsa, logout.");
          logout();
        }
      }
      setIsLoading(false);
    };
    checkUser();
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, expiresAt, login, logout }}>
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