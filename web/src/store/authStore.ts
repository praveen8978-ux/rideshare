import { create } from 'zustand';
import { setTokens, clearTokens, setUser } from '@/lib/auth';
import api from '@/lib/api';

interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
  gender: string;
  avatarUrl?: string;
}

interface AuthStore {
  user: User | null;
  loading: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, otp: string, name?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: false,

  sendOtp: async (phone) => {
    set({ loading: true });
    try {
      await api.post('/auth/send-otp', { phone });
    } finally {
      set({ loading: false });
    }
  },

  verifyOtp: async (phone, otp, name) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp, name });
      setTokens(data.token, data.refreshToken);
      setUser(data.user);
      set({ user: data.user });
      return data.isNew;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    clearTokens();
    set({ user: null });
    window.location.href = '/login';
  },

  setUser: (user) => set({ user }),
}));