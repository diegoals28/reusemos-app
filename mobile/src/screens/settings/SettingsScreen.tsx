// ============================================
// Reusemos - Settings Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { usersApi, authApi } from '@/services/api';

interface SettingItemProps {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightComponent?: React.ReactNode;
  danger?: boolean;
}

function SettingItem({
  icon,
  iconColor = COLORS.textSecondary,
  label,
  value,
  onPress,
  showArrow = true,
  rightComponent,
  danger = false,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingLabel, danger && styles.dangerText]}>
          {label}
        </Text>
        {value && <Text style={styles.settingValue}>{value}</Text>}
      </View>
      {rightComponent}
      {showArrow && !rightComponent && (
        <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesion',
      '¿Estas seguro de que quieres cerrar sesion?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesion',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.logout();
            } catch (error) {
              // Ignore logout API errors
            }
            logout();
            navigation.reset({
              index: 0,
              routes: [{ name: ROUTES.LOGIN }],
            });
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      'Esta accion es irreversible. Se eliminaran todos tus datos, productos y conversaciones. ¿Estas seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar cuenta',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Confirmar eliminacion',
              'Escribe "ELIMINAR" mentalmente y presiona confirmar para eliminar tu cuenta permanentemente.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Confirmar eliminacion',
                  style: 'destructive',
                  onPress: performDeleteAccount,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await usersApi.deleteAccount();
      Alert.alert(
        'Cuenta eliminada',
        'Tu cuenta ha sido eliminada exitosamente.',
        [
          {
            text: 'OK',
            onPress: () => {
              logout();
              navigation.reset({
                index: 0,
                routes: [{ name: ROUTES.LOGIN }],
              });
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No pudimos eliminar tu cuenta. Por favor intenta de nuevo.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="person-outline"
              iconColor={COLORS.primary}
              label="Editar perfil"
              onPress={() => navigation.navigate(ROUTES.EDIT_PROFILE)}
            />
            <SettingItem
              icon="location-outline"
              iconColor="#2196F3"
              label="Ubicación"
              value={user?.city || 'No configurada'}
              onPress={() => navigation.navigate(ROUTES.EDIT_LOCATION)}
            />
            <SettingItem
              icon="card-outline"
              iconColor={COLORS.secondary}
              label="Métodos de pago"
              onPress={() => navigation.navigate(ROUTES.PAYMENT_METHODS)}
            />
            <SettingItem
              icon="shield-checkmark-outline"
              iconColor={COLORS.success}
              label="Verificación de identidad"
              value={user?.isVerified ? 'Verificado' : 'Pendiente'}
              onPress={() => navigation.navigate(ROUTES.VERIFICATION)}
            />
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificaciones</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="notifications-outline"
              iconColor="#FF9800"
              label="Notificaciones push"
              showArrow={false}
              rightComponent={
                <Switch
                  value={true}
                  onValueChange={() => {}}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <SettingItem
              icon="mail-outline"
              iconColor="#9C27B0"
              label="Notificaciones por email"
              showArrow={false}
              rightComponent={
                <Switch
                  value={true}
                  onValueChange={() => {}}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              }
            />
            <SettingItem
              icon="chatbubble-outline"
              iconColor="#00BCD4"
              label="Mensajes"
              value="Todos"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidad</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="eye-outline"
              iconColor="#607D8B"
              label="Visibilidad del perfil"
              value="Público"
              onPress={() => {}}
            />
            <SettingItem
              icon="lock-closed-outline"
              iconColor="#795548"
              label="Cambiar contraseña"
              onPress={() => navigation.navigate(ROUTES.CHANGE_PASSWORD)}
            />
            <SettingItem
              icon="ban-outline"
              iconColor={COLORS.error}
              label="Usuarios bloqueados"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Soporte</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="help-circle-outline"
              iconColor="#3F51B5"
              label="Centro de ayuda"
              onPress={() => {}}
            />
            <SettingItem
              icon="chatbubbles-outline"
              iconColor={COLORS.primary}
              label="Contactar soporte"
              onPress={() => {}}
            />
            <SettingItem
              icon="document-text-outline"
              iconColor="#009688"
              label="Términos y condiciones"
              onPress={() => {}}
            />
            <SettingItem
              icon="shield-outline"
              iconColor="#673AB7"
              label="Política de privacidad"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acerca de</Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="information-circle-outline"
              iconColor="#757575"
              label="Versión"
              value="1.0.0"
              showArrow={false}
            />
            <SettingItem
              icon="star-outline"
              iconColor="#FFC107"
              label="Calificar la app"
              onPress={() => {}}
            />
            <SettingItem
              icon="share-social-outline"
              iconColor="#E91E63"
              label="Compartir Reusemos"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={styles.sectionContent}>
            <SettingItem
              icon="log-out-outline"
              iconColor={COLORS.error}
              label="Cerrar sesión"
              showArrow={false}
              onPress={handleLogout}
              danger
            />
            <SettingItem
              icon="trash-outline"
              iconColor={COLORS.error}
              label="Eliminar cuenta"
              showArrow={false}
              onPress={handleDeleteAccount}
              danger
            />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Hecho con amor por el planeta
          </Text>
          <View style={styles.footerIcon}>
            <Ionicons name="leaf" size={16} color={COLORS.primary} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
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
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING['2xl'],
  },
  section: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.sm,
  },
  sectionContent: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  settingValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dangerText: {
    color: COLORS.error,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.xs,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
  footerIcon: {
    marginLeft: 4,
  },
});
