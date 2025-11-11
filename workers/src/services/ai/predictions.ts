// AI 전문가 예측 생성 시스템

import type {
  ExpertProfile,
  Prediction,
  TechnicalSignals,
  IndicatorContributions,
  IndicatorImportance,
  IndicatorWeights,
  Timeframe
} from '../../types/ai';
import type { D1Database } from '@cloudflare/workers-types';
import { getExpertProfile, EXPERT_IDS } from './experts';
import { applyIndicatorImportance } from './learning';
import {
  predictByMetaEnsemble,
  predictByPatternLearning,
  predictByContrarian
} from './advanced-experts';

/**
 * Phase 1-1 & Phase 1-2 & Phase 2-3: 전문가별 예측 생성
 *
 * 타임프레임별 가중치 사용 + 지표별 기여도 추적 + 실시간 중요도 반영
 *
 * @param expertId 전문가 ID (1-10)
 * @param coin 코인 ('btc' | 'eth')
 * @param timeframe 타임프레임 ('5m' | '10m' | '30m' | '1h')
 * @param signals 기술적 지표 시그널
 * @param currentPrice 현재 가격
 * @param indicatorImportance 실시간 지표 중요도 (Phase 2-3, optional)
 * @returns 예측 결과 또는 null (신뢰도 미달 시)
 */
export function predictByExpert(
  expertId: number,
  coin: 'btc' | 'eth',
  timeframe: Timeframe,
  signals: TechnicalSignals,
  currentPrice: number,
  indicatorImportance?: IndicatorImportance | null
): Prediction | null {
  const expert = getExpertProfile(expertId);
  if (!expert) {
    console.error(`❌ 전문가 #${expertId} 프로필 없음`);
    return null;
  }

  // Phase 1-1: 타임프레임별 가중치 사용 (없으면 1h 가중치 사용)
  const baseWeights = expert.weights[timeframe] || expert.weights['1h'] || expert.weights['5m'];

  // Phase 2-3: 실시간 지표 중요도 반영
  const weights = applyIndicatorImportance(baseWeights, indicatorImportance);

  let longScore = 0;
  let shortScore = 0;
  let totalWeight = 0;

  // Phase 1-2: 지표별 기여도 추적
  const indicatorContributions: IndicatorContributions = {};

  // 각 지표별로 가중치 적용하여 점수 계산
  Object.keys(signals).forEach(signalKey => {
    const signal = signals[signalKey as keyof TechnicalSignals];
    const weight = weights[signalKey as keyof IndicatorWeights];

    if (!signal || weight === undefined) return;

    const strength = signal.strength;
    const contribution = strength * weight;

    // 지표별 기여도 기록
    indicatorContributions[signalKey] = {
      signal: signal.signal,
      strength,
      weight,
      contribution
    };

    if (signal.signal === 'long') {
      longScore += contribution;
    } else if (signal.signal === 'short') {
      shortScore += contribution;
    }

    totalWeight += weight;
  });

  // 신호 결정
  let finalSignal: 'long' | 'short' | 'neutral';
  let confidence: number;

  if (longScore > shortScore * 1.15) {
    finalSignal = 'long';
    confidence = (longScore / (longScore + shortScore)) * 100;
  } else if (shortScore > longScore * 1.15) {
    finalSignal = 'short';
    confidence = (shortScore / (longScore + shortScore)) * 100;
  } else {
    finalSignal = 'neutral';
    confidence = 0;
  }

  // Phase 2-1: 신뢰도 임계값 필터링 (없으면 1h 임계값 사용)
  const threshold = expert.confidenceThreshold[timeframe] || expert.confidenceThreshold['1h'] || 0.40;
  const confidenceDecimal = confidence / 100;

  if (confidenceDecimal < threshold) {
    console.log(
      `⚠️ 전문가 #${expertId} (${timeframe}): 신뢰도 ${confidence.toFixed(0)}% < 임계값 ${(threshold * 100).toFixed(0)}% → 예측 거부`
    );
    return null;
  }

  // 예측 객체 생성
  const prediction: Prediction = {
    expertId,
    coin,
    timeframe,
    signal: finalSignal,
    confidence,
    entryPrice: currentPrice,
    status: 'pending',
    indicatorContributions,
    createdAt: new Date()
  };

  console.log(
    `🎯 전문가 #${expertId} (${timeframe}) 예측:`,
    `${finalSignal.toUpperCase()} ${confidence.toFixed(0)}% @ $${currentPrice.toFixed(2)}`
  );

  return prediction;
}

