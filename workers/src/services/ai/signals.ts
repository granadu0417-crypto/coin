// 기술적 지표 신호 생성 (AI 전문가 시스템용)

import type { TechnicalSignals } from '../../types/ai';
import type { Price } from '../../types';
import { calculateRSI } from '../indicators/rsi';
import { calculateMACD } from '../indicators/macd';
import { calculateBollingerBands } from '../indicators/bollinger';
import { calculateSMA } from '../indicators/ma';
import { binanceService } from '../exchanges/binance';
import { fearGreedService } from '../external/fear-greed';

/**
 * 기술적 지표로부터 통합 신호 생성
 *
 * @param symbol 코인 심볼 ('BTC', 'ETH')
 * @param prices 과거 가격 데이터 (최소 100개 권장)
 * @param currentPrice 현재 가격
 * @returns TechnicalSignals 객체
 */
export async function generateTechnicalSignals(
  symbol: string,
  prices: Price[],
  currentPrice: number
): Promise<TechnicalSignals> {
  const closePrices = prices.map(p => p.close);
  const volumes = prices.map(p => p.volume);

  // RSI 신호
  const rsiSignal = generateRSISignal(closePrices);

  // MACD 신호
  const macdSignal = generateMACDSignal(closePrices);

  // 볼린저 밴드 신호
  const bollingerSignal = generateBollingerSignal(closePrices, currentPrice);

  // 펀딩비율 신호 (실제 Binance Futures API 사용)
  const fundingSignal = await generateFundingSignal(symbol);

  // 거래량 신호
  const volumeSignal = generateVolumeSignal(volumes);

  // 추세 신호 (MA 기반)
  const trendSignal = generateTrendSignal(closePrices, currentPrice);

  // Fear & Greed 신호 (실제 Alternative.me API 사용)
  const fearGreedSignal = await generateFearGreedSignal();

  return {
    rsi: rsiSignal,
    macd: macdSignal,
    bollinger: bollingerSignal,
    funding: fundingSignal,
    volume: volumeSignal,
    trend: trendSignal,
    fearGreed: fearGreedSignal
  };
}

/**
 * RSI 신호 생성
 * RSI < 30: long (과매도)
 * RSI > 70: short (과매수)
 */
function generateRSISignal(closePrices: number[]): {
  signal: 'long' | 'short' | 'neutral';
  strength: number;
} {
  try {
    const rsi = calculateRSI(closePrices);

    if (rsi < 30) {
      const strength = Math.min(100, (30 - rsi) / 30 * 100);
      return { signal: 'long', strength };
    } else if (rsi > 70) {
      const strength = Math.min(100, (rsi - 70) / 30 * 100);
      return { signal: 'short', strength };
    } else {
      // 40-60 구간은 중립
      const neutralZone = 50;
      const distance = Math.abs(rsi - neutralZone);
      const strength = Math.max(0, 50 - distance);

      if (rsi > 60) {
        return { signal: 'short', strength: Math.min((rsi - 60) / 10 * 50, 50) };
      } else if (rsi < 40) {
        return { signal: 'long', strength: Math.min((40 - rsi) / 10 * 50, 50) };
      }

      return { signal: 'neutral', strength: 30 };
    }
  } catch (e) {
    return { signal: 'neutral', strength: 0 };
  }
}

/**
 * MACD 신호 생성
 * MACD > Signal: long (상승 모멘텀)
 * MACD < Signal: short (하락 모멘텀)
 */
function generateMACDSignal(closePrices: number[]): {
  signal: 'long' | 'short' | 'neutral';
  strength: number;
} {
  try {
    const macd = calculateMACD(closePrices);
    const diff = macd.macd - macd.signal;
    const histogram = macd.histogram;

    if (diff > 0) {
      const strength = Math.min(100, Math.abs(histogram) * 10);
      return { signal: 'long', strength };
    } else if (diff < 0) {
      const strength = Math.min(100, Math.abs(histogram) * 10);
      return { signal: 'short', strength };
    } else {
      return { signal: 'neutral', strength: 30 };
    }
  } catch (e) {
    return { signal: 'neutral', strength: 0 };
  }
}

/**
 * 볼린저 밴드 신호 생성
 * Price < Lower Band: long (과매도)
 * Price > Upper Band: short (과매수)
 */
function generateBollingerSignal(closePrices: number[], currentPrice: number): {
  signal: 'long' | 'short' | 'neutral';
  strength: number;
} {
  try {
    const bb = calculateBollingerBands(closePrices);
    const bandwidth = bb.upper - bb.lower;
    const position = (currentPrice - bb.lower) / bandwidth;

    if (position < 0.2) {
      // 하단 밴드 근처 (과매도)
      const strength = Math.min(100, (0.2 - position) / 0.2 * 100);
      return { signal: 'long', strength };
    } else if (position > 0.8) {
      // 상단 밴드 근처 (과매수)
      const strength = Math.min(100, (position - 0.8) / 0.2 * 100);
      return { signal: 'short', strength };
    } else {
      // 중간 범위
      const distance = Math.abs(position - 0.5);
      const strength = Math.max(0, 50 - distance * 100);

      if (position > 0.6) {
        return { signal: 'short', strength: Math.min((position - 0.6) / 0.2 * 50, 50) };
      } else if (position < 0.4) {
        return { signal: 'long', strength: Math.min((0.4 - position) / 0.2 * 50, 50) };
      }

      return { signal: 'neutral', strength: 30 };
    }
  } catch (e) {
    return { signal: 'neutral', strength: 0 };
  }
}

