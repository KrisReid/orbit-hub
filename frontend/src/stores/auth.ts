import { create } from 'zustand';
import { api } from '@/api/client';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  checkAuth: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    await api.login({ email, password });
    const user = await api.getCurrentUser();
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    api.logout();
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    if (!api.isAuthenticated()) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    
    try {
      const user = await api.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      api.logout();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkAuth: () => {
    return get().isAuthenticated;
  },
}));
