// ============================================
// REUSA - Auth Store (Zustand)
// ============================================

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { User } from '@/types';
import { STORAGE_KEYS } from '@/constants';

// Secure Storage adapter for Zustand (with web fallback)
import { Platform } from 'react-native';

const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(name);
    }
    return await SecureStore.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(name, value);
      return;
    }
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(name);
      return;
    }
    await SecureStore.deleteItemAsync(name);
  },
};

interface AuthState {
  // State
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnboardingComplete: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setTokens: (token: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  reset: () => void;
}

// DEV MODE: Skip authentication for testing
const DEV_SKIP_AUTH = false;

const mockUser: User = {
  id: 'dev-user-123',
  email: 'dev@reusa.app',
  username: 'devuser',
  displayName: 'Usuario Demo',
  avatarUrl: undefined,
  city: 'Buenos Aires',
  country: 'Argentina',
  createdAt: new Date().toISOString(),
};

const initialState = {
  user: DEV_SKIP_AUTH ? mockUser : null,
  token: DEV_SKIP_AUTH ? 'dev-token' : null,
  refreshToken: DEV_SKIP_AUTH ? 'dev-refresh-token' : null,
  isAuthenticated: DEV_SKIP_AUTH,
  isLoading: false,
  isOnboardingComplete: DEV_SKIP_AUTH,
};

export const useAuthStore = create<AuthState>()(
  persist<AuthState>(
    (set, get) => ({
      ...initialState,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setTokens: (token, refreshToken) =>
        set({
          token,
          refreshToken,
          isAuthenticated: true,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setOnboardingComplete: (isOnboardingComplete) =>
        set({ isOnboardingComplete }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        isOnboardingComplete: state.isOnboardingComplete,
        isLoading: false,
        setUser: state.setUser,
        setTokens: state.setTokens,
        setLoading: state.setLoading,
        setOnboardingComplete: state.setOnboardingComplete,
        updateUser: state.updateUser,
        logout: state.logout,
        reset: state.reset,
      }),
      // In DEV mode, always use initial state (skip persisted auth)
      merge: (persistedState, currentState) => {
        if (DEV_SKIP_AUTH) {
          return { ...currentState, ...initialState };
        }
        return { ...currentState, ...(persistedState as Partial<AuthState>) };
      },
    }
  )
);

// Selectors
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
