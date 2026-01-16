// ============================================
// REUSA - API Service
// ============================================

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import type {
  User,
  Product,
  Category,
  Conversation,
  Message,
  Transaction,
  Review,
  Notification,
  PaginatedResponse,
  ApiError,
  LoginForm,
  RegisterForm,
  ProductForm,
  ProductFilters,
} from '@/types';

// DEV MODE: Skip logout on API errors for testing
const DEV_SKIP_AUTH = false;

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds for Railway cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config;

    // In DEV mode, don't logout on API errors
    if (DEV_SKIP_AUTH) {
      return Promise.reject(error);
    }

    // Handle 401 - Try to refresh token
    if (error.response?.status === 401 && originalRequest) {
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data;
          useAuthStore.getState().setTokens(token, newRefreshToken);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed - logout
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  }
);

// ============================================
// Auth API
// ============================================

export const authApi = {
  login: async (data: LoginForm) => {
    const response = await api.post<{ user: User; token: string; refreshToken: string }>(
      '/auth/login',
      data
    );
    return response.data;
  },

  register: async (data: RegisterForm) => {
    const response = await api.post<{ user: User; token: string; refreshToken: string }>(
      '/auth/register',
      data
    );
    return response.data;
  },

  loginWithGoogle: async (idToken: string) => {
    const response = await api.post<{ user: User; token: string; refreshToken: string }>(
      '/auth/google',
      { idToken }
    );
    return response.data;
  },

  loginWithApple: async (identityToken: string, fullName?: { givenName?: string; familyName?: string }) => {
    const response = await api.post<{ user: User; token: string; refreshToken: string }>(
      '/auth/apple',
      { identityToken, fullName }
    );
    return response.data;
  },

  logout: async () => {
    await api.post('/auth/logout');
  },

  forgotPassword: async (email: string) => {
    await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, password: string) => {
    await api.post('/auth/reset-password', { token, password });
  },

  verifyEmail: async (token: string) => {
    await api.post('/auth/verify-email', { token });
  },

  refreshToken: async (refreshToken: string) => {
    const response = await api.post<{ token: string; refreshToken: string }>(
      '/auth/refresh',
      { refreshToken }
    );
    return response.data;
  },
};

// ============================================
// Users API
// ============================================

