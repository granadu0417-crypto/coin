-- Crypto Analysis Platform Database Schema
-- Cloudflare D1 (SQLite)

-- Prices table
CREATE TABLE IF NOT EXISTS prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  volume REAL NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_prices_symbol_time ON prices(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_prices_exchange ON prices(exchange);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analyst TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('bullish', 'bearish', 'neutral')),
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 100),
  timeframe TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  is_active INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_predictions_symbol ON predictions(symbol, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_analyst ON predictions(analyst);

-- News articles table
CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  content TEXT,
  sentiment_score REAL CHECK(sentiment_score >= -1 AND sentiment_score <= 1),
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_source ON news(source);

-- Sentiment aggregates table
CREATE TABLE IF NOT EXISTS sentiment_aggregates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  sentiment_score REAL NOT NULL CHECK(sentiment_score >= -1 AND sentiment_score <= 1),
  sample_size INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_sentiment_symbol_time ON sentiment_aggregates(symbol, timestamp DESC);
