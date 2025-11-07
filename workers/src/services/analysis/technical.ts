import type { MarketData, AnalysisResult, Direction } from '../../types';
import { calculateRSI, interpretRSI } from '../indicators/rsi';
import { calculateMACD, interpretMACD } from '../indicators/macd';
import { calculateBollingerBands, interpretBollingerBands } from '../indicators/bollinger';
import { calculateSMA } from '../indicators/ma';

/**
 * Technical Analyst
 * Uses RSI, MACD, Bollinger Bands, and Moving Averages
 */
export class TechnicalAnalyst {
  analyze(data: MarketData): AnalysisResult {
    const { prices, currentPrice } = data;
    const closePrices = prices.map((p) => p.close);

    if (closePrices.length < 50) {
      return {
        analyst: 'technical',
        direction: 'neutral',
        confidence: 0,
        reasoning: 'Not enough historical data for technical analysis',
      };
    }

    let bullishSignals = 0;
    let bearishSignals = 0;
    let totalSignals = 0;

    const reasons: string[] = [];

    // RSI Analysis
    try {
      const rsi = calculateRSI(closePrices);
      const rsiInterpretation = interpretRSI(rsi);

      totalSignals++;
      if (rsiInterpretation.signal === 'oversold') {
        bullishSignals++;
        reasons.push(`RSI (${rsi.toFixed(1)}) shows oversold condition`);
      } else if (rsiInterpretation.signal === 'overbought') {
        bearishSignals++;
        reasons.push(`RSI (${rsi.toFixed(1)}) shows overbought condition`);
      }
    } catch (e) {
      // Not enough data for RSI
    }

    // MACD Analysis
    try {
      const macd = calculateMACD(closePrices);
      const macdInterpretation = interpretMACD(macd);

      totalSignals++;
      if (macdInterpretation.signal === 'bullish') {
        bullishSignals++;
        reasons.push('MACD bullish crossover detected');
      } else if (macdInterpretation.signal === 'bearish') {
        bearishSignals++;
        reasons.push('MACD bearish crossover detected');
      }
    } catch (e) {
      // Not enough data for MACD
    }

    // Bollinger Bands Analysis
    try {
      const bb = calculateBollingerBands(closePrices);
      const bbInterpretation = interpretBollingerBands(currentPrice, bb);

      totalSignals++;
      if (bbInterpretation.signal === 'oversold') {
        bullishSignals++;
        reasons.push('Price near lower Bollinger Band (potential bounce)');
      } else if (bbInterpretation.signal === 'overbought') {
        bearishSignals++;
        reasons.push('Price near upper Bollinger Band (potential pullback)');
      }
    } catch (e) {
      // Not enough data for BB
    }

    // Moving Average Analysis
    try {
      const sma20 = calculateSMA(closePrices, 20);
      const sma50 = calculateSMA(closePrices, 50);

      totalSignals++;
      if (currentPrice > sma20 && sma20 > sma50) {
        bullishSignals++;
        reasons.push('Price above both 20 and 50 SMA (uptrend)');
      } else if (currentPrice < sma20 && sma20 < sma50) {
        bearishSignals++;
        reasons.push('Price below both 20 and 50 SMA (downtrend)');
      }
    } catch (e) {
      // Not enough data for MA
    }

    // Calculate direction and confidence
    let direction: Direction = 'neutral';
    let confidence = 0;

    if (totalSignals > 0) {
      const bullishRatio = bullishSignals / totalSignals;
      const bearishRatio = bearishSignals / totalSignals;

      if (bullishRatio > 0.6) {
        direction = 'bullish';
        confidence = Math.min(bullishRatio * 100, 90);
      } else if (bearishRatio > 0.6) {
        direction = 'bearish';
        confidence = Math.min(bearishRatio * 100, 90);
      } else {
        direction = 'neutral';
        confidence = 50 - Math.abs(bullishRatio - bearishRatio) * 50;
      }
    }

    const reasoning = reasons.length > 0
      ? reasons.join('. ')
      : 'Mixed technical signals, no clear direction';

    return {
      analyst: 'technical',
      direction,
      confidence,
      reasoning,
    };
  }
}

export const technicalAnalyst = new TechnicalAnalyst();
