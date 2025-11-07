export interface Price {
  id: number;
  symbol: string;
  exchange: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Direction = 'bullish' | 'bearish' | 'neutral';

export type Persona =
  | 'value_investor'
  | 'technical_analyst'
  | 'momentum_trader'
  | 'contrarian'
  | 'macro_economist'
  | 'quant_analyst'
  | 'risk_manager';

export interface Prediction {
  id: number;
  persona: Persona;
  symbol: string;
  direction: Direction;
  confidence: number;
  timeframe: string;
  reasoning: string;
  created_at: string;
  is_active: boolean;
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
  database: string;
  redis: string;
}
