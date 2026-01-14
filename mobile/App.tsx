// ============================================
// REUSA - Main App Entry
// ============================================

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigation } from '@/navigation';
import { useAuthStore } from '@/stores/authStore';
import { usePushNotifications } from '@/services/pushNotifications';
import { StyleSheet } from 'react-native';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function PushNotificationsManager() {
  // This hook handles push notification registration and listeners
  // It internally checks for Device.isDevice and skips setup on emulators
  usePushNotifications();
  return null;
}

function AppContent() {
  const setLoading = useAuthStore((state) => state.setLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // Simulate auth check - in real app this would check stored tokens
    const checkAuth = async () => {
      // Small delay to allow hydration from storage
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLoading(false);
    };

    checkAuth();
  }, [setLoading]);

  return (
    <>
      {isAuthenticated && <PushNotificationsManager />}
      <Navigation />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <AppContent />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
