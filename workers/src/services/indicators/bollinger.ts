import { calculateSMA } from './ma';

/**
 * Bollinger Bands
 * Middle Band = 20-period SMA
 * Upper Band = Middle Band + (2 * Standard Deviation)
 * Lower Band = Middle Band - (2 * Standard Deviation)
 */
export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number; // (Upper - Lower) / Middle
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerBandsResult {
  if (prices.length < period) {
    throw new Error(`Not enough data. Need at least ${period} prices`);
  }

  // Calculate middle band (SMA)
  const middle = calculateSMA(prices, period);

  // Calculate standard deviation
  const slice = prices.slice(-period);
  const squaredDiffs = slice.map((price) => Math.pow(price - middle, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const standardDeviation = Math.sqrt(variance);

  // Calculate upper and lower bands
  const upper = middle + stdDev * standardDeviation;
  const lower = middle - stdDev * standardDeviation;

  // Calculate bandwidth
  const bandwidth = (upper - lower) / middle;

  return {
    upper,
    middle,
    lower,
    bandwidth,
  };
}

/**
 * Interpret Bollinger Bands
 */
export function interpretBollingerBands(
  currentPrice: number,
  bands: BollingerBandsResult
): {
  signal: 'overbought' | 'oversold' | 'neutral';
  strength: number;
  position: number; // -1 to 1, where 0 is middle band
} {
  const { upper, middle, lower } = bands;

  // Calculate position relative to bands
  const range = upper - lower;
  const position = ((currentPrice - middle) / (range / 2));

  if (currentPrice >= upper) {
    // Price at or above upper band = overbought
    const strength = Math.min((currentPrice - upper) / (upper - middle), 1);
    return { signal: 'overbought', strength, position };
  } else if (currentPrice <= lower) {
    // Price at or below lower band = oversold
    const strength = Math.min((lower - currentPrice) / (middle - lower), 1);
    return { signal: 'oversold', strength, position };
  }

  return { signal: 'neutral', strength: 0, position };
}

/**
 * Detect Bollinger Band squeeze (low volatility)
 */
export function detectBBSqueeze(bands: BollingerBandsResult): boolean {
  // Bandwidth less than 10% indicates a squeeze
  return bands.bandwidth < 0.1;
}
