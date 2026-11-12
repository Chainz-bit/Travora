import { useState, useEffect } from 'react';
import { authService, type LoginParams, type AuthResponse } from '../services/authService';
import type { UserProfile, UserRole } from '../../../types/index';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [isInitialized, setIsInitialized] = useState<boolean>(() => authService.isInitialized());

  useEffect(() => {
    // Pastikan inisialisasi sesi dieksekusi
    if (!authService.isInitialized()) {
      authService.initSession().then((recoveredUser) => {
        setUser(recoveredUser);
        setIsInitialized(true);
      });
    }

    const unsubscribe = authService.subscribe((updatedUser) => {
      setUser(updatedUser);
      setIsInitialized(authService.isInitialized());
    });

    return unsubscribe;
  }, []);

  return {
    user,
    role: user?.role || null,
    isAuthenticated: user !== null,
    isLoading: !isInitialized,
    login: (params: LoginParams): Promise<AuthResponse> => authService.login(params),
    logout: (): Promise<void> => authService.logout(),
    hasRole: (expectedRole: UserRole): boolean => user?.role === expectedRole,
  };
}

