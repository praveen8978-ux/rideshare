import { create } from 'zustand';
import api from '@/lib/api';

interface RideSearch {
  pickupLat: number;
  pickupLng: number;
  pickupName: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffName: string;
  date: string;
  seats: number;
}

interface RideStore {
  rides: any[];
  loading: boolean;
  searchParams: RideSearch | null;
  searchRides: (params: RideSearch) => Promise<void>;
  setSearchParams: (params: RideSearch) => void;
}

export const useRideStore = create<RideStore>((set) => ({
  rides: [],
  loading: false,
  searchParams: null,

  searchRides: async (params) => {
    set({ loading: true, searchParams: params });
    try {
      const { data } = await api.get('/rides/search', { params });
      set({ rides: data.rides });
    } finally {
      set({ loading: false });
    }
  },

  setSearchParams: (params) => set({ searchParams: params }),
}));