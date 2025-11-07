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
