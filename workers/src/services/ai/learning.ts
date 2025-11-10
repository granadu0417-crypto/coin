// AI 전문가 학습 시스템 (Phase 1 & Phase 2)

import type {
  ExpertProfile,
  Prediction,
  IndicatorImportance,
  IndicatorWeights
} from '../../types/ai';
import { getExpertProfile } from './experts';

/**
 * Phase 1-3: 수익률 기반 동적 학습률 계산
 *
 * 1% 수익 → 5% 학습률 (1.0x)
 * 2% 수익 → 7% 학습률 (1.4x)
 * 5% 수익 → 10% 학습률 (2.0x)
 * 10% 수익 → 13% 학습률 (2.6x)
 * 최대 15%로 제한 (과도한 조정 방지)
 */
export function calculateDynamicLearningRate(profitPercent: number, baseRate: number = 0.05): number {
  const absProfitPercent = Math.abs(profitPercent);
  let multiplier = 1.0;

  if (absProfitPercent >= 1.0) {
    // 로그 스케일로 증가 (급격한 증가 방지)
    multiplier = 1 + Math.log(absProfitPercent) / Math.log(2);
  } else {
    // 1% 미만은 약한 학습
    multiplier = 0.5;
  }

  const adjustedRate = baseRate * multiplier;

  // 최대 15%로 제한
  return Math.min(adjustedRate, 0.15);
}

/**
 * Phase 1-4 & Phase 2: 지표별 학습 + 최근 성과 추적 + 임계값 조정
 *
 * 지표별 가중치 조정:
 * - 성공 + 지표가 최종 시그널과 일치 → 가중치 +학습률
 * - 성공 + 지표가 최종 시그널과 불일치 → 가중치 -학습률*0.6
 * - 실패 + 지표가 최종 시그널과 일치 → 가중치 -학습률
 * - 실패 + 지표가 최종 시그널과 불일치 → 가중치 +학습률*0.6
 *
 * 가중치 범위: 0.05 ~ 1.0
 */
export function learnFromResult(
  expert: ExpertProfile,
  prediction: Prediction,
  isSuccess: boolean
): ExpertProfile {
  const { timeframe, signal: finalSignal, profitPercent, indicatorContributions } = prediction;

  if (!profitPercent) {
    console.log(`⚠️ 수익률 정보 없음, 학습 건너뜀`);
    return expert;
  }

  // Phase 1-3: 동적 학습률 계산
  const learningRate = calculateDynamicLearningRate(profitPercent);

  console.log(`📚 전문가 #${expert.id} 학습 시작:`, {
    timeframe,
    success: isSuccess,
    profit: `${profitPercent.toFixed(2)}%`,
    learningRate: `${(learningRate * 100).toFixed(1)}%`
  });

  // Phase 1-4: 지표별 가중치 조정
  const weights = expert.weights[timeframe];
  const indicators = Object.keys(indicatorContributions);

  indicators.forEach(indicator => {
    const contrib = indicatorContributions[indicator];
    const currentWeight = weights[indicator as keyof IndicatorWeights];
    const agreedWithFinal = (contrib.signal === finalSignal);

    let newWeight: number;

    if (isSuccess) {
      if (agreedWithFinal) {
        // 성공 + 일치 → 강화
        newWeight = currentWeight * (1 + learningRate);
        console.log(`  ✅ ${indicator}: ${currentWeight.toFixed(2)} → ${newWeight.toFixed(2)} (강화)`);
      } else {
        // 성공 + 불일치 → 약화 (60%)
        newWeight = currentWeight * (1 - learningRate * 0.6);
        console.log(`  ⚠️ ${indicator}: ${currentWeight.toFixed(2)} → ${newWeight.toFixed(2)} (약화)`);
      }
    } else {
      if (agreedWithFinal) {
        // 실패 + 일치 → 페널티
        newWeight = currentWeight * (1 - learningRate);
        console.log(`  ❌ ${indicator}: ${currentWeight.toFixed(2)} → ${newWeight.toFixed(2)} (페널티)`);
      } else {
        // 실패 + 불일치 → 보상 (60%)
        newWeight = currentWeight * (1 + learningRate * 0.6);
        console.log(`  💡 ${indicator}: ${currentWeight.toFixed(2)} → ${newWeight.toFixed(2)} (보상)`);
      }
    }

    // 가중치 범위 제한: 0.05 ~ 1.0
    weights[indicator as keyof IndicatorWeights] = Math.max(0.05, Math.min(1.0, newWeight));
  });

  // Phase 2-2: 최근 성과 추적 (최대 10개)
  if (!expert.recentPerformance[timeframe]) {
    expert.recentPerformance[timeframe] = [];
  }
  expert.recentPerformance[timeframe].push(isSuccess);
  if (expert.recentPerformance[timeframe].length > 10) {
    expert.recentPerformance[timeframe].shift();
  }

  // Phase 2-1: 신뢰도 임계값 동적 조정
  adjustConfidenceThreshold(expert, timeframe);

  return expert;
}

