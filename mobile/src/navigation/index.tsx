// ============================================
// REUSA - Navigation
// ============================================

import React from 'react';
import { View, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, ROUTES } from '@/constants';

// Auth Screens
import WelcomeScreen from '@/screens/auth/WelcomeScreen';
import LoginScreen from '@/screens/auth/LoginScreen';
import RegisterScreen from '@/screens/auth/RegisterScreen';
import OnboardingInterestsScreen from '@/screens/auth/OnboardingInterestsScreen';
import OnboardingLocationScreen from '@/screens/auth/OnboardingLocationScreen';
import ForgotPasswordScreen from '@/screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '@/screens/auth/ResetPasswordScreen';

// Main Screens
import HomeScreen from '@/screens/home/HomeScreen';
import SearchScreen from '@/screens/search/SearchScreen';
import ProductDetailScreen from '@/screens/product/ProductDetailScreen';
import CreateProductScreen from '@/screens/product/CreateProductScreen';

// Chat Screens
import ChatListScreen from '@/screens/chat/ChatListScreen';
import ChatDetailScreen from '@/screens/chat/ChatDetailScreen';
import MakeOfferScreen from '@/screens/chat/MakeOfferScreen';
import OfferDetailScreen from '@/screens/chat/OfferDetailScreen';

// Profile Screens
import ProfileScreen from '@/screens/profile/ProfileScreen';
import EditProfileScreen from '@/screens/profile/EditProfileScreen';
import FavoritesScreen from '@/screens/profile/FavoritesScreen';
import MyProductsScreen from '@/screens/profile/MyProductsScreen';
import UserReviewsScreen from '@/screens/profile/UserReviewsScreen';

// Checkout Screens
import CheckoutScreen from '@/screens/checkout/CheckoutScreen';
import PaymentScreen from '@/screens/checkout/PaymentScreen';
import PaymentResultScreen from '@/screens/checkout/PaymentResultScreen';
import PurchaseSuccessScreen from '@/screens/checkout/PurchaseSuccessScreen';
import TransferInstructionsScreen from '@/screens/checkout/TransferInstructionsScreen';

// Transaction Screens
import TransactionsListScreen from '@/screens/transactions/TransactionsListScreen';
import TransactionDetailScreen from '@/screens/transactions/TransactionDetailScreen';
import LeaveReviewScreen from '@/screens/transactions/LeaveReviewScreen';

// Settings Screen
import SettingsScreen from '@/screens/settings/SettingsScreen';

// Types
export type RootStackParamList = {
  // Auth
  [ROUTES.WELCOME]: undefined;
  [ROUTES.LOGIN]: undefined;
  [ROUTES.REGISTER]: undefined;
  [ROUTES.ONBOARDING_INTERESTS]: undefined;
  [ROUTES.ONBOARDING_LOCATION]: undefined;
  [ROUTES.FORGOT_PASSWORD]: undefined;
  [ROUTES.RESET_PASSWORD]: { token: string };

  // Main
  MainTabs: undefined;

  // Product
  [ROUTES.PRODUCT_DETAIL]: { productId: string };
  [ROUTES.CREATE_PRODUCT]: undefined;

  // Chat
  [ROUTES.CHAT_DETAIL]: {
    conversationId: string;
    otherUser?: any;
    productId?: string;
  };
  [ROUTES.MAKE_OFFER]: {
    productId: string;
    conversationId: string;
    productPrice: number;
  };
  OfferDetail: {
    offer: any;
    productPrice?: number;
  };

  // Profile
  [ROUTES.EDIT_PROFILE]: undefined;
  [ROUTES.MY_PRODUCTS]: undefined;
  [ROUTES.FAVORITES]: undefined;
  [ROUTES.PUBLIC_PROFILE]: { userId: string };
  UserReviews: { userId: string; userName: string; userAvatar?: string };

  // Checkout & Transactions
  [ROUTES.CHECKOUT]: {
    productId: string;
    offerId?: string;
    conversationId?: string;
  };
  [ROUTES.PAYMENT]: {
    transactionId: string;
    amount: number;
    productTitle: string;
    paymentMethod: string;
  };
  [ROUTES.PURCHASE_SUCCESS]: {
    transactionId: string;
    productTitle: string;
    paymentPending?: boolean;
  };
  [ROUTES.PAYMENT_RESULT]: {
    transactionId: string;
    status: 'success' | 'failure' | 'pending';
    payment_id?: string;
  };
  TransferInstructions: {
    transactionId: string;
    amount: number;
    productTitle: string;
  };
  Transactions: undefined;
  [ROUTES.TRANSACTION_DETAIL]: { transactionId: string };
  [ROUTES.LEAVE_REVIEW]: {
    transactionId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
  };

  // Settings
  [ROUTES.SETTINGS]: undefined;
};

