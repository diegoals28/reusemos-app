// ============================================
// REUSA - Onboarding Location Screen
// ============================================

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';
import { usersApi } from '@/services/api';

interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
}

export default function OnboardingLocationScreen() {
  const navigation = useNavigation<any>();
  const { setOnboardingComplete } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const locationDataRef = useRef<LocationData | null>(null);

  const requestLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permiso denegado',
          'Puedes buscar tu ciudad manualmente',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});

      // Reverse geocode
      const [address] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (address) {
        const cityName = address.city || address.subregion || address.region || '';
        setLocation(cityName);

        // Store location data for saving
        locationDataRef.current = {
          lat: currentLocation.coords.latitude,
          lng: currentLocation.coords.longitude,
          city: address.city || address.subregion || undefined,
          state: address.region || undefined,
          country: address.country || undefined,
        };
      }
    } catch (error) {
      Alert.alert('Error', 'No pudimos obtener tu ubicación');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Save location if we have it
      if (locationDataRef.current) {
        await usersApi.updateLocation(locationDataRef.current);
      }
      setOnboardingComplete(true);
    } catch (error) {
      // Even if saving fails, let them continue
      console.warn('Failed to save location:', error);
      setOnboardingComplete(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setOnboardingComplete(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.stepText}>Paso 2 de 2</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '100%' }]} />
        </View>
      </View>

      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.mapIcon}>
            <Ionicons name="location" size={80} color={COLORS.primary} />
          </View>
        </View>

        <Text style={styles.title}>¿Dónde te encuentras?</Text>
        <Text style={styles.subtitle}>
          Te mostramos productos cerca de ti primero
        </Text>

        {/* Location Button */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={requestLocation}
          disabled={loading}
        >
          <Ionicons
            name="navigate"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.locationButtonText}>
            {loading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
          </Text>
          {location && (
            <View style={styles.locationCheck}>
              <Ionicons name="checkmark" size={16} color={COLORS.white} />
            </View>
          )}
        </TouchableOpacity>

        {location && (
          <View style={styles.detectedLocation}>
            <Ionicons name="location-outline" size={18} color={COLORS.primary} />
            <Text style={styles.detectedText}>
              Te ubicamos en <Text style={styles.cityText}>{location}</Text>
            </Text>
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Manual Search */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ciudad o barrio..."
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.footer}>
        <Button
          title={saving ? 'Guardando...' : 'Continuar'}
          onPress={handleContinue}
          disabled={saving}
          loading={saving}
          fullWidth
          size="lg"
        />
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Saltar por ahora</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  progressContainer: {
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: SPACING.base,
    paddingTop: SPACING['2xl'],
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  mapIcon: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    backgroundColor: COLORS.secondaryLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
  },
  locationButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.primary,
  },
  locationCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectedLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  detectedText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  cityText: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    paddingHorizontal: SPACING.base,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  footer: {
    padding: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  skipButton: {
    alignItems: 'center',
    padding: SPACING.sm,
  },
  skipText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
});
