# Despliegue en Railway

## Requisitos Previos

1. Cuenta en [Railway](https://railway.app)
2. CLI de Railway instalada (opcional): `npm install -g @railway/cli`

## Pasos para Desplegar

### 1. Crear Proyecto en Railway

1. Ir a [railway.app](https://railway.app) y crear nuevo proyecto
2. Seleccionar "Deploy from GitHub repo"
3. Conectar el repositorio de GitHub
4. Seleccionar la carpeta `backend` como root directory

### 2. Agregar Base de Datos PostgreSQL

1. En el proyecto, click en "New" > "Database" > "PostgreSQL"
2. Railway creará automáticamente la variable `DATABASE_URL`

### 3. Configurar Variables de Entorno

En la pestaña "Variables" del servicio backend, agregar:

#### Requeridas

```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://reusemos.cl,https://www.reusemos.cl

# JWT (generar secretos seguros)
JWT_SECRET=<generar-con: openssl rand -base64 64>
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

#### Cloudinary (Imágenes)

```
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
```

#### Mercado Pago (Pagos)

```
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx
MERCADOPAGO_WEBHOOK_SECRET=tu-webhook-secret
```

#### URLs

```
APP_URL=https://reusemos.cl
API_URL=https://api.reusemos.cl
```

#### Firebase (Push Notifications)

```
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@proyecto.iam.gserviceaccount.com
```

#### Google OAuth

```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-google-secret
```

#### Apple OAuth (opcional)

```
APPLE_CLIENT_ID=com.reusemos.app
APPLE_TEAM_ID=tu-team-id
APPLE_KEY_ID=tu-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

#### Email (Resend)

```
RESEND_API_KEY=re_xxx
EMAIL_FROM=Reusemos <noreply@reusemos.cl>
```

#### Chilexpress (Envíos)

```
CHILEXPRESS_API_KEY=tu-subscription-key
CHILEXPRESS_TCC=tu-tcc
CHILEXPRESS_MARKETPLACE_RUT=tu-rut
```

### 4. Configurar Dominio Personalizado

1. En Railway, ir a Settings > Domains
2. Agregar dominio personalizado: `api.reusemos.cl`
3. Copiar el CNAME proporcionado
4. En Cloudflare, agregar registro CNAME:
   - Nombre: `api`
   - Contenido: `<cname-de-railway>.railway.app`

### 5. Configurar Webhook de Mercado Pago

1. Ir a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers/panel)
2. En tu aplicación, configurar webhook URL:
   ```
   https://api.reusemos.cl/api/payments/webhook
   ```
3. Seleccionar eventos: `payment`

## Verificar Despliegue

1. Health check: `https://api.reusemos.cl/api/health`
2. Liveness: `https://api.reusemos.cl/api/health/live`
3. Readiness: `https://api.reusemos.cl/api/health/ready`

## Logs y Monitoreo

- Ver logs en Railway Dashboard > Deployments > View Logs
- Métricas disponibles en la pestaña "Metrics"

## Comandos Útiles (CLI)

```bash
# Login
railway login

# Ver logs en tiempo real
railway logs

# Ejecutar comando en el servidor
railway run npx prisma studio

# Variables de entorno
railway variables
```

## Troubleshooting

### Error de conexión a base de datos
- Verificar que `DATABASE_URL` esté configurada correctamente
- Railway la configura automáticamente al agregar PostgreSQL

### WebSocket no conecta
- Verificar que `CORS_ORIGIN` incluya el dominio de la app móvil
- Para desarrollo móvil, puede ser necesario agregar IPs locales

### Migraciones fallando
- El Dockerfile ejecuta `prisma migrate deploy` automáticamente
- Si falla, verificar que el schema de Prisma esté correcto
