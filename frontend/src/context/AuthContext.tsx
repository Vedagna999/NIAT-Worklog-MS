import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserBrief } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserBrief | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchDemoUser: (email: string, pass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_USERS = [
  { label: 'Admin (Rajesh)', email: 'admin@niat.edu', pass: 'admin123', role: 'ADMIN' },
  { label: 'Manager (Kushal Kumar)', email: 'kushal@niat.edu', pass: 'password123', role: 'MANAGER' },
  { label: 'Mentor (Vedagna)', email: 'vedagna@niat.edu', pass: 'password123', role: 'MENTOR' },
  { label: 'Mentor (Tharun)', email: 'tharun@niat.edu', pass: 'password123', role: 'MENTOR' },
  { label: 'Mentor (Bhargav)', email: 'bhargav@niat.edu', pass: 'password123', role: 'MENTOR' },
  { label: 'Mentor (Rahul)', email: 'rahul@niat.edu', pass: 'password123', role: 'MENTOR' },
  { label: 'Manager 1 (Vikram)', email: 'manager1@niat.edu', pass: 'manager123', role: 'MANAGER' },
  { label: 'Manager 2 (Priya)', email: 'manager2@niat.edu', pass: 'manager123', role: 'MANAGER' },
  { label: 'Mentor 1 (Aarav)', email: 'mentor1@niat.edu', pass: 'mentor123', role: 'MENTOR' },
  { label: 'Mentor 2 (Ananya)', email: 'mentor2@niat.edu', pass: 'mentor123', role: 'MENTOR' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserBrief | null>(() => {
    const saved = localStorage.getItem('niat_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('niat_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const me = await api.getMe();
          setUser(me);
          localStorage.setItem('niat_user', JSON.stringify(me));
        } catch (err) {
          console.warn('Session expired, clearing authentication', err);
          logout();
        }
      }
      setIsLoading(false);
    }
    checkAuth();
  }, [token]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const resp = await api.login(email, pass);
      localStorage.setItem('niat_token', resp.access_token);
      localStorage.setItem('niat_user', JSON.stringify(resp.user));
      setToken(resp.access_token);
      setUser(resp.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('niat_token');
    localStorage.removeItem('niat_user');
    setToken(null);
    setUser(null);
  };

  const switchDemoUser = async (email: string, pass: string) => {
    await login(email, pass);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, switchDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
