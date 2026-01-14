// ============================================
// REUSA - Edit Profile Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';
import { usersApi } from '@/services/api';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();

  const [avatarUri, setAvatarUri] = useState(user?.avatarUrl || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersApi.updateMe(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser as User | null);
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      Alert.alert('Éxito', 'Tu perfil ha sido actualizado');
      navigation.goBack();
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'No pudimos actualizar tu perfil');
    },
  });

  const handleBack = () => {
    navigation.goBack();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'El usuario debe tener al menos 3 caracteres');
      return;
    }

    updateMutation.mutate({
      displayName: displayName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim() || undefined,
      phone: phone.trim() || undefined,
      avatarUrl: avatarUri || undefined,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar perfil</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={updateMutation.isPending}
        >
          <Text style={[styles.saveText, updateMutation.isPending && styles.saveTextDisabled]}>
            Guardar
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color={COLORS.textTertiary} />
                </View>
              )}
              <View style={styles.avatarEditButton}>
                <Ionicons name="camera" size={16} color={COLORS.white} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage}>
              <Text style={styles.changePhotoText}>Cambiar foto</Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre *</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Tu nombre completo"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Usuario *</Text>
              <View style={styles.usernameContainer}>
                <Text style={styles.usernamePrefix}>@</Text>
                <TextInput
                  style={[styles.input, styles.usernameInput]}
                  value={username}
                  onChangeText={(text) => setUsername(text.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="tu_usuario"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="none"
                />
              </View>
              <Text style={styles.hint}>Solo letras, números y guión bajo</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Cuéntanos sobre ti..."
                placeholderTextColor={COLORS.textTertiary}
                multiline
                numberOfLines={3}
                maxLength={150}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{bio.length}/150</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+54 11 1234-5678"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="phone-pad"
              />
              <Text style={styles.hint}>Solo visible para compradores confirmados</Text>
            </View>
          </View>

          {/* Verification Banner */}
          {!user?.isVerified && (
            <TouchableOpacity style={styles.verificationBanner}>
              <View style={styles.verificationIcon}>
                <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.verificationContent}>
                <Text style={styles.verificationTitle}>Verifica tu identidad</Text>
                <Text style={styles.verificationSubtitle}>
                  Aumenta la confianza de compradores y vendedores
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  saveButton: {
    padding: SPACING.xs,
  },
  saveText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.primary,
  },
  saveTextDisabled: {
    color: COLORS.textTertiary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING['2xl'],
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  changePhotoText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.primary,
  },
  form: {
    padding: SPACING.base,
    gap: SPACING.lg,
  },
  inputContainer: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernamePrefix: {
    position: 'absolute',
    left: SPACING.base,
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    zIndex: 1,
  },
  usernameInput: {
    flex: 1,
    paddingLeft: SPACING.xl,
  },
  bioInput: {
    height: 100,
    paddingTop: SPACING.md,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'right',
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.base,
    padding: SPACING.md,
    backgroundColor: COLORS.secondaryLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  verificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.primary,
  },
  verificationSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
