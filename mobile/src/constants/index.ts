// ============================================
// REUSA - Constants
// ============================================

// API
// Para emulador Android usa: 10.0.2.2
// Para dispositivo físico usa: tu IP local (192.168.x.x)
const LOCAL_IP = '10.0.2.2'; // Emulador Android (usa tu IP local para dispositivo físico)
export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000/api`;
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL || `http://${LOCAL_IP}:3000`;

// App Info
export const APP_NAME = 'Reusemos';
export const APP_SLOGAN = 'Dale otra vuelta';
export const APP_VERSION = '1.0.0';

// Colors
export const COLORS = {
  // Primary
  primary: '#2D9B6E',
  primaryLight: '#4DB88A',
  primaryDark: '#1E7A53',

  // Secondary
  secondary: '#F5E6D3',
  secondaryLight: '#FFF8F0',
  secondaryDark: '#E5D6C3',

  // Accent
  accent: '#FF6B4A',
  accentLight: '#FF8A6F',
  accentDark: '#E55A3A',

  // Neutral
  white: '#FFFFFF',
  background: '#FAFAFA',
  surface: '#FFFFFF',
  border: '#E5E5E5',
  divider: '#F0F0F0',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',

  // Status
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Specific
  trade: '#9C27B0',
  impact: '#4CAF50',
  verified: '#2196F3',
  favorite: '#E91E63',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

// Typography
export const FONTS = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const FONT_SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

// Border Radius
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// Shadows
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

// Product Conditions
export const PRODUCT_CONDITIONS = {
  NEW_WITH_TAGS: {
    label: 'Nuevo con etiqueta',
    description: 'Nunca usado, con etiquetas',
  },
  LIKE_NEW: {
    label: 'Como nuevo',
    description: 'Usado pocas veces, sin defectos',
  },
  GOOD: {
    label: 'Buen estado',
    description: 'Uso normal, puede tener pequeñas marcas',
  },
  ACCEPTABLE: {
    label: 'Aceptable',
    description: 'Signos visibles de uso, funciona perfectamente',
  },
} as const;

// Delivery Options
export const DELIVERY_OPTIONS = {
  PICKUP: {
    label: 'Solo retiro',
    description: 'El comprador retira en persona',
  },
  SHIPPING: {
    label: 'Solo envío',
    description: 'Envío a cargo del comprador',
  },
  BOTH: {
    label: 'Retiro o envío',
    description: 'El comprador elige',
  },
} as const;

// Transaction Status
export const TRANSACTION_STATUS = {
  PENDING: { label: 'Pendiente', color: COLORS.warning },
  PAID: { label: 'Pagado', color: COLORS.info },
  SHIPPED: { label: 'Enviado', color: COLORS.info },
  DELIVERED: { label: 'Entregado', color: COLORS.success },
  COMPLETED: { label: 'Completado', color: COLORS.success },
  CANCELLED: { label: 'Cancelado', color: COLORS.error },
  DISPUTED: { label: 'En disputa', color: COLORS.error },
  REFUNDED: { label: 'Reembolsado', color: COLORS.textSecondary },
} as const;

// Image Limits
export const IMAGE_CONFIG = {
  maxImages: 8,
  maxSizeMB: 10,
  quality: 0.8,
  aspectRatio: [4, 3] as [number, number],
} as const;

// Pagination
export const PAGINATION = {
  defaultLimit: 20,
  productsPerRow: 2,
} as const;

// Search
export const SEARCH = {
  debounceMs: 300,
  minQueryLength: 2,
  maxRecentSearches: 10,
} as const;

// Location
export const LOCATION = {
  defaultRadius: 25, // km
  maxRadius: 100, // km
  radiusOptions: [5, 10, 25, 50, 100],
} as const;

// Impact Factors (defaults, real values come from API)
export const IMPACT_FACTORS = {
  avgCO2PerKg: 5.0, // kg CO2 per kg of product
  avgWaterPerKg: 2000, // liters per kg
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  authToken: 'auth_token',
  refreshToken: 'refresh_token',
  user: 'user',
  recentSearches: 'recent_searches',
  onboardingComplete: 'onboarding_complete',
  selectedInterests: 'selected_interests',
  notificationToken: 'notification_token',
} as const;

// Routes
export const ROUTES = {
  // Auth
  WELCOME: 'Welcome',
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
  ONBOARDING_INTERESTS: 'OnboardingInterests',
  ONBOARDING_LOCATION: 'OnboardingLocation',

  // Main Tabs
  HOME_TAB: 'HomeTab',
  SEARCH_TAB: 'SearchTab',
  PUBLISH_TAB: 'PublishTab',
  CHAT_TAB: 'ChatTab',
  PROFILE_TAB: 'ProfileTab',

  // Home Stack
  HOME: 'Home',

  // Search Stack
  SEARCH: 'Search',
  SEARCH_RESULTS: 'SearchResults',
  SEARCH_FILTERS: 'SearchFilters',
  FILTERS: 'Filters',

  // Product Stack
  PRODUCT_DETAIL: 'ProductDetail',
  PRODUCT_GALLERY: 'ProductGallery',
  CREATE_PRODUCT: 'CreateProduct',
  PUBLISH_STEP_1: 'PublishStep1',
  PUBLISH_STEP_2: 'PublishStep2',
  PUBLISH_STEP_3: 'PublishStep3',
  PUBLISH_STEP_4: 'PublishStep4',
  PUBLISH_SUCCESS: 'PublishSuccess',

  // Chat Stack
  CONVERSATIONS: 'Conversations',
  CHAT: 'Chat',
  CHAT_DETAIL: 'ChatDetail',
  MAKE_OFFER: 'MakeOffer',
  PROPOSE_TRADE: 'ProposeTrade',

  // Profile Stack
  MY_PROFILE: 'MyProfile',
  EDIT_PROFILE: 'EditProfile',
  EDIT_LOCATION: 'EditLocation',
  USER_PROFILE: 'UserProfile',
  PUBLIC_PROFILE: 'PublicProfile',
  MY_PRODUCTS: 'MyProducts',
  FAVORITES: 'Favorites',
  MY_PURCHASES: 'MyPurchases',
  MY_SALES: 'MySales',
  REVIEWS: 'Reviews',
  VERIFICATION: 'Verification',
  PAYMENT_METHODS: 'PaymentMethods',
  CHANGE_PASSWORD: 'ChangePassword',

  // Transaction Stack
  TRANSACTION_DETAIL: 'TransactionDetail',
  CHECKOUT: 'Checkout',
  PAYMENT: 'Payment',
  PAYMENT_RESULT: 'PaymentResult',
  PURCHASE_SUCCESS: 'PurchaseSuccess',
  LEAVE_REVIEW: 'LeaveReview',

  // Settings Stack
  SETTINGS: 'Settings',
  NOTIFICATIONS_SETTINGS: 'NotificationsSettings',
  PRIVACY: 'Privacy',
  HELP: 'Help',
  ABOUT: 'About',
} as const;