/**
 * 펀딩비율 신호 생성 (실제 Binance Futures API)
 *
 * Funding Rate 해석:
 * - 양수(+): 롱 포지션이 많음 → 시장 과열 → SHORT 신호
 * - 음수(-): 숏 포지션이 많음 → 시장 과매도 → LONG 신호
 *
 * 일반적인 범위:
 * - 0.01% (0.0001): 약한 롱 편향
 * - 0.05% (0.0005): 중간 롱 편향
 * - 0.10% (0.001): 강한 롱 편향
 */
async function generateFundingSignal(symbol: string): Promise<{
  signal: 'long' | 'short' | 'neutral';
  strength: number;
}> {
  try {
    const fundingData = await binanceService.getFundingRate(symbol);
    const fundingRate = fundingData.fundingRate;

    // 펀딩비율을 퍼센트로 변환 (0.0001 = 0.01%)
    const fundingPercent = fundingRate * 100;

    if (fundingPercent > 0.05) {
      // 강한 양수 펀딩비율 → 롱 과열 → SHORT 신호
      const strength = Math.min(100, fundingPercent * 1000);
      return { signal: 'short', strength };
    } else if (fundingPercent < -0.05) {
      // 강한 음수 펀딩비율 → 숏 과열 → LONG 신호
      const strength = Math.min(100, Math.abs(fundingPercent) * 1000);
      return { signal: 'long', strength };
    } else if (fundingPercent > 0.01) {
      // 약한 양수 → 약한 SHORT 신호
      const strength = 40 + (fundingPercent * 500);
      return { signal: 'short', strength: Math.min(strength, 70) };
    } else if (fundingPercent < -0.01) {
      // 약한 음수 → 약한 LONG 신호
      const strength = 40 + (Math.abs(fundingPercent) * 500);
      return { signal: 'long', strength: Math.min(strength, 70) };
    } else {
      // 중립 범위 (-0.01 ~ 0.01)
      return { signal: 'neutral', strength: 40 };
    }
  } catch (error) {
    console.error('Error generating funding signal:', error);
    return { signal: 'neutral', strength: 40 };
  }
}

/**
 * 거래량 신호 생성
 * 평균 대비 높은 거래량 → 추세 강화
 */
function generateVolumeSignal(volumes: number[]): {
  signal: 'long' | 'short' | 'neutral';
  strength: number;
} {
  try {
    const recentVolumes = volumes.slice(-10);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const currentVolume = volumes[volumes.length - 1];

    const ratio = currentVolume / avgVolume;

    if (ratio > 1.5) {
      // 거래량 급등 → 추세 강화 시그널
      const strength = Math.min(100, (ratio - 1) * 50);
      return { signal: 'long', strength }; // 방향은 다른 지표와 조합 필요
    } else if (ratio < 0.5) {
      // 거래량 급감 → 약한 시그널
      return { signal: 'neutral', strength: 20 };
    } else {
      return { signal: 'neutral', strength: 40 };
    }
  } catch (e) {
    return { signal: 'neutral', strength: 0 };
  }
}

/**
 * 추세 신호 생성 (MA 기반)
 * Price > MA20 > MA50: long (상승 추세)
 * Price < MA20 < MA50: short (하락 추세)
 */
function generateTrendSignal(closePrices: number[], currentPrice: number): {
  signal: 'long' | 'short' | 'neutral';
  strength: number;
} {
  try {
    const ma20 = calculateSMA(closePrices, 20);
    const ma50 = calculateSMA(closePrices, 50);

    if (currentPrice > ma20 && ma20 > ma50) {
      // 강한 상승 추세
      const distance1 = ((currentPrice - ma20) / ma20) * 100;
      const distance2 = ((ma20 - ma50) / ma50) * 100;
      const strength = Math.min(100, (distance1 + distance2) * 10);
      return { signal: 'long', strength };
    } else if (currentPrice < ma20 && ma20 < ma50) {
      // 강한 하락 추세
      const distance1 = ((ma20 - currentPrice) / ma20) * 100;
      const distance2 = ((ma50 - ma20) / ma50) * 100;
      const strength = Math.min(100, (distance1 + distance2) * 10);
      return { signal: 'short', strength };
    } else {
      // 혼재 또는 약한 추세
      if (currentPrice > ma20) {
        return { signal: 'long', strength: 40 };
      } else if (currentPrice < ma20) {
        return { signal: 'short', strength: 40 };
      }
      return { signal: 'neutral', strength: 30 };
    }
  } catch (e) {
    return { signal: 'neutral', strength: 0 };
  }
}

/**
 * Fear & Greed Index 신호 생성 (실제 Alternative.me API)
 *
 * Fear & Greed Index 해석:
 * - 0-25: Extreme Fear → 매수 기회 (LONG)
 * - 26-45: Fear → 매수 고려 (LONG)
 * - 46-55: Neutral → 관망
 * - 56-75: Greed → 매도 고려 (SHORT)
 * - 76-100: Extreme Greed → 매도 기회 (SHORT)
 */
async function generateFearGreedSignal(): Promise<{
  signal: 'long' | 'short' | 'neutral';
  strength: number;
}> {
  try {
    const fngData = await fearGreedService.getFearGreedIndex();
    const interpretation = fearGreedService.getSignalInterpretation(fngData.value);

    console.log(
      `📊 Fear & Greed Index: ${fngData.value} (${fngData.valueClassification}) → ${interpretation.signal.toUpperCase()} ${interpretation.strength.toFixed(0)}%`
    );

    return {
      signal: interpretation.signal,
      strength: Math.min(100, interpretation.strength)
    };
  } catch (error) {
    console.error('Error generating Fear & Greed signal:', error);
    return { signal: 'neutral', strength: 40 };
  }
}