export type TabParamList = {
  [ROUTES.HOME_TAB]: undefined;
  [ROUTES.SEARCH_TAB]: undefined;
  [ROUTES.PUBLISH_TAB]: undefined;
  [ROUTES.CHAT_TAB]: undefined;
  [ROUTES.PROFILE_TAB]: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// ============================================
// Tab Navigator
// ============================================

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          paddingHorizontal: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case ROUTES.HOME_TAB:
              iconName = focused ? 'home' : 'home-outline';
              break;
            case ROUTES.SEARCH_TAB:
              iconName = focused ? 'search' : 'search-outline';
              break;
            case ROUTES.PUBLISH_TAB:
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case ROUTES.CHAT_TAB:
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case ROUTES.PROFILE_TAB:
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name={ROUTES.HOME_TAB}
        component={HomeScreen}
        options={{ tabBarLabel: 'Inicio' }}
      />
      <Tab.Screen
        name={ROUTES.SEARCH_TAB}
        component={SearchScreen}
        options={{ tabBarLabel: 'Buscar' }}
      />
      <Tab.Screen
        name={ROUTES.PUBLISH_TAB}
        component={EmptyComponent}
        options={{ tabBarLabel: 'Publicar' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate(ROUTES.CREATE_PRODUCT);
          },
        })}
      />
      <Tab.Screen
        name={ROUTES.CHAT_TAB}
        component={ChatListScreen}
        options={{ tabBarLabel: 'Chat' }}
      />
      <Tab.Screen
        name={ROUTES.PROFILE_TAB}
        component={ProfileScreen}
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

// Placeholder component for publish tab
function EmptyComponent() {
  return <View />;
}

// ============================================
// Deep Linking Configuration
// ============================================

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['reusemos://', 'https://reusemos.app'],
  config: {
    screens: {
      // Payment callbacks from MercadoPago
      [ROUTES.PAYMENT_RESULT]: {
        path: 'payment/:status',
        parse: {
          transactionId: (transactionId: string) => transactionId,
          status: (status: string) => status as 'success' | 'failure' | 'pending',
          payment_id: (payment_id: string) => payment_id,
        },
      },
      // Product deep link
      [ROUTES.PRODUCT_DETAIL]: {
        path: 'product/:productId',
      },
      // Transaction deep link
      [ROUTES.TRANSACTION_DETAIL]: {
        path: 'transaction/:transactionId',
      },
    },
  },
  async getInitialURL() {
    // Check if app was opened from a deep link
    const url = await Linking.getInitialURL();
    if (url != null) {
      return url;
    }
    return null;
  },
  subscribe(listener) {
    // Listen to incoming links from deep linking
    const subscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });
    return () => subscription.remove();
  },
};

// ============================================
// Main Navigation
// ============================================

export function Navigation() {
  const { isAuthenticated, isLoading, isOnboardingComplete } = useAuthStore();

  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name={ROUTES.WELCOME} component={WelcomeScreen} />
            <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
            <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
            <Stack.Screen name={ROUTES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />
            <Stack.Screen name={ROUTES.RESET_PASSWORD} component={ResetPasswordScreen} />
          </>
        ) : !isOnboardingComplete ? (
          // Onboarding Stack
          <>
            <Stack.Screen
              name={ROUTES.ONBOARDING_INTERESTS}
              component={OnboardingInterestsScreen}
            />
            <Stack.Screen
              name={ROUTES.ONBOARDING_LOCATION}
              component={OnboardingLocationScreen}
            />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />

            {/* Product Screens */}
            <Stack.Screen
              name={ROUTES.PRODUCT_DETAIL}
              component={ProductDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />

            {/* Chat Screens */}
            <Stack.Screen
              name={ROUTES.CHAT_DETAIL}
              component={ChatDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name={ROUTES.MAKE_OFFER}
              component={MakeOfferScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom'
              }}
            />
            <Stack.Screen
              name="OfferDetail"
              component={OfferDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />

            {/* Profile Screens */}
            <Stack.Screen
              name={ROUTES.EDIT_PROFILE}
              component={EditProfileScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name={ROUTES.FAVORITES}
              component={FavoritesScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name={ROUTES.MY_PRODUCTS}
              component={MyProductsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="UserReviews"
              component={UserReviewsScreen}
              options={{ animation: 'slide_from_right' }}
            />

            {/* Checkout Flow */}
            <Stack.Screen
              name={ROUTES.CHECKOUT}
              component={CheckoutScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name={ROUTES.PAYMENT}
              component={PaymentScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name={ROUTES.PAYMENT_RESULT}
              component={PaymentResultScreen}
              options={{
                animation: 'fade',
                gestureEnabled: false
              }}
            />
            <Stack.Screen
              name={ROUTES.PURCHASE_SUCCESS}
              component={PurchaseSuccessScreen}
              options={{
                animation: 'fade',
                gestureEnabled: false
              }}
            />
            <Stack.Screen
              name="TransferInstructions"
              component={TransferInstructionsScreen}
              options={{ animation: 'slide_from_right' }}
            />

            {/* Transaction Screens */}
            <Stack.Screen
              name="Transactions"
              component={TransactionsListScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name={ROUTES.TRANSACTION_DETAIL}
              component={TransactionDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name={ROUTES.LEAVE_REVIEW}
              component={LeaveReviewScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom'
              }}
            />

            {/* Settings */}
            <Stack.Screen
              name={ROUTES.SETTINGS}
              component={SettingsScreen}
              options={{ animation: 'slide_from_right' }}
            />

            {/* Create Product (Modal) */}
            <Stack.Screen
              name={ROUTES.CREATE_PRODUCT}
              component={CreateProductScreen}
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
});

export default Navigation;
