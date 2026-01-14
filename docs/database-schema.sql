-- ============================================
-- REUSA - Esquema de Base de Datos
-- PostgreSQL Schema
-- Version: 1.0.0 (MVP)
-- ============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para busqueda full-text

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE verification_status AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED');
CREATE TYPE product_condition AS ENUM ('NEW_WITH_TAGS', 'LIKE_NEW', 'GOOD', 'ACCEPTABLE');
CREATE TYPE product_status AS ENUM ('DRAFT', 'ACTIVE', 'RESERVED', 'SOLD', 'TRADED', 'DELETED', 'REMOVED');
CREATE TYPE delivery_option AS ENUM ('PICKUP', 'SHIPPING', 'BOTH');
CREATE TYPE transaction_type AS ENUM ('SALE', 'TRADE', 'TRADE_WITH_CASH');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED');
CREATE TYPE payment_method AS ENUM ('MERCADO_PAGO', 'STRIPE', 'CASH_ON_DELIVERY', 'CASH_IN_PERSON');
CREATE TYPE message_type AS ENUM ('TEXT', 'IMAGE', 'OFFER', 'TRADE_PROPOSAL', 'SYSTEM');
CREATE TYPE notification_type AS ENUM ('NEW_MESSAGE', 'NEW_OFFER', 'TRADE_PROPOSAL', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'TRADE_ACCEPTED', 'TRADE_REJECTED', 'PRODUCT_SOLD', 'NEW_REVIEW', 'NEW_FAVORITE', 'SYSTEM');
CREATE TYPE report_reason AS ENUM ('SPAM', 'INAPPROPRIATE_CONTENT', 'FAKE_PRODUCT', 'SCAM', 'OFFENSIVE_BEHAVIOR', 'OTHER');
CREATE TYPE report_status AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- ============================================
-- TABLA: users
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),

    -- Perfil
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    phone_number VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,

    -- Ubicacion
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),

    -- Estado y verificacion
    status user_status DEFAULT 'ACTIVE',
    verification_status verification_status DEFAULT 'UNVERIFIED',
    identity_verified_at TIMESTAMPTZ,

    -- Metricas
    rating_avg DECIMAL(3, 2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    purchases_count INTEGER DEFAULT 0,
    trades_count INTEGER DEFAULT 0,

    -- Impacto ambiental
    impact_co2_saved DECIMAL(10, 2) DEFAULT 0,
    impact_water_saved DECIMAL(12, 2) DEFAULT 0,
    impact_items_reused INTEGER DEFAULT 0,

    -- Preferencias
    interests TEXT[],
    notify_messages BOOLEAN DEFAULT TRUE,
    notify_offers BOOLEAN DEFAULT TRUE,
    notify_favorites BOOLEAN DEFAULT FALSE,
    notify_promos BOOLEAN DEFAULT FALSE,

    -- Auth
    last_login_at TIMESTAMPTZ,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_location ON users(city, country);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created ON users(created_at);

-- ============================================
-- TABLA: auth_providers
-- ============================================
CREATE TABLE auth_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(provider, provider_id)
);

CREATE INDEX idx_auth_providers_user ON auth_providers(user_id);

-- ============================================
-- TABLA: user_devices
-- ============================================
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token VARCHAR(500) NOT NULL,
    device_type VARCHAR(20) NOT NULL,
    device_model VARCHAR(100),
    app_version VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_devices_user ON user_devices(user_id);
CREATE INDEX idx_user_devices_token ON user_devices(device_token);

-- ============================================
-- TABLA: categories
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Jerarquia
    parent_id UUID REFERENCES categories(id),

    -- Factores de impacto
    avg_weight_kg DECIMAL(6, 2) DEFAULT 0.5,
    co2_factor_per_kg DECIMAL(6, 2) DEFAULT 2.0,
    water_factor_per_kg DECIMAL(10, 2) DEFAULT 1000,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_active ON categories(is_active, sort_order);

-- ============================================
-- TABLA: products
-- ============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    category_id UUID NOT NULL REFERENCES categories(id),

    -- Info basica
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    condition product_condition NOT NULL,

    -- Precio y trueque
    price DECIMAL(12, 2),
    accepts_trade BOOLEAN DEFAULT FALSE,
    trade_preferences TEXT,

    -- Ubicacion
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),

    -- Entrega
    delivery_option delivery_option DEFAULT 'BOTH',
    shipping_cost DECIMAL(10, 2),

    -- Atributos adicionales (JSON flexible)
    attributes JSONB,

    -- Estado
    status product_status DEFAULT 'ACTIVE',

    -- Metricas
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    messages_count INTEGER DEFAULT 0,

    -- Impacto
    estimated_weight_kg DECIMAL(6, 2),
    impact_co2 DECIMAL(8, 2),
    impact_water DECIMAL(10, 2),

    -- Moderacion
    is_approved BOOLEAN DEFAULT TRUE,
    moderated_at TIMESTAMPTZ,
    moderation_notes TEXT,

    -- Timestamps
    published_at TIMESTAMPTZ,
    sold_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_products_user ON products(user_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_location ON products(city, country);
CREATE INDEX idx_products_created ON products(created_at);
CREATE INDEX idx_products_trade ON products(accepts_trade);

-- Indice para busqueda full-text
CREATE INDEX idx_products_search ON products USING GIN (
    to_tsvector('spanish', title || ' ' || COALESCE(description, ''))
);

-- ============================================
-- TABLA: product_images
-- ============================================
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    width INTEGER,
    height INTEGER,
    size_bytes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_order ON product_images(sort_order);

-- ============================================
-- TABLA: favorites
-- ============================================
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_product ON favorites(product_id);

-- ============================================
-- TABLA: conversations
-- ============================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),

    is_active BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMPTZ,

    buyer_unread_count INTEGER DEFAULT 0,
    seller_unread_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(product_id, buyer_id)
);

