# REUSA - Especificación Técnica

> Documento técnico completo para el desarrollo del MVP

---

## Índice

1. [Resumen del Sistema](#1-resumen-del-sistema)
2. [Arquitectura General](#2-arquitectura-general)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [API REST - Endpoints](#4-api-rest---endpoints)
5. [WebSocket - Eventos](#5-websocket---eventos)
6. [Autenticación y Autorización](#6-autenticación-y-autorización)
7. [Gestión de Archivos](#7-gestión-de-archivos)
8. [Pagos y Transacciones](#8-pagos-y-transacciones)
9. [Notificaciones Push](#9-notificaciones-push)
10. [Cálculo de Impacto Ambiental](#10-cálculo-de-impacto-ambiental)
11. [Seguridad](#11-seguridad)
12. [Performance y Caché](#12-performance-y-caché)
13. [Monitoreo y Logging](#13-monitoreo-y-logging)
14. [Deployment](#14-deployment)
15. [Testing](#15-testing)

---

## 1. Resumen del Sistema

### 1.1 Descripción
Reusa es un marketplace móvil que permite a usuarios comprar, vender e intercambiar productos de segunda mano. La plataforma incluye chat en tiempo real, pagos protegidos, sistema de reputación y métricas de impacto ambiental.

### 1.2 Actores del Sistema
| Actor | Descripción |
|-------|-------------|
| **Usuario** | Puede comprar, vender, intercambiar productos |
| **Vendedor** | Usuario que publica productos (mismo usuario) |
| **Comprador** | Usuario que adquiere productos (mismo usuario) |
| **Moderador** | Revisa reportes y contenido (panel admin) |
| **Sistema** | Procesos automáticos (notificaciones, cálculos) |

### 1.3 Casos de Uso Principales
1. Registro e inicio de sesión
2. Publicar producto
3. Buscar y filtrar productos
4. Iniciar conversación sobre producto
5. Realizar oferta de compra
6. Proponer trueque
7. Completar transacción
8. Dejar valoración
9. Ver impacto ambiental

---

## 2. Arquitectura General

### 2.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTES                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐            │
│    │   iOS App    │    │ Android App  │    │  Admin Web   │            │
│    │ React Native │    │ React Native │    │    React     │            │
│    └──────────────┘    └──────────────┘    └──────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS / WSS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           LOAD BALANCER                                 │
│                         (AWS ALB / Nginx)                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      NestJS Application                          │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │  Auth   │ │  Users  │ │Products │ │  Chat   │ │  Trans  │   │   │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │ │ Module  │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  │                                                                  │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │              WebSocket Gateway (Socket.io)               │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌───────────────────────┐ ┌───────────────┐ ┌───────────────────────┐
│      PostgreSQL       │ │     Redis     │ │      Cloudinary       │
│    (Primary DB)       │ │(Cache/Queue)  │ │   (Image Storage)     │
└───────────────────────┘ └───────────────┘ └───────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌───────────────────────┐ ┌───────────────┐ ┌───────────────────────┐
│    Mercado Pago       │ │    Firebase   │ │   Shipping APIs       │
│     (Payments)        │ │(Push & Auth)  │ │(Andreani, OCA, etc)   │
└───────────────────────┘ └───────────────┘ └───────────────────────┘
```

### 2.2 Patrones de Arquitectura
- **Backend**: Arquitectura modular (NestJS modules)
- **API**: RESTful + WebSocket para tiempo real
- **Base de datos**: PostgreSQL con Prisma ORM
- **Caché**: Redis para sesiones, rate limiting y caché de queries
- **Almacenamiento**: Cloudinary para imágenes (CDN incluido)

---

## 3. Stack Tecnológico

### 3.1 Frontend (Mobile)
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React Native | 0.73.x | Framework móvil |
| Expo | 50.x | Tooling y builds |
| TypeScript | 5.3.x | Type safety |
| React Navigation | 6.x | Navegación |
| Zustand | 4.x | Estado global |
| React Query | 5.x | Server state |
| Socket.io Client | 4.x | WebSocket |
| Zod | 3.x | Validación |
| React Hook Form | 7.x | Formularios |

### 3.2 Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 20.x LTS | Runtime |
| NestJS | 10.x | Framework |
| TypeScript | 5.3.x | Type safety |
| Prisma | 5.x | ORM |
| PostgreSQL | 15.x | Base de datos |
| Redis | 7.x | Caché |
| Socket.io | 4.x | WebSocket |
| Passport | 0.7.x | Autenticación |
| Swagger | 7.x | Documentación API |

### 3.3 Servicios Externos
| Servicio | Uso |
|----------|-----|
| Cloudinary | Almacenamiento y CDN de imágenes |
| Mercado Pago | Procesamiento de pagos |
| Firebase Auth | OAuth (Google Sign-In) |
| Firebase FCM | Notificaciones push |
| SendGrid | Emails transaccionales |
| Sentry | Monitoreo de errores |

---

## 4. API REST - Endpoints

### 4.1 Autenticación (`/api/auth`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Registrar usuario | No |
| POST | `/login` | Login con email/password | No |
| POST | `/google` | Login con Google | No |
| POST | `/apple` | Login con Apple | No |
| POST | `/refresh` | Refrescar token | No |
| POST | `/forgot-password` | Solicitar reset | No |
| POST | `/reset-password` | Resetear password | No |
| POST | `/logout` | Cerrar sesión | Sí |
| GET | `/me` | Usuario actual | Sí |

**Request: POST /register**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "maria_lopez",
  "displayName": "María López"
}
```

**Response: 201 Created**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "maria_lopez",
    "displayName": "María López",
    "avatarUrl": null,
    "ratingAvg": 0,
    "ratingCount": 0,
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 4.2 Usuarios (`/api/users`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/me` | Mi perfil completo | Sí |
| PATCH | `/me` | Actualizar mi perfil | Sí |
| PATCH | `/me/avatar` | Actualizar avatar | Sí |
| PATCH | `/me/location` | Actualizar ubicación | Sí |
| PATCH | `/me/interests` | Actualizar intereses | Sí |
| POST | `/me/devices` | Registrar dispositivo | Sí |
| GET | `/:id` | Ver perfil de usuario | No |
| GET | `/:id/products` | Productos de usuario | No |
| GET | `/:id/reviews` | Reviews de usuario | No |

### 4.3 Productos (`/api/products`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/` | Listar productos | No |
| GET | `/search` | Buscar productos | No |
| GET | `/nearby` | Productos cercanos | No |
| GET | `/recent` | Productos recientes | No |
| GET | `/me` | Mis productos | Sí |
| GET | `/favorites` | Mis favoritos | Sí |
| GET | `/:id` | Detalle de producto | No |
| POST | `/` | Crear producto | Sí |
| PATCH | `/:id` | Actualizar producto | Sí |
| DELETE | `/:id` | Eliminar producto | Sí |
| POST | `/:id/favorite` | Toggle favorito | Sí |
| POST | `/:id/report` | Reportar producto | Sí |

**Request: POST /products**
```json
{
  "title": "Campera de cuero vintage",
  "description": "Campera en excelente estado...",
  "categoryId": "uuid-categoria",
  "condition": "GOOD",
  "price": 2500,
  "acceptsTrade": true,
  "tradePreferences": "Ropa talle M, zapatillas 38",
  "deliveryOption": "BOTH"
}
// + images[] como multipart/form-data
```

**Query Parameters: GET /products**
```
?categoryId=uuid
&condition=GOOD,LIKE_NEW
&priceMin=100
&priceMax=5000
&acceptsTrade=true
&lat=-34.6037
&lng=-58.3816
&radius=25
&sortBy=recent|price_asc|price_desc|distance
&page=1
&limit=20
```

### 4.4 Categorías (`/api/categories`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/` | Listar categorías | No |
| GET | `/:id` | Detalle de categoría | No |

### 4.5 Conversaciones (`/api/conversations`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/` | Mis conversaciones | Sí |
| POST | `/` | Crear/obtener conversación | Sí |
| GET | `/:id` | Detalle conversación | Sí |
| GET | `/:id/messages` | Mensajes de conversación | Sí |
| POST | `/:id/messages` | Enviar mensaje | Sí |
| POST | `/:id/read` | Marcar como leídos | Sí |

**Request: POST /conversations/:id/messages (Oferta)**
```json
{
  "type": "OFFER",
  "content": "Puedo retirar hoy mismo",
  "metadata": {
    "amount": 2000,
    "status": "pending"
  }
}
```

**Request: POST /conversations/:id/messages (Trueque)**
```json
{
  "type": "TRADE_PROPOSAL",
  "content": "Te ofrezco estas zapatillas",
  "metadata": {
    "offeredProductId": "uuid",
    "cashDifference": 500,
    "status": "pending"
  }
}
```

### 4.6 Transacciones (`/api/transactions`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/` | Mis transacciones | Sí |
| GET | `/:id` | Detalle transacción | Sí |
| POST | `/` | Iniciar compra | Sí |
| POST | `/:id/confirm` | Confirmar recepción | Sí |
| POST | `/:id/cancel` | Cancelar | Sí |
| POST | `/:id/dispute` | Abrir disputa | Sí |

### 4.7 Reviews (`/api/reviews`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/` | Crear review | Sí |

**Request: POST /reviews**
```json
{
  "transactionId": "uuid",
  "rating": 5,
  "comment": "Excelente vendedor!",
  "accurateDescription": true,
  "friendlySeller": true,
  "fastResponses": true
}
```

### 4.8 Notificaciones (`/api/notifications`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/` | Mis notificaciones | Sí |
| GET | `/unread-count` | Contador no leídas | Sí |
| PATCH | `/:id/read` | Marcar como leída | Sí |
| POST | `/read-all` | Marcar todas leídas | Sí |

### 4.9 Uploads (`/api/uploads`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/image` | Subir imagen | Sí |

---

## 5. WebSocket - Eventos

### 5.1 Conexión
```javascript
// Cliente
const socket = io('wss://api.reusa.app', {
  auth: { token: 'jwt-token' }
});

// Eventos de conexión
socket.on('connect', () => console.log('Connected'));
socket.on('disconnect', () => console.log('Disconnected'));
socket.on('error', (error) => console.error(error));
```

### 5.2 Eventos de Chat

**Cliente → Servidor**
| Evento | Payload | Descripción |
|--------|---------|-------------|
| `join_conversation` | `{ conversationId }` | Unirse a sala |
| `leave_conversation` | `{ conversationId }` | Salir de sala |
| `send_message` | `{ conversationId, type, content, metadata? }` | Enviar mensaje |
| `typing_start` | `{ conversationId }` | Empezó a escribir |
| `typing_stop` | `{ conversationId }` | Dejó de escribir |
| `mark_read` | `{ conversationId, messageId }` | Marcar leído |

**Servidor → Cliente**
| Evento | Payload | Descripción |
|--------|---------|-------------|
| `new_message` | `Message` | Nuevo mensaje |
| `message_read` | `{ messageId, readAt }` | Mensaje leído |
| `user_typing` | `{ conversationId, userId }` | Usuario escribiendo |
| `user_stopped_typing` | `{ conversationId, userId }` | Usuario dejó de escribir |
| `offer_response` | `{ messageId, status }` | Respuesta a oferta |

### 5.3 Eventos de Notificaciones

**Servidor → Cliente**
| Evento | Payload | Descripción |
|--------|---------|-------------|
| `notification` | `Notification` | Nueva notificación |
| `unread_count` | `{ count }` | Actualización contador |

---

## 6. Autenticación y Autorización

### 6.1 Flujo de Autenticación JWT

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Cliente │         │   API   │         │   DB    │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ POST /auth/login  │                   │
     │──────────────────>│                   │
     │                   │  Validar user     │
     │                   │──────────────────>│
     │                   │<──────────────────│
     │                   │                   │
     │                   │ Generar JWT       │
     │                   │                   │
     │ { token, refresh} │                   │
     │<──────────────────│                   │
     │                   │                   │
     │ GET /products     │                   │
     │ Authorization:    │                   │
     │ Bearer <token>    │                   │
     │──────────────────>│                   │
     │                   │ Validar JWT       │
     │                   │                   │
     │     Response      │                   │
     │<──────────────────│                   │
```

### 6.2 Estructura del JWT

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "iat": 1705312000,
    "exp": 1705916800
  }
}
```

### 6.3 Refresh Token Flow

1. Access token expira (7 días por defecto)
2. Cliente envía refresh token a `/auth/refresh`
3. Servidor valida refresh token
4. Servidor genera nuevo par de tokens
5. Cliente actualiza tokens en storage

### 6.4 OAuth Providers

**Google Sign-In:**
1. App obtiene `idToken` de Google SDK
2. Backend verifica token con Google API
3. Extrae email y crea/encuentra usuario
4. Genera JWT propio

**Apple Sign-In:**
1. App obtiene `identityToken` de Apple
2. Backend verifica con Apple's public keys
3. Extrae email (primera vez) o user ID
4. Genera JWT propio

---

## 7. Gestión de Archivos

### 7.1 Flujo de Upload de Imágenes

```
┌─────────┐         ┌─────────┐         ┌───────────┐
│ Cliente │         │   API   │         │Cloudinary │
└────┬────┘         └────┬────┘         └─────┬─────┘
     │                   │                    │
     │ Selecciona imagen │                    │
     │ (max 10MB)        │                    │
     │                   │                    │
     │ POST /uploads     │                    │
     │ multipart/form    │                    │
     │──────────────────>│                    │
     │                   │                    │
     │                   │ Validar tipo/size  │
     │                   │ Comprimir (Sharp)  │
     │                   │                    │
     │                   │ Upload             │
     │                   │───────────────────>│
     │                   │                    │
     │                   │ { url, thumbnail } │
     │                   │<───────────────────│
     │                   │                    │
     │ { url, thumbnail }│                    │
     │<──────────────────│                    │
```

### 7.2 Configuración de Imágenes

```typescript
const imageConfig = {
  maxSizeMB: 10,
  maxImages: 8,
  formats: ['jpeg', 'png', 'webp'],
  transformations: {
    product: {
      width: 1200,
      height: 900,
      crop: 'limit',
      quality: 80,
    },
    thumbnail: {
      width: 400,
      height: 300,
      crop: 'fill',
      quality: 70,
    },
    avatar: {
      width: 200,
      height: 200,
      crop: 'fill',
      gravity: 'face',
      quality: 80,
    },
  },
};
```

---

## 8. Pagos y Transacciones

### 8.1 Flujo de Compra con Mercado Pago

```
┌─────────┐       ┌─────────┐       ┌────────────┐       ┌──────────┐
│Comprador│       │   API   │       │MercadoPago │       │ Vendedor │
└────┬────┘       └────┬────┘       └─────┬──────┘       └────┬─────┘
     │                 │                  │                   │
     │ POST /trans     │                  │                   │
     │────────────────>│                  │                   │
     │                 │                  │                   │
     │                 │ Crear preference │                   │
     │                 │─────────────────>│                   │
     │                 │                  │                   │
     │                 │ preferenceId     │                   │
     │                 │<─────────────────│                   │
     │                 │                  │                   │
     │ checkoutUrl     │                  │                   │
     │<────────────────│                  │                   │
     │                 │                  │                   │
     │ Pago en MP SDK  │                  │                   │
     │────────────────────────────────────>│                   │
     │                 │                  │                   │
     │                 │  Webhook: paid   │                   │
     │                 │<─────────────────│                   │
     │                 │                  │                   │
     │                 │ Actualiza status │                   │
     │                 │ Notifica ambos   │                   │
     │                 │──────────────────────────────────────>│
     │ Push: Pagado    │                  │   Push: Vendiste  │
     │<────────────────│                  │                   │
```

### 8.2 Estados de Transacción

```
PENDING ──────> PAID ──────> SHIPPED ──────> DELIVERED ──────> COMPLETED
    │             │             │                │
    │             │             │                └──> DISPUTED
    │             │             │
    └─────────────┴─────────────┴──────────────────> CANCELLED
                                                          │
                                                          └──> REFUNDED
```

### 8.3 Cálculo de Montos

```typescript
function calculateTransaction(product: Product, deliveryOption: DeliveryOption) {
  const productPrice = product.price;
  const shippingCost = deliveryOption === 'SHIPPING' ? calculateShipping(product) : 0;
  const serviceFee = productPrice * 0.05; // 5% comisión
  const totalAmount = productPrice + shippingCost + serviceFee;
  const sellerPayout = productPrice - (productPrice * 0.05); // Vendedor recibe 95%

  return {
    productPrice,
    shippingCost,
    serviceFee,
    totalAmount,
    sellerPayout,
  };
}
```

---

## 9. Notificaciones Push

### 9.1 Tipos de Notificaciones

| Tipo | Título | Cuerpo | Acción |
|------|--------|--------|--------|
| NEW_MESSAGE | "Nuevo mensaje" | "{user} te escribió sobre {product}" | Abrir chat |
| NEW_OFFER | "Nueva oferta" | "{user} te ofreció ${amount}" | Abrir chat |
| TRADE_PROPOSAL | "Propuesta de trueque" | "{user} quiere intercambiar" | Abrir propuesta |
| OFFER_ACCEPTED | "Oferta aceptada" | "Tu oferta fue aceptada" | Abrir transacción |
| PRODUCT_SOLD | "Vendiste!" | "{product} fue vendido" | Abrir transacción |
| NEW_REVIEW | "Nueva valoración" | "{user} te dejó {rating} estrellas" | Ver perfil |
| NEW_FAVORITE | "Nuevo favorito" | "Tu {product} tiene nuevos favoritos" | Ver producto |

### 9.2 Implementación FCM

```typescript
// Servicio de notificaciones
async sendPushNotification(
  userId: string,
  notification: {
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, string>;
  }
) {
  // Obtener tokens de dispositivos del usuario
  const devices = await this.prisma.userDevice.findMany({
    where: { userId, isActive: true },
  });

  if (devices.length === 0) return;

  const tokens = devices.map(d => d.deviceToken);

  // Enviar via FCM
  const message = {
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: {
      type: notification.type,
      ...notification.data,
    },
    tokens,
  };

  await admin.messaging().sendMulticast(message);

  // Guardar en DB
  await this.prisma.notification.create({
    data: {
      userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      pushSentAt: new Date(),
    },
  });
}
```

---

## 10. Cálculo de Impacto Ambiental

### 10.1 Fórmulas de Cálculo

```typescript
function calculateImpact(product: Product, category: Category) {
  // Peso estimado del producto
  const weight = product.estimatedWeightKg || category.avgWeightKg;

  // CO2 evitado (kg)
  // Factores basados en estudios de ciclo de vida de productos
  const co2Saved = weight * category.co2FactorPerKg;

  // Agua ahorrada (litros)
  // Basado en huella hídrica de producción
  const waterSaved = weight * category.waterFactorPerKg;

  return {
    co2Saved: Math.round(co2Saved * 10) / 10,  // 1 decimal
    waterSaved: Math.round(waterSaved),         // entero
  };
}
```

### 10.2 Factores por Categoría

| Categoría | Peso Prom (kg) | CO2 (kg/kg) | Agua (L/kg) |
|-----------|----------------|-------------|-------------|
| Ropa | 0.5 | 10.0 | 2,700 |
| Electrónica | 0.8 | 50.0 | 5,000 |
| Hogar | 2.0 | 5.0 | 1,500 |
| Libros | 0.4 | 2.5 | 800 |
| Deportes | 1.5 | 8.0 | 2,000 |
| Niños | 0.6 | 8.0 | 2,500 |

### 10.3 Actualización de Métricas

```typescript
// Al completar transacción
async onTransactionCompleted(transaction: Transaction) {
  const product = await this.prisma.product.findUnique({
    where: { id: transaction.productId },
    include: { category: true },
  });

  const impact = calculateImpact(product, product.category);

  // Actualizar transacción
  await this.prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      impactCO2: impact.co2Saved,
      impactWater: impact.waterSaved,
    },
  });

  // Actualizar usuarios
  await Promise.all([
    this.prisma.user.update({
      where: { id: transaction.buyerId },
      data: {
        impactCO2Saved: { increment: impact.co2Saved },
        impactWaterSaved: { increment: impact.waterSaved },
        impactItemsReused: { increment: 1 },
      },
    }),
    this.prisma.user.update({
      where: { id: transaction.sellerId },
      data: {
        impactCO2Saved: { increment: impact.co2Saved },
        impactWaterSaved: { increment: impact.waterSaved },
        impactItemsReused: { increment: 1 },
      },
    }),
  ]);

  // Actualizar métricas globales
  await this.updateGlobalMetrics(impact);
}
```

---

## 11. Seguridad

### 11.1 Headers de Seguridad (Helmet)

```typescript
// Configuración de Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'https://res.cloudinary.com'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

### 11.2 Rate Limiting

```typescript
// Configuración por endpoint
const rateLimits = {
  global: { ttl: 60000, limit: 100 },  // 100 req/min global
  auth: { ttl: 60000, limit: 5 },      // 5 intentos login/min
  upload: { ttl: 60000, limit: 10 },   // 10 uploads/min
  search: { ttl: 1000, limit: 10 },    // 10 búsquedas/seg
};
```

### 11.3 Validación de Input

```typescript
// Ejemplo de DTO con validación
export class CreateProductDto {
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  @Transform(({ value }) => sanitizeHtml(value))
  title: string;

  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => sanitizeHtml(value))
  description: string;

  @IsNumber()
  @Min(0)
  @Max(10000000)
  @IsOptional()
  price?: number;
}
```

### 11.4 Protección contra Ataques Comunes

| Ataque | Mitigación |
|--------|------------|
| SQL Injection | Prisma ORM (queries parametrizadas) |
| XSS | Sanitización de inputs, CSP headers |
| CSRF | JWT en headers (no cookies) |
| Brute Force | Rate limiting, bloqueo temporal |
| File Upload | Validación de tipo, tamaño, escaneo |

---

## 12. Performance y Caché

### 12.1 Estrategia de Caché con Redis

```typescript
// Configuración de caché
const cacheConfig = {
  categories: { ttl: 3600, key: 'categories:all' },
  product: { ttl: 300, key: 'product:{id}' },
  userProfile: { ttl: 600, key: 'user:{id}:profile' },
  searchResults: { ttl: 60, key: 'search:{hash}' },
  globalMetrics: { ttl: 300, key: 'metrics:global' },
};
```

### 12.2 Índices de Base de Datos

```sql
-- Índices críticos para performance
CREATE INDEX idx_products_search ON products
  USING GIN (to_tsvector('spanish', title || ' ' || description));

CREATE INDEX idx_products_location ON products
  USING GIST (ll_to_earth(location_lat, location_lng));

CREATE INDEX idx_products_status_created ON products (status, created_at DESC);

CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at DESC);
```

### 12.3 Paginación Eficiente

```typescript
// Cursor-based pagination para listas largas
async getProducts(cursor?: string, limit = 20) {
  const products = await this.prisma.product.findMany({
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    where: { status: 'ACTIVE' },
  });

  const hasMore = products.length > limit;
  const data = hasMore ? products.slice(0, -1) : products;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor, hasMore };
}
```

---

## 13. Monitoreo y Logging

### 13.1 Logging Estructurado

```typescript
// Configuración de Winston
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

// Ejemplo de log
logger.info('Transaction completed', {
  transactionId: transaction.id,
  type: transaction.type,
  amount: transaction.totalAmount,
  buyerId: transaction.buyerId,
  sellerId: transaction.sellerId,
});
```

### 13.2 Métricas de Aplicación

```typescript
// Métricas a trackear
const metrics = {
  // HTTP
  http_requests_total: Counter,
  http_request_duration_seconds: Histogram,

  // Business
  products_created_total: Counter,
  transactions_completed_total: Counter,
  transactions_amount_total: Counter,
  messages_sent_total: Counter,

  // WebSocket
  ws_connections_active: Gauge,
  ws_messages_total: Counter,
};
```

### 13.3 Health Checks

```typescript
// Endpoint: GET /health
async healthCheck() {
  const checks = await Promise.all([
    this.checkDatabase(),
    this.checkRedis(),
    this.checkCloudinary(),
  ]);

  const healthy = checks.every(c => c.status === 'healthy');

  return {
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
  };
}
```

---

## 14. Deployment

### 14.1 Arquitectura de Infraestructura (AWS)

```
┌─────────────────────────────────────────────────────────────┐
│                         Route 53                            │
│                      (DNS + Health)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     CloudFront (CDN)                        │
│                   (Static + API Cache)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Application Load Balancer                  │
│                     (SSL Termination)                       │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│     ECS Fargate         │     │     ECS Fargate         │
│   (API Container x2)    │     │  (Worker Container x1)  │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   RDS Postgres  │ │   ElastiCache   │ │       S3        │
│   (Multi-AZ)    │ │     (Redis)     │ │   (Backups)     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 14.2 Variables de Entorno por Ambiente

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| NODE_ENV | development | staging | production |
| LOG_LEVEL | debug | info | warn |
| THROTTLE_LIMIT | 1000 | 200 | 100 |
| JWT_EXPIRES | 30d | 7d | 7d |

### 14.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main, staging]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t reusa-api .
      - run: docker push $ECR_REGISTRY/reusa-api:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: aws ecs update-service --cluster reusa --service api --force-new-deployment
```

---

## 15. Testing

### 15.1 Estrategia de Testing

| Tipo | Cobertura | Herramienta |
|------|-----------|-------------|
| Unit Tests | 80% | Jest |
| Integration Tests | Endpoints críticos | Supertest |
| E2E Tests | Flujos principales | Detox (mobile) |
| Load Tests | 1000 usuarios | k6 |

### 15.2 Ejemplo de Test Unitario

```typescript
// auth.service.spec.ts
describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService, PrismaService, JwtService],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('register', () => {
    it('should create user and return tokens', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        displayName: 'Test User',
      };

      const result = await service.register(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.token).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw ConflictException for duplicate email', async () => {
      // ... test implementation
    });
  });
});
```

### 15.3 Ejemplo de Test de Integración

```typescript
// products.e2e-spec.ts
describe('Products (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    // Login to get token
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'password' });
    authToken = response.body.token;
  });

  it('POST /products - should create product', () => {
    return request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${authToken}`)
      .field('title', 'Test Product')
      .field('description', 'Test description')
      .field('categoryId', 'category-uuid')
      .field('condition', 'GOOD')
      .field('price', '1000')
      .attach('images', './test/fixtures/image.jpg')
      .expect(201)
      .expect((res) => {
        expect(res.body.title).toBe('Test Product');
      });
  });
});
```

---

## Apéndices

### A. Códigos de Error

| Código | HTTP | Mensaje |
|--------|------|---------|
| AUTH001 | 401 | Invalid credentials |
| AUTH002 | 401 | Token expired |
| AUTH003 | 403 | Account suspended |
| USER001 | 404 | User not found |
| USER002 | 409 | Email already exists |
| PROD001 | 404 | Product not found |
| PROD002 | 403 | Not product owner |
| TRANS001 | 400 | Product not available |
| TRANS002 | 400 | Insufficient balance |

### B. Glosario

| Término | Definición |
|---------|------------|
| Trueque | Intercambio de productos sin dinero o con diferencia |
| Impacto | Métricas ambientales (CO2, agua) evitadas al reusar |
| Pago protegido | Dinero retenido hasta confirmar recepción |
| Verificado | Usuario con identidad confirmada |

---

*Documento actualizado: Enero 2024*
*Versión: 1.0.0-MVP*
