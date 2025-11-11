export interface Price {
  id?: number;
  symbol: string;
  exchange: string;
  timestamp: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  created_at?: number;
}

export type Direction = 'bullish' | 'bearish' | 'neutral';

export type AnalystType =
  | 'technical'
  | 'momentum'
  | 'volatility'
  | 'sentiment'
  | 'trend';

// Legacy support
export type Persona = AnalystType
  | 'value_investor'
  | 'technical_analyst'
  | 'momentum_trader'
  | 'contrarian'
  | 'macro_economist'
  | 'quant_analyst'
  | 'risk_manager';

export interface Prediction {
  id?: number;
  analyst?: AnalystType;
  persona?: Persona; // Legacy support
  symbol: string;
  direction: Direction;
  confidence: number;
  timeframe: string;
  reasoning: string;
  created_at?: number | string;
  is_active?: number | boolean;
}

export interface Consensus {
  symbol: string;
  consensus_direction: Direction;
  consensus_confidence: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  predictions: Prediction[];
}

export interface HealthStatus {
  status: string;
  timestamp?: number;
  version?: string;
  database?: string;
  redis?: string;
}

// Trading Recommendation Types
export type TradeAction = 'strong_buy' | 'buy' | 'cautious' | 'wait' | 'avoid';
export type Signal = 'long' | 'short' | 'neutral';

export interface TradingRecommendation {
  action: TradeAction;
  actionKr: string;
  emoji: string;
  color: string;
  description: string;
}

export interface ExpertPrediction {
  expertId: number;
  expertName: string;
  expertEmoji: string;
  signal: Signal;
  confidence: number;
  winRate: number;
}

export interface TopModel {
  expertId: number;
  expertName: string;
  expertEmoji: string;
  winRate: number;
  signal: Signal;
}

export interface ConsensusInfo {
  signal: Signal;
  confidence: number;
  weightedLongScore: number;
  weightedShortScore: number;
}

export interface TradingStats {
  recentSuccessRate: number;
  signalAgeMinutes: number;
  totalPredictions: number;
  top3Models: TopModel[];
}

export interface TradingRecommendationResponse {
  hasData: boolean;
  coin: string;
  timeframe: string;
  timestamp: string;
  signalStrength: number;
  recommendation: TradingRecommendation;
  consensus: ConsensusInfo;
  stats: TradingStats;
  predictions: ExpertPrediction[];
  error?: string;
}

// Trading Arena Types
export interface TraderBalance {
  expertId: number;
  name: string;
  emoji: string;
  strategy: string;
  currentBalance: number;
  initialBalance: number;
  todayProfitPercent: number;
  todayProfitAmount: number;
  todayTrades: number;
  todayWins: number;
  todayLosses: number;
  totalTrades: number;
  winRate: number;
  totalProfitPercent: number;
  bestTradePercent: number;
  worstTradePercent: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  status: string;
}

export interface OpenPosition {
  id: number;
  expertId: number;
  expertName: string;
  expertEmoji: string;
  coin: string;
  position: 'long' | 'short';
  entryTime: string;
  entryPrice: number;
  entryConfidence: number;
  balanceBefore: number;
}

export interface ClosedTrade {
  id: number;
  expertId: number;
  expertName: string;
  expertEmoji: string;
  coin: string;
  position: 'long' | 'short';
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  exitReason: string;
  holdDurationMinutes: number;
  leveragedProfitPercent: number;
  profitAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: string;
}
