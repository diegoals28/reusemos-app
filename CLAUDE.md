# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

REUSEMOS is a mobile marketplace for buying, selling, and trading second-hand products. The platform includes real-time chat, protected payments (Mercado Pago), user ratings, and environmental impact tracking.

## Repository Structure

```
reusemos-app/
├── backend/          # NestJS API server
├── mobile/           # React Native (Expo) mobile app
└── docs/             # Technical documentation
```

## Development Commands

### Backend (from `backend/` directory)

```bash
npm run start:dev         # Start dev server with hot reload
npm run build             # Build for production
npm run start:prod        # Run production build
npm run test              # Run unit tests
npm run test:watch        # Run tests in watch mode
npm run test:e2e          # Run e2e tests
npm run lint              # Lint and fix
npm run db:generate       # Generate Prisma client
npm run db:migrate        # Run database migrations (dev)
npm run db:migrate:prod   # Run migrations (production)
npm run db:seed           # Seed database
npm run db:studio         # Open Prisma Studio
```

### Mobile (from `mobile/` directory)

```bash
npm run start             # Start Expo dev server
npm run android           # Start on Android
npm run ios               # Start on iOS
npm run lint              # Lint TypeScript files
npm run lint:fix          # Lint and fix
npm run type-check        # TypeScript type checking
npm run test              # Run Jest tests
npm run test:watch        # Run tests in watch mode
```

## Architecture

### Backend (NestJS)

The backend uses a modular NestJS architecture with Prisma ORM:

- **Core modules**: `DatabaseModule` (Prisma), `GatewaysModule` (WebSocket)
- **Feature modules**: Auth, Users, Products, Categories, Conversations, Messages, Transactions, Reviews, Notifications, Reports, Badges, Uploads, Offers, Payments
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.io for chat and notifications
- **External services**: Cloudinary (images), Mercado Pago (payments), Firebase (push notifications)

Module path: `backend/src/modules/{module-name}/{module-name}.module.ts`

### Mobile (React Native + Expo)

- **State management**: Zustand for auth state (`mobile/src/stores/authStore.ts`), React Query for server state
- **Navigation**: React Navigation with native stack and bottom tabs (`mobile/src/navigation/index.tsx`)
- **API layer**: Axios with interceptors for auth token handling (`mobile/src/services/api.ts`)
- **Path alias**: `@/` maps to `mobile/src/`

Key directories:
- `screens/` - Screen components organized by feature (auth, home, chat, profile, checkout, transactions)
- `components/` - Reusemosble UI components (common, product)
- `hooks/` - Custom hooks (useSocket, useChat, useNotifications, useLocation, useDebounce, useImagePicker)
- `services/` - API services and push notifications
- `stores/` - Zustand stores
- `utils/` - Helper functions (formatters, validators, environmental calculations)

### Database Schema

The Prisma schema (`backend/prisma/schema.prisma`) defines:

- **Users**: User profiles with auth providers, devices, ratings, environmental impact metrics
- **Products**: Listings with images, categories, conditions, trade preferences
- **Conversations/Messages**: Real-time chat with support for text, images, offers, and trade proposals
- **Transactions**: Sales/trades with payment tracking, shipping, and dispute handling
- **Reviews**: User ratings with transaction verification
- **Badges**: Achievement system based on user activity

### Key Enums

Product conditions: `NEW_WITH_TAGS`, `LIKE_NEW`, `GOOD`, `ACCEPTABLE`
Product status: `DRAFT`, `ACTIVE`, `RESERVED`, `SOLD`, `TRADED`, `DELETED`, `REMOVED`
Transaction types: `SALE`, `TRADE`, `TRADE_WITH_CASH`
Transaction status: `PENDING` → `PAID` → `SHIPPED` → `DELIVERED` → `COMPLETED` (or `CANCELLED`, `DISPUTED`, `REFUNDED`)
Message types: `TEXT`, `IMAGE`, `OFFER`, `TRADE_PROPOSAL`, `SYSTEM`

### WebSocket Events (Chat Gateway)

The chat gateway (`backend/src/gateways/chat.gateway.ts`) uses namespace `/chat`:

**Client → Server:**
- `message:send` - Send a message: `{ conversationId, content, type? }`
- `message:read` - Mark messages as read: `{ conversationId, messageIds? }`
- `typing:start` / `typing:stop` - Typing indicators: `{ conversationId }`
- `conversation:join` / `conversation:leave` - Room management: `{ conversationId }`

**Server → Client:**
- `message:new` - New message received: `{ message, conversationId }`
- `message:read` - Messages read notification: `{ conversationId, readBy, readAt }`
- `typing:start` / `typing:stop` - Other user typing: `{ conversationId, userId, user? }`
- `user:online` / `user:offline` - User presence: `{ userId }`

## Navigation Flow

1. **Auth flow**: Welcome → Login/Register → Onboarding (Interests → Location) → Main App
2. **Main tabs**: Home, Search, Publish (modal), Chat, Profile
3. **Purchase flow**: Product Detail → Chat → Make Offer → Checkout → Payment → Success

## Dev Mode

The mobile app has a `DEV_SKIP_AUTH` flag in `mobile/src/stores/authStore.ts` that bypasses authentication for local testing. Set to `false` before production builds.

## Environment Variables

Backend requires: `DATABASE_URL`, Cloudinary credentials, Mercado Pago keys, Firebase config, JWT secrets, `THROTTLE_TTL`, `THROTTLE_LIMIT`

Mobile requires: `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WS_URL` (defaults in `mobile/src/constants/index.ts`)

## Testing

- Backend: Jest for unit tests, Supertest for integration tests
- Mobile: Jest with jest-expo preset
- Test files: `*.spec.ts` (backend), standard Jest patterns (mobile)
- Run single test: `npm run test -- --testPathPattern="filename"`