CREATE INDEX idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX idx_conversations_seller ON conversations(seller_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at);

-- ============================================
-- TABLA: messages
-- ============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),

    type message_type DEFAULT 'TEXT',
    content TEXT,
    image_url VARCHAR(500),

    -- Metadata para ofertas/trueques
    metadata JSONB,

    read_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ============================================
-- TABLA: transactions
-- ============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    product_id UUID NOT NULL REFERENCES products(id),
    buyer_id UUID NOT NULL REFERENCES users(id),
    seller_id UUID NOT NULL REFERENCES users(id),

    type transaction_type NOT NULL,
    status transaction_status DEFAULT 'PENDING',

    -- Montos
    product_price DECIMAL(12, 2),
    agreed_price DECIMAL(12, 2),
    shipping_cost DECIMAL(10, 2),
    service_fee DECIMAL(10, 2),
    total_amount DECIMAL(12, 2),
    seller_payout DECIMAL(12, 2),

    -- Trueque
    trade_product_id UUID,
    trade_cash_difference DECIMAL(10, 2),

    -- Pago
    payment_method payment_method,
    payment_id VARCHAR(255),
    payment_data JSONB,
    paid_at TIMESTAMPTZ,

    -- Envio
    delivery_option delivery_option NOT NULL,
    shipping_carrier VARCHAR(100),
    tracking_number VARCHAR(100),
    tracking_url VARCHAR(500),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    -- Confirmaciones
    buyer_confirmed_at TIMESTAMPTZ,
    seller_confirmed_at TIMESTAMPTZ,

    -- Disputa
    dispute_reason TEXT,
    dispute_opened_at TIMESTAMPTZ,
    dispute_resolved_at TIMESTAMPTZ,
    dispute_resolution TEXT,

    -- Impacto
    impact_co2 DECIMAL(8, 2),
    impact_water DECIMAL(10, 2),

    -- Timestamps
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_product ON transactions(product_id);
CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- ============================================
-- TABLA: reviews
-- ============================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    reviewed_id UUID NOT NULL REFERENCES users(id),

    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,

    accurate_description BOOLEAN,
    friendly_seller BOOLEAN,
    fast_responses BOOLEAN,

    is_public BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(transaction_id, reviewer_id)
);

CREATE INDEX idx_reviews_reviewed ON reviews(reviewed_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_created ON reviews(created_at);

-- ============================================
-- TABLA: notifications
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    image_url VARCHAR(500),

    reference_type VARCHAR(50),
    reference_id UUID,

    read_at TIMESTAMPTZ,

    push_sent_at TIMESTAMPTZ,
    push_error TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read_at);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================
-- TABLA: badges
-- ============================================
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100) NOT NULL,
    color VARCHAR(20),

    requirements JSONB NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: user_badges
-- ============================================
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- ============================================
-- TABLA: reports
-- ============================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    reporter_id UUID NOT NULL REFERENCES users(id),

    target_type VARCHAR(50) NOT NULL,
    target_user_id UUID REFERENCES users(id),
    target_product_id UUID REFERENCES products(id),

    reason report_reason NOT NULL,
    description TEXT,
    evidence TEXT[],

    status report_status DEFAULT 'PENDING',

    moderator_notes TEXT,
    resolved_at TIMESTAMPTZ,
    action_taken VARCHAR(100),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_target_user ON reports(target_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at);

-- ============================================
-- TABLA: app_config
-- ============================================
CREATE TABLE app_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: global_metrics
-- ============================================
CREATE TABLE global_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE UNIQUE NOT NULL,

    total_users INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,

    total_products INTEGER DEFAULT 0,
    new_products INTEGER DEFAULT 0,
    active_products INTEGER DEFAULT 0,

    total_transactions INTEGER DEFAULT 0,
    completed_transactions INTEGER DEFAULT 0,
    total_sales_volume DECIMAL(14, 2) DEFAULT 0,
    total_trades_count INTEGER DEFAULT 0,

    total_co2_saved DECIMAL(12, 2) DEFAULT 0,
    total_water_saved DECIMAL(14, 2) DEFAULT 0,
    total_items_reused INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_global_metrics_date ON global_metrics(date);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger para actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas con updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger para actualizar contador de favoritos
