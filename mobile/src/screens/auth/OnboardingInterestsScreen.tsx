// ============================================
// REUSA - Onboarding Interests Screen
// ============================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { Button } from '@/components/common/Button';
import { usersApi } from '@/services/api';

const categories = [
  { id: 'ropa', name: 'Ropa', icon: 'shirt-outline' },
  { id: 'tech', name: 'Tecnología', icon: 'phone-portrait-outline' },
  { id: 'hogar', name: 'Hogar', icon: 'home-outline' },
  { id: 'libros', name: 'Libros', icon: 'book-outline' },
  { id: 'deportes', name: 'Deportes', icon: 'football-outline' },
  { id: 'ninos', name: 'Niños', icon: 'happy-outline' },
  { id: 'belleza', name: 'Belleza', icon: 'sparkles-outline' },
  { id: 'vehiculos', name: 'Vehículos', icon: 'car-outline' },
  { id: 'mascotas', name: 'Mascotas', icon: 'paw-outline' },
  { id: 'musica', name: 'Música', icon: 'musical-notes-outline' },
];

export default function OnboardingInterestsScreen() {
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleCategory = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const handleContinue = async () => {
    if (selected.length === 0) {
      navigation.navigate(ROUTES.ONBOARDING_LOCATION);
      return;
    }

    setSaving(true);
    try {
      await usersApi.updateInterests(selected);
      navigation.navigate(ROUTES.ONBOARDING_LOCATION);
    } catch (error) {
      Alert.alert('Error', 'No pudimos guardar tus intereses. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate(ROUTES.ONBOARDING_LOCATION);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.stepText}>Paso 1 de 2</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '50%' }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>¿Qué te interesa encontrar?</Text>
        <Text style={styles.subtitle}>
          Selecciona las categorías que te interesan
        </Text>

        {/* Categories Chips */}
        <View style={styles.chipsContainer}>
          {categories.map((category) => {
            const isSelected = selected.includes(category.id);
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.chip,
                  isSelected && styles.chipSelected,
                ]}
                onPress={() => toggleCategory(category.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={category.icon as any}
                  size={18}
                  color={isSelected ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}>
                  {category.name}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected count */}
        {selected.length > 0 && (
          <Text style={styles.selectedCount}>
            {selected.length} {selected.length === 1 ? 'categoría seleccionada' : 'categorías seleccionadas'}
          </Text>
        )}
      </ScrollView>

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
        {selected.length === 0 && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Saltar por ahora</Text>
          </TouchableOpacity>
        )}
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
    flexGrow: 1,
    padding: SPACING.base,
    paddingTop: SPACING.xl,
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
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: COLORS.white,
  },
  selectedCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: SPACING.lg,
    fontWeight: '500',
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
