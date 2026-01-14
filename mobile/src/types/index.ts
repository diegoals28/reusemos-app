// ============================================
// REUSA - Type Definitions
// ============================================

// User Types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string | null;
  phoneNumber?: string;
  phoneVerified?: boolean;
  location?: Location;
  city?: string;
  country?: string;
  status?: UserStatus;
  verificationStatus?: VerificationStatus;
  rating?: number;
  ratingAvg?: number;
  ratingCount?: number;
  salesCount?: number;
  purchasesCount?: number;
  tradesCount?: number;
  impact?: UserImpact;
  badges?: Badge[];
  createdAt: string;
  isNew?: boolean; // True if user just registered via OAuth
  phone?: string;
  isVerified?: boolean;
  productsCount?: number;
  reviewCount?: number;
  environmentalImpact?: UserImpact;
}

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED';

export interface UserImpact {
  co2Saved: number;
  waterSaved: number;
  itemsReused: number;
}

export interface Location {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
}

// Product Types
export interface Product {
  id: string;
  userId: string;
  user?: UserPreview;
  categoryId: string;
  category?: Category;
  title: string;
  description: string;
  condition: ProductCondition;
  price?: number;
  acceptsTrade: boolean;
  tradePreferences?: string;
  location?: Location;
  deliveryOption: DeliveryOption;
  shippingCost?: number;
  attributes?: Record<string, string>;
  status: ProductStatus;
  images: ProductImage[];
  viewsCount: number;
  favoritesCount: number;
  isFavorite?: boolean;
  impact?: ProductImpact;
  brand?: string;
  size?: string;
  publishedAt?: string;
  createdAt: string;
}

export type ProductCondition = 'NEW_WITH_TAGS' | 'LIKE_NEW' | 'GOOD' | 'ACCEPTABLE';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'RESERVED' | 'SOLD' | 'TRADED' | 'DELETED' | 'REMOVED';
export type DeliveryOption = 'PICKUP' | 'SHIPPING' | 'BOTH';

export interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl?: string;
  order: number;
}

export interface ProductImpact {
  co2: number;
  water: number;
}

export interface UserPreview {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  rating?: number;
  ratingAvg?: number;
  ratingCount?: number;
  isOnline?: boolean;
  location?: {
    city?: string;
    country?: string;
  };
  badges?: Badge[];
  bankDetails?: {
    bank?: string;
    accountType?: string;
    accountNumber?: string;
    cbu?: string;
    alias?: string;
  };
}

// Category Types
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parentId?: string;
  children?: Category[];
}

// Conversation & Message Types
export interface Conversation {
  id: string;
  product: ProductPreview;
  otherUser: UserPreview;
  buyer?: UserPreview;
  seller?: UserPreview;
  participants?: UserPreview[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPreview {
  id: string;
  title: string;
  price?: number;
  image?: string;
  images?: string[];
  status: ProductStatus;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content?: string;
  imageUrl?: string;
  metadata?: OfferMetadata | TradeProposalMetadata;
  readAt?: string;
  createdAt: string;
}

export type MessageType = 'TEXT' | 'IMAGE' | 'OFFER' | 'TRADE_PROPOSAL' | 'SYSTEM';

export interface OfferMetadata {
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface TradeProposalMetadata {
  offeredProductId: string;
  offeredProduct?: ProductPreview;
  cashDifference?: number;
  status: 'pending' | 'accepted' | 'rejected';
}

// Transaction Types
export interface Transaction {
  id: string;
  productId?: string;
  product: ProductPreview;
  buyerId?: string;
  buyer: UserPreview;
  sellerId?: string;
  seller: UserPreview;
  conversationId?: string;
  type: TransactionType;
  status: TransactionStatus;
  amount?: number;
  productPrice?: number;
  agreedPrice?: number;
  shippingCost?: number;
  serviceFee?: number;
  totalAmount?: number;
  tradeProduct?: ProductPreview;
  tradeCashDifference?: number;
  deliveryOption: DeliveryOption;
  deliveryMethod?: 'pickup' | 'shipping';
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  shippingCountyCode?: string;
  paymentMethod?: 'mercadopago' | 'transfer' | 'cash';
  trackingNumber?: string;
  trackingUrl?: string;
  // Chilexpress shipping fields
  shippingOrderNumber?: string;
  shippingBarcode?: string;
  shippingLabelUrl?: string;
  shippingCarrier?: string;
  impact?: ProductImpact;
  review?: Review;
  paymentUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export type TransactionType = 'SALE' | 'TRADE' | 'TRADE_WITH_CASH';
export type TransactionStatus =
  | 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED' | 'REFUNDED'
  | 'pending' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'disputed' | 'refunded';

// Review Types
export interface Review {
  id: string;
  transactionId: string;
  reviewer: UserPreview;
  rating: number;
  comment?: string;
  accurateDescription?: boolean;
  friendlySeller?: boolean;
  fastResponses?: boolean;
  createdAt: string;
}

// Badge Types
export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color?: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  referenceType?: string;
  referenceId?: string;
  readAt?: string;
  createdAt: string;
}

export type NotificationType =
  | 'NEW_MESSAGE'
  | 'NEW_OFFER'
  | 'TRADE_PROPOSAL'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'TRADE_ACCEPTED'
  | 'TRADE_REJECTED'
  | 'PRODUCT_SOLD'
  | 'NEW_REVIEW'
  | 'NEW_FAVORITE'
  | 'SYSTEM';

// API Types
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface ProductForm {
  title: string;
  description: string;
  categoryId: string;
  condition: ProductCondition;
  price?: number;
  acceptsTrade: boolean;
  tradePreferences?: string;
  deliveryOption: DeliveryOption;
  images: string[]; // URIs
}

export interface ProductFilters {
  categoryId?: string;
  condition?: ProductCondition | ProductCondition[];
  priceMin?: number;
  priceMax?: number;
  acceptsTrade?: boolean;
  deliveryOption?: DeliveryOption;
  location?: Location;
  radius?: number; // km
  sortBy?: 'recent' | 'price_asc' | 'price_desc' | 'distance' | 'relevance';
  q?: string; // search query
}
