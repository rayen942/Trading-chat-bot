-- ============================================================
-- MoneyTrade AI — Postgres schema
-- Run against the "moneytrade" database, e.g.:
--     psql -U postgres -d moneytrade -f schema.sql
-- This is the same schema `flask --app app init-db` creates.
-- Tables are ordered so foreign keys resolve cleanly.
-- ============================================================

-- ---------- users ----------
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    name          VARCHAR(120) NOT NULL,
    avatar        VARCHAR(4)   NOT NULL,
    company       VARCHAR(120),
    password_hash VARCHAR(255) NOT NULL,
    balance       FLOAT        NOT NULL DEFAULT 10000,
    xp            INTEGER      NOT NULL DEFAULT 0,
    theme         VARCHAR(40)  NOT NULL DEFAULT 'default',
    dark_mode     BOOLEAN      NOT NULL DEFAULT TRUE,
    sound_enabled BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);

-- ---------- positions (open holdings) ----------
CREATE TABLE IF NOT EXISTS positions (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    symbol        VARCHAR(20) NOT NULL,
    type          VARCHAR(10) NOT NULL DEFAULT 'buy',
    quantity      FLOAT       NOT NULL,
    price         FLOAT       NOT NULL,
    cost          FLOAT       NOT NULL,
    current_value FLOAT       NOT NULL,
    created_at    TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX IF NOT EXISTS ix_positions_user_id ON positions (user_id);

-- ---------- trades (history) ----------
CREATE TABLE IF NOT EXISTS trades (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    symbol     VARCHAR(20) NOT NULL,
    type       VARCHAR(10) NOT NULL,
    quantity   FLOAT       NOT NULL,
    price      FLOAT       NOT NULL,
    cost       FLOAT       NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX IF NOT EXISTS ix_trades_user_id ON trades (user_id);

-- ---------- conversations ----------
CREATE TABLE IF NOT EXISTS conversations (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL DEFAULT 'New chat',
    created_at TIMESTAMP    NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations (user_id);

-- ---------- messages ----------
CREATE TABLE IF NOT EXISTS messages (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER     NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,        -- 'user' | 'assistant'
    content         TEXT        NOT NULL,
    tokens_used     INTEGER     DEFAULT 0,
    created_at      TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages (conversation_id);

-- ---------- watchlist_items ----------
CREATE TABLE IF NOT EXISTS watchlist_items (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    symbol     VARCHAR(20) NOT NULL,
    name       VARCHAR(120),
    created_at TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    CONSTRAINT uq_watch_user_symbol UNIQUE (user_id, symbol)
);
CREATE INDEX IF NOT EXISTS ix_watchlist_items_user_id ON watchlist_items (user_id);

-- ---------- achievements (unlocked) ----------
CREATE TABLE IF NOT EXISTS achievements (
    id             SERIAL PRIMARY KEY,
    user_id        INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    achievement_id VARCHAR(60) NOT NULL,
    unlocked_at    TIMESTAMP   NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    CONSTRAINT uq_ach_user_ach UNIQUE (user_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS ix_achievements_user_id ON achievements (user_id);
