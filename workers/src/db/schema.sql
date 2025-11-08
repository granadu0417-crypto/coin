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

-- Influencer mentions table
CREATE TABLE IF NOT EXISTS influencer_mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  influencer_name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'twitter', 'reddit', 'telegram', 'news'
  content TEXT NOT NULL,
  url TEXT,
  symbols TEXT, -- Comma-separated, e.g., 'BTC,ETH'
  sentiment_score REAL CHECK(sentiment_score >= -1 AND sentiment_score <= 1),
  impact_level TEXT CHECK(impact_level IN ('high', 'medium', 'low')),
  published_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_influencer_name ON influencer_mentions(influencer_name, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_influencer_platform ON influencer_mentions(platform);
CREATE INDEX IF NOT EXISTS idx_influencer_symbols ON influencer_mentions(symbols);

-- Price events table (tracks significant price changes correlated with influencer mentions)
CREATE TABLE IF NOT EXISTS price_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'spike', 'drop', 'volatility'
  price_before REAL NOT NULL,
  price_after REAL NOT NULL,
  change_percent REAL NOT NULL,
  volume_change REAL,
  mention_id INTEGER, -- Links to influencer_mentions if correlated
  event_time INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (mention_id) REFERENCES influencer_mentions(id)
);

CREATE INDEX IF NOT EXISTS idx_price_events_symbol ON price_events(symbol, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_price_events_mention ON price_events(mention_id);