/**
 * 모든 전문가의 예측 생성 (전문가 #1-10)
 *
 * @param coin 코인 ('btc' | 'eth')
 * @param timeframe 타임프레임 ('5m' | '10m' | '30m' | '1h')
 * @param signals 기술적 지표 시그널
 * @param currentPrice 현재 가격
 * @param importanceMap 전문가별 지표 중요도 맵 (optional)
 * @returns 예측 결과 배열
 */
export function getAllExpertPredictions(
  coin: 'btc' | 'eth',
  timeframe: Timeframe,
  signals: TechnicalSignals,
  currentPrice: number,
  importanceMap?: Map<number, IndicatorImportance>
): Prediction[] {
  const predictions: Prediction[] = [];

  // 기본 전문가 #1-10만 처리
  const basicExpertIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  basicExpertIds.forEach(expertId => {
    const importance = importanceMap?.get(expertId) || null;
    const prediction = predictByExpert(
      expertId,
      coin,
      timeframe,
      signals,
      currentPrice,
      importance
    );

    if (prediction) {
      predictions.push(prediction);
    }
  });

  console.log(
    `📊 ${coin.toUpperCase()} ${timeframe}: ${predictions.length}/10 전문가 예측 생성`
  );

  return predictions;
}

/**
 * 고급 전문가 포함 모든 예측 생성 (전문가 #1-13)
 *
 * @param db D1 Database
 * @param coin 코인 ('btc' | 'eth')
 * @param timeframe 타임프레임 ('5m' | '10m' | '30m' | '1h')
 * @param signals 기술적 지표 시그널
 * @param currentPrice 현재 가격
 * @param importanceMap 전문가별 지표 중요도 맵 (optional)
 * @returns 예측 결과 배열 (최대 13개)
 */
export async function getAllExpertPredictionsWithAdvanced(
  db: D1Database,
  coin: 'btc' | 'eth',
  timeframe: Timeframe,
  signals: TechnicalSignals,
  currentPrice: number,
  importanceMap?: Map<number, IndicatorImportance>
): Promise<Prediction[]> {
  // 1. 기본 전문가 #1-10 예측 생성
  const basicPredictions = getAllExpertPredictions(
    coin,
    timeframe,
    signals,
    currentPrice,
    importanceMap
  );

  // 2. 고급 전문가 #11-13 예측 생성
  const advancedPredictions: (Prediction | null)[] = await Promise.all([
    // Expert #11: 메타 앙상블 (상위 3개 전문가 성과 기반)
    predictByMetaEnsemble(db, coin, timeframe, signals, currentPrice, basicPredictions),

    // Expert #12: 패턴 학습 (과거 성공 패턴 매칭)
    predictByPatternLearning(db, coin, timeframe, signals, currentPrice),

    // Expert #13: 역발상 (군중 심리 역이용)
    predictByContrarian(db, coin, timeframe, signals, currentPrice, basicPredictions)
  ]);

  // 3. null 제거하고 합치기
  const allPredictions = [
    ...basicPredictions,
    ...advancedPredictions.filter(p => p !== null) as Prediction[]
  ];

  console.log(
    `🧠 ${coin.toUpperCase()} ${timeframe}: ${allPredictions.length}/13 전문가 예측 생성 (고급 ${advancedPredictions.filter(p => p !== null).length}개 포함)`
  );

  return allPredictions;
}

/**
 * 예측 검증 (타임프레임 후 가격과 비교)
 *
 * 레버리지 20배 기준 최소 5% 수익률 달성 시 성공
 * - 실제 가격 변동 0.25% = 레버리지 수익 5%
 * - 실제 가격 변동 0.5% = 레버리지 수익 10%
 *
 * @param prediction 예측 객체
 * @param exitPrice 검증 시점 가격
 * @returns 업데이트된 예측 객체
 */
