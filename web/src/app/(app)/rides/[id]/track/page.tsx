'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Clock, Phone, MessageCircle, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { useLocationStore } from '@/store/locationStore';
import { connectSocket } from '@/lib/socket';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import toast from 'react-hot-toast';

declare global { interface Window { google: any; } }

interface Booking {
  id: string; status: string;
  pickup_name: string; dropoff_name: string;
  pickup_lat: number; pickup_lng: number;
  dropoff_lat: number; dropoff_lng: number;
  fare_total: number; otp?: string;
}

interface Ride {
  id: string; origin_name: string; dest_name: string;
  departure_time: string; status: string;
  driver_name: string; driver_phone?: string; avatar_url?: string;
  driver_rating: number; make: string; model: string;
  color: string; plate_number: string;
}

export default function LiveTrackingPage() {
  const router  = useRouter();
  const { id }  = useParams();
  const user    = getUser();

  const mapRef       = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markerRef    = useRef<any>(null);
  const polylineRef  = useRef<any>(null);

  const [ride,         setRide]         = useState<Ride | null>(null);
  const [booking,      setBooking]      = useState<Booking | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [mapsReady,    setMapsReady]    = useState(false);
  const [driverOnline, setDriverOnline] = useState(false);
  const [eta,          setEta]          = useState<string | null>(null);

  const { driverLat, driverLng, updateDriverLocation } = useLocationStore();

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    loadRideData();
  }, [id]);

  useEffect(() => {
    if (driverLat && driverLng && mapsReady && googleMapRef.current) {
      updateDriverMarker(driverLat, driverLng);
    }
  }, [driverLat, driverLng, mapsReady]);

  const loadRideData = async () => {
    try {
      const { data } = await api.get(`/rides/${id}`);
      setRide(data.ride);

      const myBooking = data.bookings?.find(
        (b: any) => b.passenger_id === user?.id && b.status === 'accepted'
      ) || null;
      setBooking(myBooking);

      await loadGoogleMaps();
      setTimeout(() => {
        initMap(data.ride, myBooking);
        setMapsReady(true);
      }, 200);

      if (data.ride.status === 'active') connectToSocket(data.ride.id);
    } catch (e) {
      console.error('Load failed:', e);
      toast.error('Failed to load ride');
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleMaps = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google?.maps) { resolve(); return; }

      const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
      if (!key) {
        toast.error('Google Maps key missing in .env.local');
        reject(new Error('No API key'));
        return;
      }

      // Check if script already added
      const existing = document.querySelector('script[src*="maps.googleapis"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        return;
      }

      const script   = document.createElement('script');
      script.src     = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry,places`;
      script.async   = true;
      script.defer   = true;
      script.onload  = () => { console.log('Google Maps loaded ✅'); resolve(); };
      script.onerror = () => { toast.error('Google Maps failed to load'); reject(); };
      document.head.appendChild(script);
    });
  };

  const initMap = (rideData: Ride, bookingData: Booking | null) => {
    if (!mapRef.current) { console.error('Map ref not ready'); return; }
    if (!window.google?.maps) { console.error('Google Maps not ready'); return; }

    console.log('Initializing map...', mapRef.current.offsetHeight);

    const center = { lat: 17.3850, lng: 78.4867 };

    googleMapRef.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 11,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f0f0f0' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d1e8ff' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f8f8f8' }] },
      ],
    });

    console.log('Map created ✅');

    if (bookingData) {
      // Pickup marker — violet
      new window.google.maps.Marker({
        position: { lat: bookingData.pickup_lat, lng: bookingData.pickup_lng },
        map: googleMapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#7C5CFF',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'Your pickup',
        zIndex: 10,
      });

      // Dropoff marker — gold
      new window.google.maps.Marker({
        position: { lat: bookingData.dropoff_lat, lng: bookingData.dropoff_lng },
        map: googleMapRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#E0AD4F',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        title: 'Your dropoff',
        zIndex: 10,
      });

      // Fit map to show both markers
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend({ lat: bookingData.pickup_lat, lng: bookingData.pickup_lng });
      bounds.extend({ lat: bookingData.dropoff_lat, lng: bookingData.dropoff_lng });
      googleMapRef.current.fitBounds(bounds, 80);
    }
  };

  const updateDriverMarker = (lat: number, lng: number) => {
    if (!googleMapRef.current || !window.google) return;

    if (!markerRef.current) {
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: googleMapRef.current,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
              <circle cx="22" cy="22" r="20" fill="#0F0B1F" stroke="white" stroke-width="3"/>
              <text x="22" y="29" text-anchor="middle" font-size="20">🚗</text>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(44, 44),
          anchor:     new window.google.maps.Point(22, 22),
        },
        title:  'Driver',
        zIndex: 999,
      });

      // Dashed line from driver to pickup
      if (booking) {
        polylineRef.current = new window.google.maps.Polyline({
          path: [
            { lat, lng },
            { lat: booking.pickup_lat, lng: booking.pickup_lng },
          ],
          map:            googleMapRef.current,
          strokeColor:    '#7C5CFF',
          strokeOpacity:  0,
          strokeWeight:   3,
          icons: [{
            icon:   { path: 'M 0,-1 0,1', strokeOpacity: 0.6, scale: 3 },
            offset: '0',
            repeat: '12px',
          }],
        });
      }

      setDriverOnline(true);
      googleMapRef.current.panTo({ lat, lng });

      // Calculate ETA
      if (booking && window.google.maps.DistanceMatrixService) {
        const svc = new window.google.maps.DistanceMatrixService();
        svc.getDistanceMatrix({
          origins:      [{ lat, lng }],
          destinations: [{ lat: booking.pickup_lat, lng: booking.pickup_lng }],
          travelMode:   window.google.maps.TravelMode.DRIVING,
        }, (result: any, status: string) => {
          if (status === 'OK' && result.rows[0]?.elements[0]?.status === 'OK') {
            setEta(result.rows[0].elements[0].duration.text);
          }
        });
      }
    } else {
      animateMarker(markerRef.current, { lat, lng });
      if (polylineRef.current && booking) {
        polylineRef.current.setPath([
          { lat, lng },
          { lat: booking.pickup_lat, lng: booking.pickup_lng },
        ]);
      }
    }
  };

  const animateMarker = (marker: any, newPos: { lat: number; lng: number }) => {
    const frames   = 30;
    const startPos = marker.getPosition();
    const startLat = startPos.lat();
    const startLng = startPos.lng();
    const deltaLat = (newPos.lat - startLat) / frames;
    const deltaLng = (newPos.lng - startLng) / frames;
    let frame = 0;
    const go  = () => {
      frame++;
      marker.setPosition({ lat: startLat + deltaLat * frame, lng: startLng + deltaLng * frame });
      if (frame < frames) setTimeout(go, 16);
    };
    go();
  };

  const connectToSocket = (rideId: string) => {
  const socket = connectSocket();

  // Try joining as passenger first, fallback to driver
  socket.emit('passenger:subscribe_ride', { rideId });
  socket.emit('driver:join_ride', { rideId }); // also try as driver

  socket.on('driver:online',   () => setDriverOnline(true));
  socket.on('driver:offline',  () => setDriverOnline(false));

  socket.on('driver:location_update', (data: any) => {
    console.log('📥 Page received location:', data.lat, data.lng);
    updateDriverLocation(data.lat, data.lng, data.heading);
    setDriverOnline(true);
  });

  socket.on('ride:completed', () => {
    toast.success('Ride completed!');
    router.push('/bookings');
  });

  socket.on('error', (e: any) => {
    console.log('Socket error:', e.message);
  });
};

  const handleSOS = () => {
    if (!window.confirm('Send SOS alert to driver and RideShare support?')) return;
    const socket = connectSocket();
    socket.emit('passenger:sos', { rideId: id, lat: driverLat, lng: driverLng });
    toast.error('SOS sent! Help is on the way.', { duration: 5000 });
  };

  if (loading) return <Spinner fullScreen />;
  if (!ride)   return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Top bar */}
      <div className="glass border-b border-mist-100 z-30" style={{ flexShrink: 0 }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 bg-mist-100 rounded-xl flex items-center justify-center text-mist-600">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="font-display font-semibold text-ink-900 text-sm tracking-tight">Live tracking</p>
            <p className="text-xs text-mist-400">{ride.origin_name} → {ride.dest_name}</p>
          </div>
          <Badge
            label={driverOnline ? 'Driver online' : 'Waiting for driver'}
            variant={driverOnline ? 'success' : 'warning'}
            dot
          />
        </div>
      </div>

      {/* Map — fills all remaining space */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <div
          ref={mapRef}
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        />

        {/* ETA chip */}
        {eta && driverOnline && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-card rounded-2xl px-4 py-2.5 shadow-glass flex items-center gap-2 z-20">
            <Clock size={16} className="text-violet-600" />
            <span className="text-sm font-medium text-ink-900">
              Driver arrives in <span className="text-violet-600 font-bold">{eta}</span>
            </span>
          </div>
        )}

        {/* Waiting overlay */}
        {!driverOnline && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-card rounded-2xl px-4 py-2.5 shadow-glass z-20 whitespace-nowrap">
            <p className="text-sm text-mist-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning-500 pulse-dot" />
              Waiting for driver to share location...
            </p>
          </div>
        )}

        {/* SOS */}
        <button
          onClick={handleSOS}
          className="absolute bottom-4 right-4 w-14 h-14 bg-danger-500 hover:bg-danger-600 rounded-full flex items-center justify-center text-white shadow-lg transition-colors z-20"
        >
          <Shield size={22} />
        </button>
      </div>

      {/* Bottom sheet */}
      <div className="glass border-t border-mist-100 z-30" style={{ flexShrink: 0 }}>
        <div className="max-w-2xl mx-auto px-4 py-4">

          {/* Driver */}
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={ride.driver_name} src={ride.avatar_url} size="md" />
            <div className="flex-1">
              <p className="font-display font-semibold text-ink-900 tracking-tight">{ride.driver_name}</p>
              <p className="text-xs text-mist-400">{ride.color} {ride.make} {ride.model} · {ride.plate_number}</p>
            </div>
            <div className="flex gap-2">
              {ride.driver_phone && (
                <a href={`tel:${ride.driver_phone}`} className="w-10 h-10 bg-success-50 rounded-xl flex items-center justify-center text-success-600">
                  <Phone size={18} />
                </a>
              )}
              <button className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600">
                <MessageCircle size={18} />
              </button>
            </div>
          </div>

          {/* Route */}
          {booking && (
            <div className="bg-mist-50 rounded-2xl p-3.5 mb-3">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                  <div className="w-0.5 h-5 bg-mist-300" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gold-500" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-ink-800">{booking.pickup_name}</p>
                    <p className="text-xs text-mist-400">Your pickup</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-ink-800">{booking.dropoff_name}</p>
                    <p className="text-xs text-mist-400">Your dropoff</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold text-violet-600">₹{booking.fare_total}</p>
                  <p className="text-xs text-mist-400">fare</p>
                </div>
              </div>
            </div>
          )}

          {/* OTP */}
          {booking?.otp && (
            <div className="flex items-center justify-between bg-violet-50 rounded-2xl px-4 py-3">
              <div>
                <p className="text-xs text-violet-600 font-medium">Boarding OTP</p>
                <p className="text-xs text-mist-500">Show this to your driver</p>
              </div>
              <span className="font-mono font-bold text-violet-700 text-2xl tracking-widest">{booking.otp}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}