CREATE OR REPLACE FUNCTION update_product_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE products SET favorites_count = favorites_count + 1 WHERE id = NEW.product_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE products SET favorites_count = favorites_count - 1 WHERE id = OLD.product_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_favorites_count
AFTER INSERT OR DELETE ON favorites
FOR EACH ROW EXECUTE FUNCTION update_product_favorites_count();

-- Trigger para actualizar rating promedio de usuario
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users
    SET
        rating_avg = (SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE reviewed_id = NEW.reviewed_id),
        rating_count = (SELECT COUNT(*) FROM reviews WHERE reviewed_id = NEW.reviewed_id)
    WHERE id = NEW.reviewed_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_rating_on_review
AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- ============================================
-- DATOS INICIALES: Categorias
-- ============================================

INSERT INTO categories (id, name, slug, icon, sort_order, avg_weight_kg, co2_factor_per_kg, water_factor_per_kg) VALUES
    (uuid_generate_v4(), 'Ropa y accesorios', 'ropa', 'shirt', 1, 0.5, 10.0, 2700),
    (uuid_generate_v4(), 'Electronica', 'electronica', 'smartphone', 2, 0.8, 50.0, 5000),
    (uuid_generate_v4(), 'Hogar y decoracion', 'hogar', 'home', 3, 2.0, 5.0, 1500),
    (uuid_generate_v4(), 'Libros y entretenimiento', 'libros', 'book', 4, 0.4, 2.5, 800),
    (uuid_generate_v4(), 'Deportes', 'deportes', 'dumbbell', 5, 1.5, 8.0, 2000),
    (uuid_generate_v4(), 'Ninos y bebes', 'ninos', 'baby', 6, 0.6, 8.0, 2500),
    (uuid_generate_v4(), 'Otros', 'otros', 'box', 7, 1.0, 5.0, 1500);

-- Subcategorias de Ropa
INSERT INTO categories (name, slug, icon, sort_order, parent_id, avg_weight_kg, co2_factor_per_kg, water_factor_per_kg)
SELECT 'Abrigos y chaquetas', 'abrigos', 'jacket', 1, id, 1.2, 15.0, 3500 FROM categories WHERE slug = 'ropa';

INSERT INTO categories (name, slug, icon, sort_order, parent_id, avg_weight_kg, co2_factor_per_kg, water_factor_per_kg)
SELECT 'Camisetas', 'camisetas', 'tshirt', 2, id, 0.2, 8.0, 2500 FROM categories WHERE slug = 'ropa';

INSERT INTO categories (name, slug, icon, sort_order, parent_id, avg_weight_kg, co2_factor_per_kg, water_factor_per_kg)
SELECT 'Pantalones', 'pantalones', 'pants', 3, id, 0.5, 10.0, 3000 FROM categories WHERE slug = 'ropa';

INSERT INTO categories (name, slug, icon, sort_order, parent_id, avg_weight_kg, co2_factor_per_kg, water_factor_per_kg)
SELECT 'Zapatos', 'zapatos', 'shoe', 4, id, 0.8, 12.0, 2800 FROM categories WHERE slug = 'ropa';

INSERT INTO categories (name, slug, icon, sort_order, parent_id, avg_weight_kg, co2_factor_per_kg, water_factor_per_kg)
SELECT 'Accesorios', 'accesorios', 'watch', 5, id, 0.1, 5.0, 1000 FROM categories WHERE slug = 'ropa';

-- ============================================
-- DATOS INICIALES: Badges
-- ============================================

INSERT INTO badges (code, name, description, icon, color, requirements) VALUES
    ('fast_responder', 'Responde Rapido', 'Responde mensajes en menos de 2 horas', 'zap', '#FFD700', '{"avg_response_time_hours": 2}'),
    ('super_seller', 'Super Vendedor', 'Rating 4.8+ con mas de 10 ventas', 'star', '#FF6B4A', '{"min_rating": 4.8, "min_sales": 10}'),
    ('trade_king', 'Rey del Trueque', '10+ intercambios exitosos', 'refresh', '#2D9B6E', '{"min_trades": 10}'),
    ('eco_warrior', 'Eco Warrior', '100kg de CO2 evitados', 'leaf', '#4CAF50', '{"min_co2_saved": 100}'),
    ('trusted_neighbor', 'Vecino Confiable', '5+ transacciones locales', 'map-pin', '#2196F3', '{"min_local_transactions": 5}'),
    ('verified', 'Verificado', 'Identidad verificada', 'check-circle', '#9C27B0', '{"identity_verified": true}');

-- ============================================
-- DATOS INICIALES: App Config
-- ============================================

INSERT INTO app_config (key, value, description) VALUES
    ('service_fee_percentage', '5', 'Porcentaje de comision por venta'),
    ('min_payout_amount', '500', 'Monto minimo para retiro de ganancias'),
    ('max_images_per_product', '8', 'Maximo de imagenes por producto'),
    ('max_products_per_user', '100', 'Maximo de productos activos por usuario'),
    ('featured_categories', '["ropa", "electronica", "hogar"]', 'Categorias destacadas en home');
