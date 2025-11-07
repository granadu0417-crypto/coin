/**
 * Calculate Relative Strength Index (RSI)
 * RSI = 100 - (100 / (1 + RS))
 * RS = Average Gain / Average Loss
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) {
    throw new Error(`Not enough data. Need at least ${period + 1} prices`);
  }

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Separate gains and losses
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));

  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Smooth the averages (Wilder's smoothing method)
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  // Avoid division by zero
  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return rsi;
}

/**
 * Interpret RSI value
 */
export function interpretRSI(rsi: number): {
  signal: 'overbought' | 'oversold' | 'neutral';
  strength: number;
} {
  if (rsi >= 70) {
    return { signal: 'overbought', strength: (rsi - 70) / 30 };
  } else if (rsi <= 30) {
    return { signal: 'oversold', strength: (30 - rsi) / 30 };
  } else {
    return { signal: 'neutral', strength: 0 };
  }
}