export const usersApi = {
  getMe: async () => {
    const response = await api.get<User>('/users/me');
    return response.data;
  },

  updateMe: async (data: Partial<User>) => {
    const response = await api.patch<User>('/users/me', data);
    return response.data;
  },

  updateAvatar: async (imageUri: string) => {
    const formData = new FormData();
    formData.append('avatar', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);

    const response = await api.patch<{ avatarUrl: string }>('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getUser: async (userId: string) => {
    const response = await api.get<User>(`/users/${userId}`);
    return response.data;
  },

  getUserProducts: async (userId: string, page = 1, limit = 20) => {
    const response = await api.get<PaginatedResponse<Product>>(
      `/users/${userId}/products`,
      { params: { page, limit } }
    );
    return response.data;
  },

  getUserReviews: async (userId: string, page = 1, limit = 20) => {
    const response = await api.get<PaginatedResponse<Review>>(
      `/users/${userId}/reviews`,
      { params: { page, limit } }
    );
    return response.data;
  },

  updateInterests: async (interests: string[]) => {
    const response = await api.patch<User>('/users/me/interests', { interests });
    return response.data;
  },

  updateLocation: async (location: { lat: number; lng: number; city?: string; country?: string }) => {
    const response = await api.patch<User>('/users/me/location', location);
    return response.data;
  },

  registerDevice: async (token: string, deviceType: 'ios' | 'android') => {
    await api.post('/users/me/devices', { token, deviceType });
  },

  deleteAccount: async () => {
    await api.delete('/users/me');
  },
};

// ============================================
// Products API
// ============================================

export const productsApi = {
  getProducts: async (filters?: ProductFilters, page = 1, limit = 20) => {
    const response = await api.get<PaginatedResponse<Product>>('/products', {
      params: { ...filters, page, limit },
    });
    return response.data;
  },

  getProduct: async (productId: string) => {
    const response = await api.get<Product>(`/products/${productId}`);
    return response.data;
  },

  getProductById: async (productId: string) => {
    const response = await api.get<{ success: boolean; data: Product }>(`/products/${productId}`);
    return response.data.data;
  },

  createProduct: async (data: ProductForm) => {
    const formData = new FormData();

    // Add text fields
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('categoryId', data.categoryId);
    formData.append('condition', data.condition);
    formData.append('deliveryOption', data.deliveryOption);
    formData.append('acceptsTrade', String(data.acceptsTrade));

    if (data.price) formData.append('price', String(data.price));
    if (data.tradePreferences) formData.append('tradePreferences', data.tradePreferences);

    // Add images
    data.images.forEach((uri, index) => {
      formData.append('images', {
        uri,
        type: 'image/jpeg',
        name: `image_${index}.jpg`,
      } as any);
    });

    const response = await api.post<Product>('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateProduct: async (productId: string, data: Partial<ProductForm>) => {
    const response = await api.patch<Product>(`/products/${productId}`, data);
    return response.data;
  },

  deleteProduct: async (productId: string) => {
    await api.delete(`/products/${productId}`);
  },

  getNearbyProducts: async (lat: number, lng: number, radius = 25, page = 1, limit = 20) => {
    const response = await api.get<PaginatedResponse<Product>>('/products/nearby', {
      params: { lat, lng, radius, page, limit },
    });
    return response.data;
  },

  getRecentProducts: async (page = 1, limit = 20) => {
    const response = await api.get<PaginatedResponse<Product>>('/products/recent', {
      params: { page, limit },
    });
    return response.data;
  },

  searchProducts: async (query: string, filters?: ProductFilters, page = 1, limit = 20) => {
    const response = await api.get<PaginatedResponse<Product>>('/products/search', {
      params: { q: query, ...filters, page, limit },
    });
    return response.data;
  },

  getMyProducts: async (status?: string, page = 1, limit = 20) => {
    const response = await api.get<PaginatedResponse<Product>>('/products/me', {
      params: { status, page, limit },
    });
    return response.data;
  },

  toggleFavorite: async (productId: string) => {
    const response = await api.post<{ isFavorite: boolean }>(`/products/${productId}/favorite`);
    return response.data;
  },

  getFavorites: async (page = 1, limit = 20) => {
    const response = await api.get<PaginatedResponse<Product>>('/products/favorites', {
      params: { page, limit },
    });
    return response.data;
  },

  reportProduct: async (productId: string, reason: string, description?: string) => {
    await api.post(`/products/${productId}/report`, { reason, description });
  },
};

// ============================================
// Categories API
// ============================================

export const categoriesApi = {
  getCategories: async () => {
    const response = await api.get<Category[]>('/categories');
    return response.data;
  },

  getCategory: async (categoryId: string) => {
    const response = await api.get<Category>(`/categories/${categoryId}`);
    return response.data;
  },
};

// ============================================
// Conversations API
// ============================================

export const conversationsApi = {
  getConversations: async (page = 1, limit = 20) => {
    const response = await api.get<PaginatedResponse<Conversation>>('/conversations', {
      params: { page, limit },
    });
    return response.data;
  },

  getConversation: async (conversationId: string) => {
    const response = await api.get<Conversation>(`/conversations/${conversationId}`);
    return response.data;
  },

  getOrCreateConversation: async (productId: string) => {
    const response = await api.post<Conversation>('/conversations', { productId });
    return response.data;
  },

  getMessages: async (conversationId: string, page = 1, limit = 50) => {
    const response = await api.get<PaginatedResponse<Message>>(
      `/conversations/${conversationId}/messages`,
      { params: { page, limit } }
    );
    return response.data;
  },

  sendMessage: async (conversationId: string, content: string) => {
    const response = await api.post<Message>(`/conversations/${conversationId}/messages`, {
      type: 'TEXT',
      content,
    });
    return response.data;
  },

  sendImage: async (conversationId: string, imageUri: string) => {
    const formData = new FormData();
    formData.append('type', 'IMAGE');
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'message_image.jpg',
    } as any);

    const response = await api.post<Message>(
      `/conversations/${conversationId}/messages`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  sendOffer: async (conversationId: string, amount: number, message?: string) => {
    const response = await api.post<Message>(`/conversations/${conversationId}/messages`, {
      type: 'OFFER',
      content: message,
      metadata: { amount, status: 'pending' },
    });
    return response.data;
  },

  sendTradeProposal: async (
    conversationId: string,
    offeredProductId: string,
    cashDifference?: number,
    message?: string
  ) => {
    const response = await api.post<Message>(`/conversations/${conversationId}/messages`, {
      type: 'TRADE_PROPOSAL',
      content: message,
      metadata: { offeredProductId, cashDifference, status: 'pending' },
    });
    return response.data;
  },

  respondToOffer: async (messageId: string, accept: boolean) => {
    const response = await api.patch<Message>(`/messages/${messageId}/respond`, {
      accept,
    });
    return response.data;
  },

  markAsRead: async (conversationId: string) => {
    await api.post(`/conversations/${conversationId}/read`);
  },
};

// ============================================
// Transactions API
// ============================================

export const transactionsApi = {
  getMyPurchases: async () => {
    const response = await api.get<{ success: boolean; data: Transaction[] }>('/transactions/purchases');
    return response.data.data;
  },

  getMySales: async () => {
    const response = await api.get<{ success: boolean; data: Transaction[] }>('/transactions/sales');
    return response.data.data;
  },

  getTransactionById: async (transactionId: string) => {
    const response = await api.get<{ success: boolean; data: Transaction }>(`/transactions/${transactionId}`);
    return response.data.data;
  },

  createTransaction: async (data: {
    productId: string;
    offerId?: string;
    deliveryMethod: 'pickup' | 'shipping';
    paymentMethod: 'mercadopago' | 'transfer' | 'cash';
    shippingAddress?: string;
    shippingCity?: string;
    shippingPostalCode?: string;
    shippingNotes?: string;
    conversationId?: string;
  }) => {
    const response = await api.post<{ success: boolean; data: Transaction }>('/transactions', data);
    return response.data.data;
  },

  updateTransactionStatus: async (transactionId: string, status: string) => {
    const response = await api.patch<{ success: boolean; data: Transaction }>(
      `/transactions/${transactionId}/status`,
      { status }
    );
    return response.data.data;
  },

  getTransactionStats: async () => {
    const response = await api.get<{ success: boolean; data: any }>('/transactions/stats');
    return response.data.data;
  },
};

// ============================================
// Reviews API
// ============================================

export const reviewsApi = {
  createReview: async (data: {
    transactionId: string;
    reviewedUserId: string;
    rating: number;
    comment?: string;
    tags?: string[];
  }) => {
    const response = await api.post<{ success: boolean; data: Review }>('/reviews', data);
    return response.data.data;
  },

  getUserReviews: async (userId: string, limit = 20, offset = 0) => {
    const response = await api.get<{ success: boolean; data: { reviews: Review[]; total: number } }>(
      `/reviews/user/${userId}`,
      { params: { limit, offset } }
    );
    return response.data.data;
  },

  getUserRatingSummary: async (userId: string) => {
    const response = await api.get<{ success: boolean; data: any }>(`/reviews/user/${userId}/summary`);
    return response.data.data;
  },

  reportReview: async (reviewId: string, reason: string) => {
    await api.post(`/reviews/${reviewId}/report`, { reason });
  },
};

// ============================================
// Offers API
// ============================================

export const offersApi = {
  createOffer: async (data: {
    productId: string;
    conversationId: string;
    type: 'price' | 'trade' | 'mixed';
    amount?: number;
    tradeProductIds?: string[];
    cashDifference?: number;
    message?: string;
  }) => {
    const response = await api.post<{ success: boolean; data: any }>('/offers', data);
    return response.data.data;
  },

  getSentOffers: async () => {
    const response = await api.get<{ success: boolean; data: any[] }>('/offers/sent');
    return response.data.data;
  },

  getReceivedOffers: async () => {
    const response = await api.get<{ success: boolean; data: any[] }>('/offers/received');
    return response.data.data;
  },

  getProductOffers: async (productId: string) => {
    const response = await api.get<{ success: boolean; data: any[] }>(`/offers/product/${productId}`);
    return response.data.data;
  },

  acceptOffer: async (offerId: string) => {
    const response = await api.patch<{ success: boolean; data: any }>(`/offers/${offerId}/accept`);
    return response.data.data;
  },

  rejectOffer: async (offerId: string, reason?: string) => {
    const response = await api.patch<{ success: boolean; data: any }>(`/offers/${offerId}/reject`, { reason });
    return response.data.data;
  },

  counterOffer: async (offerId: string, data: {
    amount?: number;
    tradeProductIds?: string[];
    cashDifference?: number;
    message?: string;
  }) => {
    const response = await api.post<{ success: boolean; data: any }>(`/offers/${offerId}/counter`, data);
    return response.data.data;
  },

  cancelOffer: async (offerId: string) => {
    const response = await api.patch<{ success: boolean; data: any }>(`/offers/${offerId}/cancel`);
    return response.data.data;
  },
};

// ============================================
// Payments API
// ============================================

export const paymentsApi = {
  createPayment: async (transactionId: string) => {
    const response = await api.post<{ success: boolean; data: { preferenceId: string; initPoint: string } }>(
      `/payments/create/${transactionId}`
    );
    return response.data.data;
  },

  checkPaymentStatus: async (transactionId: string) => {
    const response = await api.get<{ success: boolean; data: { status: string; statusDetail: string } }>(
      `/payments/status/${transactionId}`
    );
    return response.data.data;
  },

  getEarnings: async () => {
    const response = await api.get<{ success: boolean; data: any }>('/payments/earnings');
    return response.data.data;
  },
};

// ============================================
// Notifications API
// ============================================

export const notificationsApi = {
  getNotifications: async (page = 1, limit = 20) => {
    const response = await api.get<PaginatedResponse<Notification>>('/notifications', {
      params: { page, limit },
    });
    return response.data;
  },

  markAsRead: async (notificationId: string) => {
    await api.patch(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async () => {
    await api.post('/notifications/read-all');
  },

  getUnreadCount: async () => {
    const response = await api.get<{ count: number }>('/notifications/unread-count');
    return response.data.count;
  },
};

// ============================================
// Upload API
// ============================================

export const uploadApi = {
  uploadImage: async (uri: string, folder = 'general') => {
    const formData = new FormData();
    formData.append('file', {
      uri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    } as any);
    formData.append('folder', folder);

    const response = await api.post<{ url: string; thumbnailUrl: string }>('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

// ============================================
// Shipping API (Chilexpress)
// ============================================

export interface ShippingLabelRequest {
  transactionId: string;
  // Dirección de origen (vendedor)
  originAddress: string; // Nombre de la calle
  originStreetNumber: number; // Número de calle
  originCountyCode: string; // Código comuna Chilexpress (ej: "STGO", "PROV")
  originSupplement?: string; // Depto, oficina, etc.
  // Datos del remitente
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  // Datos del paquete
  packageWeight: number; // kg
  packageHeight: number; // cm
  packageWidth: number; // cm
  packageLength: number; // cm
  packageContent?: string;
  declaredValue?: number;
  // Entrega en sucursal (opcional)
  deliveryOnCommercialOffice?: boolean;
  commercialOfficeId?: string;
}

export interface ShippingLabel {
  success: boolean;
  transportOrderNumber?: string;
  barcode?: string;
  trackingUrl?: string;
  labelUrl?: string;
  labelBase64?: string;
  labelType?: string;
  error?: string;
}

export interface ShippingQuote {
  serviceType: string;
  serviceName: string;
  deliveryTime: string;
  price: number;
}

export interface CoverageArea {
  countyCode: string;
  countyName: string;
  regionCode: string;
  regionName: string;
  hasPickup: boolean;
  hasDelivery: boolean;
}

export interface TrackingEvent {
  date: string;
  description: string;
  location: string;
}

export interface TrackingInfo {
  status: string;
  events: TrackingEvent[];
}

export const shippingApi = {
  /**
   * Generate shipping label for a transaction (seller only)
   */
  generateLabel: async (data: ShippingLabelRequest) => {
    const response = await api.post<ShippingLabel>('/shipping/label', data);
    return response.data;
  },

  /**
   * Get existing shipping label for a transaction
   */
  getLabel: async (transactionId: string) => {
    const response = await api.get<ShippingLabel>(`/shipping/label/${transactionId}`);
    return response.data;
  },

  /**
   * Get coverage areas (comunas) for shipping
   */
  getCoverageAreas: async (regionCode?: string) => {
    const response = await api.get<CoverageArea[]>('/shipping/coverage', {
      params: regionCode ? { regionCode } : undefined,
    });
    return response.data;
  },

  /**
   * Calculate shipping quote
   */
  calculateQuote: async (
    originCountyCode: string,
    destinationCountyCode: string,
    weight: number,
    height: number,
    width: number,
    length: number,
  ) => {
    const response = await api.post<ShippingQuote[]>('/shipping/quote', {
      originCountyCode,
      destinationCountyCode,
      weight,
      height,
      width,
      length,
    });
    return response.data;
  },

  /**
   * Track shipment by tracking number
   */
  trackShipment: async (trackingNumber: string) => {
    const response = await api.get<TrackingInfo>(`/shipping/track/${trackingNumber}`);
    return response.data;
  },
};

export default api;
