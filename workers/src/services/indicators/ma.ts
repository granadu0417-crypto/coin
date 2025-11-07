/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) {
    throw new Error(`Not enough data. Need at least ${period} prices`);
  }

  const slice = prices.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(
  prices: number[],
  period: number,
  prevEMA?: number
): number {
  if (prices.length === 0) {
    throw new Error('Need at least 1 price');
  }

  const multiplier = 2 / (period + 1);
  const currentPrice = prices[prices.length - 1];

  if (prevEMA === undefined) {
    // If no previous EMA, use SMA as starting point
    if (prices.length < period) {
      throw new Error(`Not enough data for initial EMA. Need ${period} prices`);
    }
    return calculateSMA(prices, period);
  }

  return (currentPrice - prevEMA) * multiplier + prevEMA;
}

/**
 * Calculate multiple EMAs for a price series
 */
export function calculateEMASeries(
  prices: number[],
  period: number
): number[] {
  if (prices.length < period) {
    throw new Error(`Not enough data. Need at least ${period} prices`);
  }

  const emas: number[] = [];
  let prevEMA: number | undefined;

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(0, i + 1);
    const ema = calculateEMA(slice, period, prevEMA);
    emas.push(ema);
    prevEMA = ema;
  }

  return emas;
}

/**
 * Detect moving average crossovers
 */
export function detectMACrossover(
  shortMA: number[],
  longMA: number[]
): 'golden_cross' | 'death_cross' | 'none' {
  if (shortMA.length < 2 || longMA.length < 2) {
    return 'none';
  }

  const prevShort = shortMA[shortMA.length - 2];
  const currShort = shortMA[shortMA.length - 1];
  const prevLong = longMA[longMA.length - 2];
  const currLong = longMA[longMA.length - 1];

  // Golden Cross: short MA crosses above long MA (bullish)
  if (prevShort <= prevLong && currShort > currLong) {
    return 'golden_cross';
  }

  // Death Cross: short MA crosses below long MA (bearish)
  if (prevShort >= prevLong && currShort < currLong) {
    return 'death_cross';
  }

  return 'none';
}
