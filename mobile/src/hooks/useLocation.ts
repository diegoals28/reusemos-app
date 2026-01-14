// ============================================
// REUSA - Location Hook
// ============================================

import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
}

interface UseLocationOptions {
  autoRequest?: boolean;
}

interface UseLocationReturn {
  location: LocationData | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<LocationData | null>;
  reverseGeocode: (latitude: number, longitude: number) => Promise<LocationData | null>;
  getDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
  formatDistance: (meters: number) => string;
}

export function useLocation(options: UseLocationOptions = {}): UseLocationReturn {
  const { autoRequest = false } = options;
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<LocationData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Permiso de ubicación denegado');
        Alert.alert(
          'Permiso denegado',
          'Necesitamos acceso a tu ubicación para mostrarte productos cercanos',
          [{ text: 'OK' }]
        );
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentLocation.coords;

      // Reverse geocode
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });

      const locationData: LocationData = {
        latitude,
        longitude,
        city: address?.city || address?.subregion || undefined,
        state: address?.region || undefined,
        country: address?.country || undefined,
      };

      setLocation(locationData);
      return locationData;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al obtener ubicación';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reverseGeocode = useCallback(
    async (latitude: number, longitude: number): Promise<LocationData | null> => {
      try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });

        return {
          latitude,
          longitude,
          city: address?.city || address?.subregion || undefined,
          state: address?.region || undefined,
          country: address?.country || undefined,
        };
      } catch (err) {
        console.error('Reverse geocode error:', err);
        return null;
      }
    },
    []
  );

  // Haversine formula for distance calculation
  const getDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c; // Distance in meters
    },
    []
  );

  const formatDistance = useCallback((meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  }, []);

  useEffect(() => {
    if (autoRequest) {
      requestLocation();
    }
  }, [autoRequest, requestLocation]);

  return {
    location,
    isLoading,
    error,
    requestLocation,
    reverseGeocode,
    getDistance,
    formatDistance,
  };
}
