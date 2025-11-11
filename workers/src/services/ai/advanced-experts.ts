// 고급 전문가 로직 (메타 앙상블, 패턴 학습, 역발상)

import type { D1Database } from '@cloudflare/workers-types';
import type { Prediction, TechnicalSignals, Timeframe } from '../../types/ai';
import { predictByExpert } from './predictions';
import { EXPERT_IDS } from './experts';

/**
 * Expert #11: 메타 앙상블 전문가
 *
 * 전략: 10개 전문가의 최근 1시간 성과를 분석해서
 *       가장 잘하는 상위 3명의 신호를 가중 평균
 *
 * @returns 합의 신호 70% 이상일 때만 예측 반환
 */
export async function predictByMetaEnsemble(
  db: D1Database,
  coin: 'btc' | 'eth',
  timeframe: Timeframe,
  signals: TechnicalSignals,
  currentPrice: number,
  allPredictions: Prediction[]
): Promise<Prediction | null> {
  try {
    // 1. 최근 1시간 전문가별 성과 조회 (Expert #1-10만)
    const expertPerformance: { expertId: number; winRate: number; totalTrades: number }[] = [];

    for (const expertId of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const result = await db
        .prepare(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN profit_percent > 0 THEN 1 ELSE 0 END) as wins
          FROM trading_sessions
          WHERE expert_id = ?
            AND coin = ?
            AND exit_time >= datetime('now', '-1 hour')
            AND status LIKE 'closed%'
        `)
        .bind(expertId, coin)
        .first();

      const total = (result?.total as number) || 0;
      const wins = (result?.wins as number) || 0;
      const winRate = total > 0 ? (wins / total) * 100 : 50; // 기본값 50%

      expertPerformance.push({ expertId, winRate, totalTrades: total });
    }

    // 2. 상위 3명 선택 (승률 기준)
    const top3 = expertPerformance
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 3);

    console.log(
      `🧠 메타 앙상블: TOP 3 전문가 - ${top3.map(e => `#${e.expertId}(${e.winRate.toFixed(0)}%)`).join(', ')}`
    );

    // 3. 상위 3명의 예측 가져오기
    const top3Predictions = allPredictions.filter(p =>
      top3.some(t => t.expertId === p.expertId)
    );

    if (top3Predictions.length < 2) {
      console.log('⚠️ 메타 앙상블: 상위 전문가 예측 부족');
      return null;
    }

    // 4. 가중 평균 계산 (승률 기반)
    let longScore = 0;
    let shortScore = 0;
    let totalWeight = 0;

    top3Predictions.forEach(pred => {
      const expert = top3.find(e => e.expertId === pred.expertId)!;
      const weight = expert.winRate;

      if (pred.signal === 'long') {
        longScore += weight;
      } else if (pred.signal === 'short') {
        shortScore += weight;
      }

      totalWeight += weight;
    });

    // 5. 합의 신호 결정 (70% 이상)
    const longPercent = (longScore / totalWeight) * 100;
    const shortPercent = (shortScore / totalWeight) * 100;

    let finalSignal: 'long' | 'short' | 'neutral';
    let confidence: number;

    if (longPercent >= 70) {
      finalSignal = 'long';
      confidence = longPercent;
    } else if (shortPercent >= 70) {
      finalSignal = 'short';
      confidence = shortPercent;
    } else {
      finalSignal = 'neutral';
      confidence = 0;
    }

    if (confidence < 70) {
      console.log(`⚠️ 메타 앙상블: 합의 부족 L:${longPercent.toFixed(0)}% S:${shortPercent.toFixed(0)}%`);
      return null;
    }

    console.log(
      `🎯 메타 앙상블: ${finalSignal.toUpperCase()} ${confidence.toFixed(0)}% (L:${longPercent.toFixed(0)}% S:${shortPercent.toFixed(0)}%)`
    );

    return {
      expertId: 11,
      coin,
      timeframe,
      signal: finalSignal,
      confidence,
      entryPrice: currentPrice,
      status: 'pending',
      indicatorContributions: {},
      createdAt: new Date()
    };
  } catch (error) {
    console.error('❌ 메타 앙상블 오류:', error);
    return null;
  }
}

/**
 * Expert #12: 패턴 학습 전문가
 *
 * 전략: 과거 수익률 >5% 거래의 지표 패턴을 학습
 *       현재 지표와 유사도 80% 이상일 때만 진입
 */
export async function predictByPatternLearning(
  db: D1Database,
  coin: 'btc' | 'eth',
  timeframe: Timeframe,
  signals: TechnicalSignals,
  currentPrice: number
): Promise<Prediction | null> {
  try {
    // 1. 과거 성공 패턴 조회 (수익률 >5%, 최근 100개)
    const successfulTrades = await db
      .prepare(`
        SELECT
          position,
          entry_indicators,
          leveraged_profit_percent
        FROM trading_sessions
        WHERE coin = ?
          AND leveraged_profit_percent > 5
          AND status = 'closed_win'
          AND entry_indicators IS NOT NULL
        ORDER BY exit_time DESC
        LIMIT 100
      `)
      .bind(coin)
      .all();

    if (successfulTrades.results.length < 10) {
      console.log('⚠️ 패턴 헌터: 학습 데이터 부족');
      return null;
    }

    // 2. 현재 지표 값 추출
    const currentIndicators = {
      rsi: signals.rsi.strength,
      macd: signals.macd.strength,
      bollinger: signals.bollinger.strength,
      funding: signals.funding.strength,
      volume: signals.volume.strength,
      trend: signals.trend.strength,
      fearGreed: signals.fearGreed.strength
    };

    // 3. 각 과거 패턴과 유사도 계산
    let bestMatch: {
      similarity: number;
      position: 'long' | 'short';
      profit: number;
    } | null = null;

    for (const trade of successfulTrades.results) {
      if (!trade.entry_indicators) continue;

      const pastIndicators = JSON.parse(trade.entry_indicators as string);

      // 유사도 계산 (0-100)
      const similarity = calculateIndicatorSimilarity(currentIndicators, pastIndicators);

      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = {
          similarity,
          position: trade.position as 'long' | 'short',
          profit: trade.leveraged_profit_percent as number
        };
      }
    }

    // 4. 유사도 80% 이상일 때만 진입
    if (!bestMatch || bestMatch.similarity < 80) {
      console.log(`⚠️ 패턴 헌터: 유사 패턴 없음 (최대 유사도: ${bestMatch?.similarity.toFixed(0)}%)`);
      return null;
    }

    const confidence = bestMatch.similarity;

    console.log(
      `🎯 패턴 헌터: ${bestMatch.position.toUpperCase()} ${confidence.toFixed(0)}% (과거 수익: +${bestMatch.profit.toFixed(1)}%)`
    );

    return {
      expertId: 12,
      coin,
      timeframe,
      signal: bestMatch.position,
      confidence,
      entryPrice: currentPrice,
      status: 'pending',
      indicatorContributions: {},
      createdAt: new Date()
    };
  } catch (error) {
    console.error('❌ 패턴 헌터 오류:', error);
    return null;
  }
}

/**
 * Expert #13: 역발상 전문가
 *
 * 전략: 10개 전문가 중 8개 이상이 같은 방향 예측
 *       BUT 최근 1시간 집단 성과 50% 미만
 *       → 반대로 진입!
 */
export async function predictByContrarian(
  db: D1Database,
  coin: 'btc' | 'eth',
  timeframe: Timeframe,
  signals: TechnicalSignals,
  currentPrice: number,
  allPredictions: Prediction[]
): Promise<Prediction | null> {
  try {
    // 1. Fear & Greed Extreme 구간 체크 (25 미만 또는 75 이상)
    const fearGreedValue = signals.fearGreed.strength;
    const isExtreme = fearGreedValue < 25 || fearGreedValue > 75;

    if (!isExtreme) {
      console.log(`⚠️ 역발상: Fear&Greed 극단 구간 아님 (${fearGreedValue})`);
      return null;
    }

    // 2. Expert #1-10의 예측 집계
    const expertPredictions = allPredictions.filter(p => p.expertId <= 10);

    if (expertPredictions.length < 8) {
      console.log('⚠️ 역발상: 전문가 예측 부족');
      return null;
    }

    const longCount = expertPredictions.filter(p => p.signal === 'long').length;
    const shortCount = expertPredictions.filter(p => p.signal === 'short').length;

    // 3. 8개 이상 같은 방향?
    let majoritySignal: 'long' | 'short' | null = null;
    let majorityCount = 0;

    if (longCount >= 8) {
      majoritySignal = 'long';
      majorityCount = longCount;
    } else if (shortCount >= 8) {
      majoritySignal = 'short';
      majorityCount = shortCount;
    }

    if (!majoritySignal) {
      console.log(`⚠️ 역발상: 합의 부족 (L:${longCount} S:${shortCount})`);
      return null;
    }

    // 4. 최근 1시간 집단 성과 확인
    const recentPerformance = await db
      .prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN profit_percent > 0 THEN 1 ELSE 0 END) as wins
        FROM trading_sessions
        WHERE coin = ?
          AND exit_time >= datetime('now', '-1 hour')
          AND status LIKE 'closed%'
          AND expert_id <= 10
      `)
      .bind(coin)
      .first();

    const total = (recentPerformance?.total as number) || 0;
    const wins = (recentPerformance?.wins as number) || 0;
    const winRate = total > 0 ? (wins / total) * 100 : 50;

    // 5. 집단 성과 50% 미만이면 반대로!
    if (winRate >= 50) {
      console.log(`⚠️ 역발상: 집단 성과 양호 (${winRate.toFixed(0)}%)`);
      return null;
    }

    // 6. 반대 신호 생성
    const contrarianSignal: 'long' | 'short' = majoritySignal === 'long' ? 'short' : 'long';
    const confidence = 70 + (50 - winRate); // 집단 성과가 낮을수록 신뢰도 증가

    console.log(
      `🦅 역발상: ${contrarianSignal.toUpperCase()} ${confidence.toFixed(0)}% (합의: ${majoritySignal} ${majorityCount}/10, 집단성과: ${winRate.toFixed(0)}%)`
    );

    return {
      expertId: 13,
      coin,
      timeframe,
      signal: contrarianSignal,
      confidence,
      entryPrice: currentPrice,
      status: 'pending',
      indicatorContributions: {},
      createdAt: new Date()
    };
  } catch (error) {
    console.error('❌ 역발상 오류:', error);
    return null;
  }
}

/**
 * 지표 유사도 계산 (0-100)
 */
function calculateIndicatorSimilarity(
  current: Record<string, number>,
  past: Record<string, number>
): number {
  const indicators = ['rsi', 'macd', 'bollinger', 'funding', 'volume', 'trend', 'fearGreed'];
  let totalSimilarity = 0;
  let count = 0;

  for (const indicator of indicators) {
    const currentVal = current[indicator];
    const pastVal = past[indicator];

    if (currentVal === undefined || pastVal === undefined) continue;

    // 거리 기반 유사도 (0-100 범위)
    const distance = Math.abs(currentVal - pastVal);
    const similarity = Math.max(0, 100 - distance);

    totalSimilarity += similarity;
    count++;
  }

  return count > 0 ? totalSimilarity / count : 0;
}
