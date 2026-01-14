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
  { id: 'tech', name: 'Tech', icon: 'phone-portrait-outline' },
  { id: 'hogar', name: 'Hogar', icon: 'home-outline' },
  { id: 'libros', name: 'Libros', icon: 'book-outline' },
  { id: 'deportes', name: 'Deportes', icon: 'football-outline' },
  { id: 'ninos', name: 'Niños', icon: 'happy-outline' },
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
          Selecciona al menos 1 para personalizar tu experiencia
        </Text>

        {/* Categories Grid */}
        <View style={styles.grid}>
          {categories.map((category) => {
            const isSelected = selected.includes(category.id);
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  isSelected && styles.categoryCardSelected,
                ]}
                onPress={() => toggleCategory(category.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer,
                  isSelected && styles.iconContainerSelected,
                ]}>
                  <Ionicons
                    name={category.icon as any}
                    size={32}
                    color={isSelected ? COLORS.primary : COLORS.textSecondary}
                  />
                </View>
                <Text style={[
                  styles.categoryName,
                  isSelected && styles.categoryNameSelected,
                ]}>
                  {category.name}
                </Text>
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={14} color={COLORS.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Buttons */}
      <View style={styles.footer}>
        <Button
          title={saving ? 'Guardando...' : 'Continuar'}
          onPress={handleContinue}
          disabled={selected.length === 0 || saving}
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
    flexGrow: 1,
    padding: SPACING.base,
    paddingTop: SPACING['2xl'],
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
    marginBottom: SPACING['2xl'],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  categoryCard: {
    width: '47%',
    aspectRatio: 1.2,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryCardSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: COLORS.primary,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  iconContainerSelected: {
    backgroundColor: '#C8E6C9',
  },
  categoryName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  categoryNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
