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

export type Timeframe = '5m' | '10m' | '30m' | '1h' | '6h' | '12h' | '24h';

export type TimeframeWeights = {
  [K in Timeframe]?: IndicatorWeights;
};

export type ConfidenceThreshold = {
  [K in Timeframe]?: number;
};

export type RecentPerformance = {
  [K in Timeframe]?: boolean[];
};

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
  timeframe: Timeframe;
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
  timeframe: Timeframe;
  totalPredictions: number;
  successCount: number;
  failCount: number;
  pendingCount: number;
  successRate: number;
  lastUpdated: Date;
}

// 전문가 상세 통계 (투자 판단용)
export interface DetailedExpertStats {
  expertId: number;
  expertName: string;
  expertEmoji: string;
  expertStrategy: string;
  coin: 'btc' | 'eth';
  timeframe?: Timeframe; // optional: 전체 통계 시 undefined

  // 기본 통계
  totalPredictions: number;
  successCount: number;
  failCount: number;
  pendingCount: number;
  successRate: number;

  // 수익률 통계 (레버리지 20배 기준)
  avgProfit: number;
  maxProfit: number;
  maxLoss: number;
  totalProfit: number;

  // 연속 기록
  currentStreak: number; // 현재 연속 (양수: 성공, 음수: 실패)
  maxWinStreak: number;
  maxLossStreak: number;

  // 신호별 통계
  longCount: number;
  shortCount: number;
  neutralCount: number;
  longSuccessRate: number;
  shortSuccessRate: number;

  // 최근 성과 (최근 10개)
  recentResults: boolean[]; // true: success, false: fail

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
