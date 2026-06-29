import { create } from 'zustand';
import { clearTokens, setUser } from '@/lib/auth';
import api from '@/lib/api';

interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  role: string;
  gender: string;
  avatarUrl?: string;
}

interface AuthStore {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user:    null,
  loading: false,

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    clearTokens();
    set({ user: null });
    window.location.href = '/login';
  },

  setUser: (user) => set({ user }),
}));