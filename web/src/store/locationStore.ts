import { create } from 'zustand';

interface LocationStore {
  driverLat: number | null;
  driverLng: number | null;
  driverHeading: number | null;
  updateDriverLocation: (lat: number, lng: number, heading?: number) => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  driverLat: null,
  driverLng: null,
  driverHeading: null,
  updateDriverLocation: (lat, lng, heading) =>
    set({ driverLat: lat, driverLng: lng, driverHeading: heading ?? null }),
}));