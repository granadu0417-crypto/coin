// AI 전문가 예측 생성 시스템

import type {
  ExpertProfile,
  Prediction,
  TechnicalSignals,
  IndicatorContributions,
  IndicatorImportance,
  IndicatorWeights
} from '../../types/ai';
import { getExpertProfile, EXPERT_IDS } from './experts';
import { applyIndicatorImportance } from './learning';

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
  timeframe: '5m' | '10m' | '30m' | '1h',
  signals: TechnicalSignals,
  currentPrice: number,
  indicatorImportance?: IndicatorImportance | null
): Prediction | null {
  const expert = getExpertProfile(expertId);
  if (!expert) {
    console.error(`❌ 전문가 #${expertId} 프로필 없음`);
    return null;
  }

  // Phase 1-1: 타임프레임별 가중치 사용
  const baseWeights = expert.weights[timeframe];

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

  // Phase 2-1: 신뢰도 임계값 필터링
  const threshold = expert.confidenceThreshold[timeframe];
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
 * 모든 전문가의 예측 생성
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
  timeframe: '5m' | '10m' | '30m' | '1h',
  signals: TechnicalSignals,
  currentPrice: number,
  importanceMap?: Map<number, IndicatorImportance>
): Prediction[] {
  const predictions: Prediction[] = [];

  EXPERT_IDS.forEach(expertId => {
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
 * 예측 검증 (30초 후 가격과 비교)
 *
 * @param prediction 예측 객체
 * @param exitPrice 30초 후 가격
 * @returns 업데이트된 예측 객체
 */
export function verifyPrediction(prediction: Prediction, exitPrice: number): Prediction {
  const { signal, entryPrice } = prediction;

  prediction.exitPrice = exitPrice;
  prediction.checkedAt = new Date();

  // 수익률 계산
  const profitPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
  prediction.profitPercent = profitPercent;

  // 성공 여부 판단
  if (signal === 'long' && profitPercent > 0) {
    prediction.status = 'success';
  } else if (signal === 'short' && profitPercent < 0) {
    prediction.status = 'success';
  } else if (signal === 'neutral') {
    // neutral은 항상 성공으로 간주 (예측 거부)
    prediction.status = 'success';
  } else {
    prediction.status = 'fail';
  }

  console.log(
    `${prediction.status === 'success' ? '✅' : '❌'} 전문가 #${prediction.expertId} (${prediction.timeframe}):`,
    `${signal.toUpperCase()} ${profitPercent > 0 ? '+' : ''}${profitPercent.toFixed(2)}%`
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