export function verifyPrediction(prediction: Prediction, exitPrice: number): Prediction {
  const { signal, entryPrice } = prediction;

  prediction.exitPrice = exitPrice;
  prediction.checkedAt = new Date();

  // 실제 가격 변동률 계산
  const priceChangePercent = ((exitPrice - entryPrice) / entryPrice) * 100;

  // 레버리지 20배 적용 수익률 계산
  const LEVERAGE = 20;
  const MIN_PROFIT_PERCENT = 5; // 최소 5% 수익률

  const leveragedProfit = priceChangePercent * LEVERAGE;
  prediction.profitPercent = leveragedProfit;

  // 성공 여부 판단 (레버리지 기준 최소 5% 수익)
  if (signal === 'long' && leveragedProfit >= MIN_PROFIT_PERCENT) {
    // 롱 포지션: 가격 상승 시 수익 (레버리지 수익 5% 이상)
    prediction.status = 'success';
  } else if (signal === 'short' && leveragedProfit <= -MIN_PROFIT_PERCENT) {
    // 숏 포지션: 가격 하락 시 수익 (레버리지 수익 5% 이상, 음수로 표현)
    prediction.status = 'success';
  } else if (signal === 'neutral') {
    // neutral은 항상 성공으로 간주 (예측 거부)
    prediction.status = 'success';
  } else {
    prediction.status = 'fail';
  }

  console.log(
    `${prediction.status === 'success' ? '✅' : '❌'} 전문가 #${prediction.expertId} (${prediction.timeframe}):`,
    `${signal.toUpperCase()} 실제=${priceChangePercent > 0 ? '+' : ''}${priceChangePercent.toFixed(3)}% x20 = ${leveragedProfit > 0 ? '+' : ''}${leveragedProfit.toFixed(2)}%`
  );

  return prediction;
}

/**
 * 컨센서스 계산 (전문가들의 종합 의견)
 *
 * @param predictions 예측 배열
 * @returns 컨센서스 정보
 */
export function calculateConsensus(predictions: Prediction[]): {
  signal: 'long' | 'short' | 'neutral';
  confidence: number;
  longCount: number;
  shortCount: number;
  neutralCount: number;
  totalExperts: number;
} {
  const longPredictions = predictions.filter(p => p.signal === 'long');
  const shortPredictions = predictions.filter(p => p.signal === 'short');
  const neutralPredictions = predictions.filter(p => p.signal === 'neutral');

  const longCount = longPredictions.length;
  const shortCount = shortPredictions.length;
  const neutralCount = neutralPredictions.length;
  const totalExperts = predictions.length;

  let signal: 'long' | 'short' | 'neutral';
  let confidence: number;

  if (longCount > shortCount && longCount > neutralCount) {
    signal = 'long';
    confidence = (longCount / totalExperts) * 100;
  } else if (shortCount > longCount && shortCount > neutralCount) {
    signal = 'short';
    confidence = (shortCount / totalExperts) * 100;
  } else {
    signal = 'neutral';
    confidence = (neutralCount / totalExperts) * 100;
  }

  return {
    signal,
    confidence,
    longCount,
    shortCount,
    neutralCount,
    totalExperts
  };
}

/**
 * 가중치 컨센서스 계산 (최근 성과 기반)
 *
 * @param predictions 예측 배열
 * @param expertStats 전문가별 최근 성과 (승률)
 * @returns 가중치 적용된 컨센서스
 */
export function calculateWeightedConsensus(
  predictions: Prediction[],
  expertStats: Map<number, number> // expertId -> 최근 승률 (0-100)
): {
  signal: 'long' | 'short' | 'neutral';
  confidence: number;
  weightedLongScore: number;
  weightedShortScore: number;
  weightedNeutralScore: number;
} {
  let weightedLongScore = 0;
  let weightedShortScore = 0;
  let weightedNeutralScore = 0;
  let totalWeight = 0;

  for (const pred of predictions) {
    // 승률을 가중치로 사용 (기본값 50%)
    const weight = expertStats.get(pred.expertId) || 50;

    if (pred.signal === 'long') {
      weightedLongScore += weight;
    } else if (pred.signal === 'short') {
      weightedShortScore += weight;
    } else {
      weightedNeutralScore += weight;
    }

    totalWeight += weight;
  }

  // 백분율로 변환
  const longPercent = totalWeight > 0 ? (weightedLongScore / totalWeight) * 100 : 0;
  const shortPercent = totalWeight > 0 ? (weightedShortScore / totalWeight) * 100 : 0;
  const neutralPercent = totalWeight > 0 ? (weightedNeutralScore / totalWeight) * 100 : 0;

  let signal: 'long' | 'short' | 'neutral';
  let confidence: number;

  if (longPercent > shortPercent && longPercent > neutralPercent) {
    signal = 'long';
    confidence = longPercent;
  } else if (shortPercent > longPercent && shortPercent > neutralPercent) {
    signal = 'short';
    confidence = shortPercent;
  } else {
    signal = 'neutral';
    confidence = neutralPercent;
  }

  return {
    signal,
    confidence,
    weightedLongScore,
    weightedShortScore,
    weightedNeutralScore
  };
}

