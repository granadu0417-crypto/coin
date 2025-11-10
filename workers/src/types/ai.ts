// AI 전문가 시스템 타입 정의

export interface IndicatorWeights {
  rsi: number;
  macd: number;
  bollinger: number;
  funding: number;
  volume: number;
  trend: number;
  fearGreed: number;
}

export interface TimeframeWeights {
  '5m': IndicatorWeights;
  '10m': IndicatorWeights;
  '30m': IndicatorWeights;
  '1h': IndicatorWeights;
}

export interface ConfidenceThreshold {
  '5m': number;
  '10m': number;
  '30m': number;
  '1h': number;
}

export interface RecentPerformance {
  '5m': boolean[];
  '10m': boolean[];
  '30m': boolean[];
  '1h': boolean[];
}

export interface ExpertProfile {
  id: number;
  name: string;
  strategy: string;
  emoji: string;
  weights: TimeframeWeights;
  confidenceThreshold: ConfidenceThreshold;
  recentPerformance: RecentPerformance;
}

export interface IndicatorContribution {
  signal: 'long' | 'short' | 'neutral';
  strength: number;
  weight: number;
  contribution: number;
}

export interface IndicatorContributions {
  [indicator: string]: IndicatorContribution;
}

export interface Prediction {
  id?: number;
  expertId: number;
  coin: 'btc' | 'eth';
  timeframe: '5m' | '10m' | '30m' | '1h';
  signal: 'long' | 'short' | 'neutral';
  confidence: number;
  entryPrice: number;
  exitPrice?: number;
  status: 'pending' | 'success' | 'fail';
  profitPercent?: number;
  indicatorContributions: IndicatorContributions;
  createdAt: Date;
  checkedAt?: Date;
}

export interface ExpertStats {
  expertId: number;
  timeframe: '5m' | '10m' | '30m' | '1h';
  totalPredictions: number;
  successCount: number;
  failCount: number;
  pendingCount: number;
  successRate: number;
  lastUpdated: Date;
}

export interface TechnicalSignals {
  rsi: { signal: 'long' | 'short' | 'neutral'; strength: number };
  macd: { signal: 'long' | 'short' | 'neutral'; strength: number };
  bollinger: { signal: 'long' | 'short' | 'neutral'; strength: number };
  funding: { signal: 'long' | 'short' | 'neutral'; strength: number };
  volume: { signal: 'long' | 'short' | 'neutral'; strength: number };
  trend: { signal: 'long' | 'short' | 'neutral'; strength: number };
  fearGreed: { signal: 'long' | 'short' | 'neutral'; strength: number };
}

export interface IndicatorImportance {
  [indicator: string]: number; // 0-1 score
}

export interface PriceData {
  btc: number;
  eth: number;
  timestamp: number;
}
