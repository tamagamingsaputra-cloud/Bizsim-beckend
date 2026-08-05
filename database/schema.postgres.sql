-- ============================================================
-- BizSim — PostgreSQL schema (untuk deploy produksi)
-- Jalankan: psql -U postgres -d bizsim -f schema.postgres.sql
-- Perlu driver `pg` dipasang dan adapter di config/database.js
-- diimplementasikan (lihat backend/README.md).
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(64) UNIQUE,
  auth_provider VARCHAR(20) NOT NULL DEFAULT 'local',
  role VARCHAR(20) NOT NULL DEFAULT 'member',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  avatar_url VARCHAR(500),
  bio VARCHAR(500),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS save_games (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot VARCHAR(50) NOT NULL DEFAULT 'default',
  state_json TEXT NOT NULL,
  net_worth DOUBLE PRECISION NOT NULL DEFAULT 0,
  game_year INT NOT NULL DEFAULT 1,
  game_month INT NOT NULL DEFAULT 1,
  game_day INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slot)
);

CREATE TABLE IF NOT EXISTS businesses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_type VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  total_profit DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_levels (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  upgrade_id VARCHAR(50) NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS portfolio (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id VARCHAR(20) NOT NULL,
  qty DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_buy DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, asset_id)
);

CREATE TABLE IF NOT EXISTS online_assets (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(30) NOT NULL,
  type VARCHAR(20) NOT NULL,
  base_price DOUBLE PRECISION NOT NULL,
  volatility DOUBLE PRECISION NOT NULL,
  liquidity VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS offline_assets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(20) NOT NULL,
  ref_key VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  buy_price DOUBLE PRECISION NOT NULL,
  current_value DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lands (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_key VARCHAR(30) NOT NULL,
  area_m2 DOUBLE PRECISION NOT NULL,
  price_per_m2 DOUBLE PRECISION NOT NULL,
  total_price DOUBLE PRECISION NOT NULL,
  current_value DOUBLE PRECISION NOT NULL,
  developed BOOLEAN NOT NULL DEFAULT FALSE,
  rented BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS properties (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_type VARCHAR(30) NOT NULL,
  location_key VARCHAR(30) NOT NULL,
  buy_price DOUBLE PRECISION NOT NULL,
  current_value DOUBLE PRECISION NOT NULL,
  rented BOOLEAN NOT NULL DEFAULT FALSE,
  rent_per_month DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gold_assets (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  grams DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_buy_price DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  game_time VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);

CREATE TABLE IF NOT EXISTS market_history (
  id BIGSERIAL PRIMARY KEY,
  asset_id VARCHAR(20) NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_market_asset ON market_history(asset_id);

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description VARCHAR(500) NOT NULL,
  tone VARCHAR(20) NOT NULL,
  duration_days INT NOT NULL,
  impact_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  event_id VARCHAR(50) NOT NULL,
  region_key VARCHAR(30),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  body VARCHAR(500) NOT NULL,
  tone VARCHAR(20) NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

CREATE TABLE IF NOT EXISTS settings (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings_json TEXT NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
