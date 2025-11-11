// Cloudflare environment bindings
export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  AI: any; // Cloudflare AI binding for translation
  CANDLE_BUILDER: DurableObjectNamespace; // Real-time candle builder
  ALLOWED_ORIGINS: string;
}

// Price data
export interface Price {
  id?: number;
  symbol: string;
  exchange: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  created_at?: number;
}

// Market data for analysis
export interface MarketData {
  symbol: string;
  prices: Price[];
  currentPrice: number;
  volume24h: number;
  priceChange24h: number;
}

// Direction enum
export type Direction = 'bullish' | 'bearish' | 'neutral';

// Analyst types
export type AnalystType =
  | 'technical'
  | 'momentum'
  | 'volatility'
  | 'sentiment'
  | 'trend';

// Prediction
export interface Prediction {
  id?: number;
  analyst: AnalystType;
  symbol: string;
  direction: Direction;
  confidence: number; // 0-100
  timeframe: string; // "24h", "7d", "30d"
  reasoning: string;
  created_at?: number;
  is_active?: number;
}

// News article
export interface NewsArticle {
  id?: number;
  title: string;
  url: string;
  source: string;
  published_at: number;
  content?: string;
  sentiment_score?: number; // -1 to 1
  created_at?: number;
}

// Sentiment aggregate
export interface SentimentAggregate {
  id?: number;
  symbol: string;
  timeframe: string;
  sentiment_score: number; // -1 to 1
  sample_size: number;
  timestamp: number;
  created_at?: number;
}

// Technical indicators
export interface TechnicalIndicators {
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  ma: {
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
  };
}

// Analysis result
export interface AnalysisResult {
  analyst: AnalystType;
  direction: Direction;
  confidence: number;
  reasoning: string;
  indicators?: Partial<TechnicalIndicators>;
}

// Consensus result
export interface ConsensusResult {
  symbol: string;
  consensus_direction: Direction;
  consensus_confidence: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  predictions: Prediction[];
}

// Exchange ticker response
export interface ExchangeTicker {
  symbol: string;
  price: number;
  volume: number;
  high24h: number;
  low24h: number;
  change24h: number;
}

// RSS feed item
export interface RSSFeedItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  content?: string;
}
