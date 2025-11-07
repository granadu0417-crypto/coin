import { calculateEMASeries } from './ma';

/**
 * MACD (Moving Average Convergence Divergence)
 * MACD Line = 12-period EMA - 26-period EMA
 * Signal Line = 9-period EMA of MACD Line
 * Histogram = MACD Line - Signal Line
 */
export interface MACDResult {
  value: number; // MACD line
  signal: number; // Signal line
  histogram: number; // MACD - Signal
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  if (prices.length < slowPeriod + signalPeriod) {
    throw new Error(
      `Not enough data. Need at least ${slowPeriod + signalPeriod} prices`
    );
  }

  // Calculate EMAs
  const fastEMA = calculateEMASeries(prices, fastPeriod);
  const slowEMA = calculateEMASeries(prices, slowPeriod);

  // Calculate MACD line
  const macdLine: number[] = [];
  const offset = slowPeriod - fastPeriod;

  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + offset] - slowEMA[i]);
  }

  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMASeries(macdLine, signalPeriod);

  // Get latest values
  const latestMACD = macdLine[macdLine.length - 1];
  const latestSignal = signalLine[signalLine.length - 1];
  const histogram = latestMACD - latestSignal;

  return {
    value: latestMACD,
    signal: latestSignal,
    histogram: histogram,
  };
}

/**
 * Interpret MACD signals
 */
export function interpretMACD(macd: MACDResult): {
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number;
} {
  const { value, signal, histogram } = macd;

  // MACD crossover signals
  if (value > signal && histogram > 0) {
    // MACD above signal line = bullish
    const strength = Math.min(Math.abs(histogram) / 10, 1);
    return { signal: 'bullish', strength };
  } else if (value < signal && histogram < 0) {
    // MACD below signal line = bearish
    const strength = Math.min(Math.abs(histogram) / 10, 1);
    return { signal: 'bearish', strength };
  }

  return { signal: 'neutral', strength: 0 };
}