/**
 * Phase 2-1: 최근 성과 기반 신뢰도 임계값 조정
 *
 * 최근 성공률 < 40% → 임계값 +2% (더 엄격하게)
 * 최근 성공률 > 70% → 임계값 -1% (더 많이 예측)
 *
 * 임계값 범위: 0.35 ~ 0.75
 */
export function adjustConfidenceThreshold(
  expert: ExpertProfile,
  timeframe: '5m' | '10m' | '30m' | '1h'
): void {
  const recent = expert.recentPerformance[timeframe] || [];

  // 최소 5개의 결과가 있어야 조정
  if (recent.length < 5) return;

  const recentSuccessRate = recent.filter(r => r).length / recent.length;
  const currentThreshold = expert.confidenceThreshold[timeframe];

  if (recentSuccessRate < 0.4) {
    // 성과 나쁨 → 더 엄격하게 (임계값 상승)
    const newThreshold = Math.min(currentThreshold + 0.02, 0.75);
    console.log(`  🔒 임계값 조정: ${(currentThreshold * 100).toFixed(0)}% → ${(newThreshold * 100).toFixed(0)}% (엄격)`);
    expert.confidenceThreshold[timeframe] = newThreshold;
  } else if (recentSuccessRate > 0.7) {
    // 성과 좋음 → 더 느슨하게 (임계값 하락)
    const newThreshold = Math.max(currentThreshold - 0.01, 0.35);
    console.log(`  🔓 임계값 조정: ${(currentThreshold * 100).toFixed(0)}% → ${(newThreshold * 100).toFixed(0)}% (느슨)`);
    expert.confidenceThreshold[timeframe] = newThreshold;
  }
}

/**
 * Phase 2-3: 실시간 지표 중요도 계산
 *
 * 최근 N개의 예측을 분석하여 각 지표가 성공 예측에 얼마나 기여했는지 계산
 *
 * @param predictions 최근 예측 기록 (최대 lookback개)
 * @param expertId 전문가 ID
 * @param timeframe 타임프레임
 * @param lookback 분석할 최근 예측 개수 (기본 30개)
 * @returns 지표별 중요도 (0-1 스코어)
 */
export function calculateIndicatorImportance(
  predictions: Prediction[],
  expertId: number,
  timeframe: '5m' | '10m' | '30m' | '1h',
  lookback: number = 30
): IndicatorImportance | null {
  // 해당 전문가 + 타임프레임의 완료된 예측만 필터링
  const recentTests = predictions
    .filter(p =>
      p.expertId === expertId &&
      p.timeframe === timeframe &&
      (p.status === 'success' || p.status === 'fail')
    )
    .slice(-lookback);

  // 최소 10개의 결과가 있어야 분석
  if (recentTests.length < 10) {
    return null;
  }

  const indicators = ['rsi', 'macd', 'bollinger', 'funding', 'volume', 'trend', 'fearGreed'];
  const importance: IndicatorImportance = {};

  // 각 지표의 기여도 상위 30% 임계값 계산
  const allContributions = recentTests
    .flatMap(test =>
      Object.values(test.indicatorContributions || {})
        .map(c => Math.abs(c.contribution))
    )
    .filter(c => c > 0)
    .sort((a, b) => b - a);

  const threshold = allContributions[Math.floor(allContributions.length * 0.3)] || 0;

  // 각 지표별 중요도 계산
  indicators.forEach(indicator => {
    // 해당 지표가 강한 시그널을 보낸 테스트들 (상위 30%)
    const strongSignalTests = recentTests.filter(test => {
      const contrib = test.indicatorContributions?.[indicator];
      if (!contrib) return false;
      const absContrib = Math.abs(contrib.contribution);
      return absContrib >= threshold;
    });

    if (strongSignalTests.length > 0) {
      // 강한 시그널을 보냈을 때의 성공률
      const successCount = strongSignalTests.filter(t => t.status === 'success').length;
      importance[indicator] = successCount / strongSignalTests.length;
    } else {
      importance[indicator] = 0.5; // 중립
    }
  });

  console.log(`📊 지표 중요도 (전문가 #${expertId}, ${timeframe}):`, importance);
  return importance;
}

/**
 * 가중치를 지표 중요도에 따라 조정
 *
 * 중요도 > 0.65 → 가중치 +15%
 * 중요도 < 0.35 → 가중치 -15%
 */
export function applyIndicatorImportance(
  baseWeights: IndicatorWeights,
  importance: IndicatorImportance | null
): IndicatorWeights {
  if (!importance) {
    return { ...baseWeights };
  }

  const adjustedWeights = { ...baseWeights };

  Object.keys(adjustedWeights).forEach(indicator => {
    const key = indicator as keyof IndicatorWeights;
    const importanceScore = importance[indicator];

    if (importanceScore !== undefined) {
      if (importanceScore > 0.65) {
        adjustedWeights[key] *= 1.15; // +15%
      } else if (importanceScore < 0.35) {
        adjustedWeights[key] *= 0.85; // -15%
      }
    }
  });

  return adjustedWeights;
}