/**
 * 신호 강도 점수 계산 (0-100)
 *
 * 계산 방식:
 * - 컨센서스 일치도 (40%)
 * - 상위 3개 모델 평균 승률 (30%)
 * - 최근 1시간 성과 (20%)
 * - 신호 신선도 (10%)
 */
export function calculateSignalStrength(
  predictions: Prediction[],
  expertStats: Map<number, number>, // expertId -> 최근 승률
  recentSuccessRate: number, // 최근 1시간 전체 승률 (0-100)
  signalAgeMinutes: number // 신호 생성 후 경과 시간 (분)
): number {
  // 1. 컨센서스 일치도 (40%)
  const consensus = calculateWeightedConsensus(predictions, expertStats);
  const consensusScore = consensus.confidence; // 이미 0-100

  // 2. 상위 3개 모델 평균 승률 (30%)
  const sortedStats = Array.from(expertStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const top3AvgRate = sortedStats.length > 0
    ? sortedStats.reduce((sum, [_, rate]) => sum + rate, 0) / sortedStats.length
    : 50;

  // 3. 최근 1시간 성과 (20%)
  const recentScore = recentSuccessRate; // 이미 0-100

  // 4. 신호 신선도 (10%)
  let freshnessScore: number;
  if (signalAgeMinutes <= 2) {
    freshnessScore = 100; // Fresh
  } else if (signalAgeMinutes <= 5) {
    freshnessScore = 75; // Good
  } else if (signalAgeMinutes <= 10) {
    freshnessScore = 50; // Old
  } else {
    freshnessScore = 25; // Stale
  }

  // 최종 점수 계산
  const finalScore =
    (consensusScore * 0.4) +
    (top3AvgRate * 0.3) +
    (recentScore * 0.2) +
    (freshnessScore * 0.1);

  return Math.round(finalScore);
}

/**
 * 매수/대기 추천 결정
 */
export function getTradingRecommendation(signalStrength: number): {
  action: 'strong_buy' | 'buy' | 'cautious' | 'wait' | 'avoid';
  actionKr: string;
  emoji: string;
  color: string;
  description: string;
} {
  if (signalStrength >= 90) {
    return {
      action: 'strong_buy',
      actionKr: '강력 매수 추천',
      emoji: '🔥',
      color: 'text-green-400 bg-green-500/20 border-green-500/50',
      description: '최고 수준의 신호입니다. 적극 매수를 고려하세요.'
    };
  } else if (signalStrength >= 75) {
    return {
      action: 'buy',
      actionKr: '매수 추천',
      emoji: '✅',
      color: 'text-green-400 bg-green-500/20 border-green-500/30',
      description: '좋은 신호입니다. 매수를 고려하세요.'
    };
  } else if (signalStrength >= 60) {
    return {
      action: 'cautious',
      actionKr: '신중 매수',
      emoji: '⚠️',
      color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50',
      description: '중간 수준의 신호입니다. 신중하게 매수하세요.'
    };
  } else if (signalStrength >= 40) {
    return {
      action: 'wait',
      actionKr: '대기 권장',
      emoji: '⏸️',
      color: 'text-slate-400 bg-slate-500/20 border-slate-500/50',
      description: '확실한 신호가 아닙니다. 대기를 권장합니다.'
    };
  } else {
    return {
      action: 'avoid',
      actionKr: '매수 비추천',
      emoji: '❌',
      color: 'text-red-400 bg-red-500/20 border-red-500/50',
      description: '약한 신호입니다. 매수를 피하세요.'
    };
  }
}
