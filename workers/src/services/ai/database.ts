// D1 데이터베이스 AI 전문가 시스템 연동

import type {
  ExpertProfile,
  Prediction,
  ExpertStats,
  DetailedExpertStats,
  IndicatorWeights,
  ConfidenceThreshold,
  RecentPerformance,
  Timeframe
} from '../../types/ai';
import { expertProfiles } from './experts';

/**
 * D1에서 전문가 가중치 로드
 */
export async function loadExpertWeights(
  db: D1Database,
  expertId: number,
  timeframe: '5m' | '10m' | '30m' | '1h'
): Promise<{
  weights: IndicatorWeights;
  confidenceThreshold: number;
  recentPerformance: boolean[];
} | null> {
  const result = await db
    .prepare(
      'SELECT weights, confidence_threshold, recent_performance FROM expert_weights WHERE expert_id = ? AND timeframe = ?'
    )
    .bind(expertId, timeframe)
    .first();

  if (!result) return null;

  return {
    weights: JSON.parse(result.weights as string),
    confidenceThreshold: result.confidence_threshold as number,
    recentPerformance: result.recent_performance
      ? JSON.parse(result.recent_performance as string)
      : []
  };
}

/**
 * D1에 전문가 가중치 저장
 */
export async function saveExpertWeights(
  db: D1Database,
  expertId: number,
  timeframe: '5m' | '10m' | '30m' | '1h',
  weights: IndicatorWeights,
  confidenceThreshold: number,
  recentPerformance: boolean[]
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO expert_weights (expert_id, timeframe, weights, confidence_threshold, recent_performance, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(expert_id, timeframe) DO UPDATE SET
         weights = excluded.weights,
         confidence_threshold = excluded.confidence_threshold,
         recent_performance = excluded.recent_performance,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      expertId,
      timeframe,
      JSON.stringify(weights),
      confidenceThreshold,
      JSON.stringify(recentPerformance)
    )
    .run();
}

/**
 * D1에 예측 저장
 */
export async function savePrediction(db: D1Database, prediction: Prediction): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO predictions (expert_id, coin, timeframe, signal, confidence, entry_price, status, indicator_contributions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      prediction.expertId,
      prediction.coin,
      prediction.timeframe,
      prediction.signal,
      prediction.confidence,
      prediction.entryPrice,
      prediction.status,
      JSON.stringify(prediction.indicatorContributions),
      prediction.createdAt.toISOString()
    )
    .run();

  return result.meta.last_row_id as number;
}

/**
 * D1에서 대기 중인 예측 조회 (30초 이상 경과)
 */
export async function getPendingPredictions(
  db: D1Database,
  minAgeSeconds: number = 30
): Promise<Prediction[]> {
  const cutoffTime = new Date(Date.now() - minAgeSeconds * 1000).toISOString();

  const results = await db
    .prepare(
      `SELECT * FROM predictions
       WHERE status = 'pending'
       AND created_at <= ?
       ORDER BY created_at ASC`
    )
    .bind(cutoffTime)
    .all();

  return results.results.map(row => ({
    id: row.id as number,
    expertId: row.expert_id as number,
    coin: row.coin as 'btc' | 'eth',
    timeframe: row.timeframe as any, // Timeframe (모든 타임프레임 지원)
    signal: row.signal as 'long' | 'short' | 'neutral',
    confidence: row.confidence as number,
    entryPrice: row.entry_price as number,
    exitPrice: row.exit_price as number | undefined,
    status: row.status as 'pending' | 'success' | 'fail',
    profitPercent: row.profit_percent as number | undefined,
    indicatorContributions: JSON.parse(row.indicator_contributions as string),
    createdAt: new Date(row.created_at as string),
    checkedAt: row.checked_at ? new Date(row.checked_at as string) : undefined
  }));
}

/**
 * D1에 예측 검증 결과 업데이트
 */
export async function updatePredictionResult(
  db: D1Database,
  predictionId: number,
  exitPrice: number,
  status: 'success' | 'fail',
  profitPercent: number
): Promise<void> {
  await db
    .prepare(
      `UPDATE predictions
       SET exit_price = ?, status = ?, profit_percent = ?, checked_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .bind(exitPrice, status, profitPercent, predictionId)
    .run();
}

/**
 * D1에서 최근 예측 기록 조회 (지표 중요도 계산용)
 */
export async function getRecentPredictions(
  db: D1Database,
  expertId: number,
  timeframe: '5m' | '10m' | '30m' | '1h',
  limit: number = 30
): Promise<Prediction[]> {
  const results = await db
    .prepare(
      `SELECT * FROM predictions
       WHERE expert_id = ?
       AND timeframe = ?
       AND status IN ('success', 'fail')
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(expertId, timeframe, limit)
    .all();

  return results.results.map(row => ({
    id: row.id as number,
    expertId: row.expert_id as number,
    coin: row.coin as 'btc' | 'eth',
    timeframe: row.timeframe as '5m' | '10m' | '30m' | '1h',
    signal: row.signal as 'long' | 'short' | 'neutral',
    confidence: row.confidence as number,
    entryPrice: row.entry_price as number,
    exitPrice: row.exit_price as number,
    status: row.status as 'success' | 'fail',
    profitPercent: row.profit_percent as number,
    indicatorContributions: JSON.parse(row.indicator_contributions as string),
    createdAt: new Date(row.created_at as string),
    checkedAt: new Date(row.checked_at as string)
  }));
}

/**
 * D1에서 전문가 통계 조회
 */
export async function getExpertStats(
  db: D1Database,
  expertId: number,
  timeframe: '5m' | '10m' | '30m' | '1h'
): Promise<ExpertStats | null> {
  const result = await db
    .prepare(
      'SELECT * FROM expert_stats WHERE expert_id = ? AND timeframe = ?'
    )
    .bind(expertId, timeframe)
    .first();

  if (!result) return null;

  return {
    expertId: result.expert_id as number,
    timeframe: result.timeframe as '5m' | '10m' | '30m' | '1h',
    totalPredictions: result.total_predictions as number,
    successCount: result.success_count as number,
    failCount: result.fail_count as number,
    pendingCount: result.pending_count as number,
    successRate: result.success_rate as number,
    lastUpdated: new Date(result.last_updated as string)
  };
}

/**
 * D1에 전문가 통계 업데이트
 */
export async function updateExpertStats(
  db: D1Database,
  expertId: number,
  timeframe: '5m' | '10m' | '30m' | '1h'
): Promise<void> {
  // 통계 재계산
  const result = await db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
         SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as fail,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
       FROM predictions
       WHERE expert_id = ? AND timeframe = ?`
    )
    .bind(expertId, timeframe)
    .first();

  if (!result) return;

  const total = result.total as number;
  const success = result.success as number;
  const fail = result.fail as number;
  const pending = result.pending as number;
  const successRate = total > 0 ? (success / (success + fail)) * 100 : 0;

  // 통계 저장
  await db
    .prepare(
      `INSERT INTO expert_stats (expert_id, timeframe, total_predictions, success_count, fail_count, pending_count, success_rate, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(expert_id, timeframe) DO UPDATE SET
         total_predictions = excluded.total_predictions,
         success_count = excluded.success_count,
         fail_count = excluded.fail_count,
         pending_count = excluded.pending_count,
         success_rate = excluded.success_rate,
         last_updated = CURRENT_TIMESTAMP`
    )
    .bind(expertId, timeframe, total, success, fail, pending, successRate)
    .run();
}

/**
 * D1에서 모든 전문가의 전체 통계 조회
 */
export async function getAllExpertStats(db: D1Database): Promise<ExpertStats[]> {
  const results = await db
    .prepare('SELECT * FROM expert_stats ORDER BY expert_id, timeframe')
    .all();

  return results.results.map(row => ({
    expertId: row.expert_id as number,
    timeframe: row.timeframe as '5m' | '10m' | '30m' | '1h',
    totalPredictions: row.total_predictions as number,
    successCount: row.success_count as number,
    failCount: row.fail_count as number,
    pendingCount: row.pending_count as number,
    successRate: row.success_rate as number,
    lastUpdated: new Date(row.last_updated as string)
  }));
}

/**
 * 전문가 프로필을 D1에서 로드 (가중치 + 임계값 + 최근 성과)
 */
export async function loadExpertProfile(
  db: D1Database,
  expertId: number
): Promise<ExpertProfile> {
  // 기본 프로필 가져오기
  const baseProfile = expertProfiles.find(e => e.id === expertId);
  if (!baseProfile) {
    throw new Error(`전문가 #${expertId} 프로필 없음`);
  }

  // D1에서 각 타임프레임별 가중치 로드
  const timeframes: Array<'5m' | '10m' | '30m' | '1h'> = ['5m', '10m', '30m', '1h'];

  for (const timeframe of timeframes) {
    const data = await loadExpertWeights(db, expertId, timeframe);

    if (data) {
      baseProfile.weights[timeframe] = data.weights;
      baseProfile.confidenceThreshold[timeframe] = data.confidenceThreshold;
      baseProfile.recentPerformance[timeframe] = data.recentPerformance;
    }
  }

  return baseProfile;
}

/**
 * 전문가 프로필을 D1에 저장
 */
export async function saveExpertProfile(
  db: D1Database,
  expert: ExpertProfile
): Promise<void> {
  const timeframes: Array<'5m' | '10m' | '30m' | '1h'> = ['5m', '10m', '30m', '1h'];

  for (const timeframe of timeframes) {
    await saveExpertWeights(
      db,
      expert.id,
      timeframe,
      expert.weights[timeframe],
      expert.confidenceThreshold[timeframe],
      expert.recentPerformance[timeframe]
    );
  }
}

/**
 * 연속 성공/실패 횟수 계산 헬퍼 함수
 */
function calculateStreaks(predictions: Prediction[]): {
  currentStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
} {
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  // 시간 순으로 정렬 (오래된 것부터)
  const sorted = [...predictions].sort((a, b) =>
    a.createdAt.getTime() - b.createdAt.getTime()
  );

  for (const pred of sorted) {
    if (pred.status === 'success') {
      tempWinStreak++;
      tempLossStreak = 0;
      currentStreak = tempWinStreak;
    } else if (pred.status === 'fail') {
      tempLossStreak++;
      tempWinStreak = 0;
      currentStreak = -tempLossStreak;
    }

    maxWinStreak = Math.max(maxWinStreak, tempWinStreak);
    maxLossStreak = Math.max(maxLossStreak, tempLossStreak);
  }

  return { currentStreak, maxWinStreak, maxLossStreak };
}

/**
 * 전문가 상세 통계 계산 (투자 판단용)
 */
export async function getDetailedExpertStats(
  db: D1Database,
  coin: 'btc' | 'eth',
  expertId?: number,
  timeframe?: Timeframe
): Promise<DetailedExpertStats[]> {
  // 전문가 프로필 정보 가져오기
  const profiles = expertId
    ? expertProfiles.filter(e => e.id === expertId)
    : expertProfiles;

  const results: DetailedExpertStats[] = [];

  for (const profile of profiles) {
    // 쿼리 조건 구성
    let query = `
      SELECT * FROM predictions
      WHERE coin = ? AND expert_id = ? AND status IN ('success', 'fail')
    `;
    const bindings: any[] = [coin, profile.id];

    if (timeframe) {
      query += ' AND timeframe = ?';
      bindings.push(timeframe);
    }

    query += ' ORDER BY created_at DESC';

    const { results: predictions } = await db
      .prepare(query)
      .bind(...bindings)
      .all();

    // 예측 데이터 변환
    const predictionList: Prediction[] = predictions.map(row => ({
      id: row.id as number,
      expertId: row.expert_id as number,
      coin: row.coin as 'btc' | 'eth',
      timeframe: row.timeframe as Timeframe,
      signal: row.signal as 'long' | 'short' | 'neutral',
      confidence: row.confidence as number,
      entryPrice: row.entry_price as number,
      exitPrice: row.exit_price as number,
      status: row.status as 'success' | 'fail',
      profitPercent: row.profit_percent as number,
      indicatorContributions: JSON.parse(row.indicator_contributions as string),
      createdAt: new Date(row.created_at as string),
      checkedAt: new Date(row.checked_at as string)
    }));

    const total = predictionList.length;
    if (total === 0) {
      // 데이터 없으면 기본값 반환
      results.push({
        expertId: profile.id,
        expertName: profile.name,
        expertEmoji: profile.emoji,
        expertStrategy: profile.strategy,
        coin,
        timeframe,
        totalPredictions: 0,
        successCount: 0,
        failCount: 0,
        pendingCount: 0,
        successRate: 0,
        avgProfit: 0,
        maxProfit: 0,
        maxLoss: 0,
        totalProfit: 0,
        currentStreak: 0,
        maxWinStreak: 0,
        maxLossStreak: 0,
        longCount: 0,
        shortCount: 0,
        neutralCount: 0,
        longSuccessRate: 0,
        shortSuccessRate: 0,
        recentResults: [],
        lastUpdated: new Date()
      });
      continue;
    }

    // 기본 통계
    const successCount = predictionList.filter(p => p.status === 'success').length;
    const failCount = predictionList.filter(p => p.status === 'fail').length;
    const successRate = (successCount / total) * 100;

    // 수익률 통계
    const profits = predictionList
      .filter(p => p.profitPercent !== undefined)
      .map(p => p.profitPercent!);

    const avgProfit = profits.length > 0
      ? profits.reduce((a, b) => a + b, 0) / profits.length
      : 0;
    const maxProfit = profits.length > 0 ? Math.max(...profits) : 0;
    const maxLoss = profits.length > 0 ? Math.min(...profits) : 0;
    const totalProfit = profits.reduce((a, b) => a + b, 0);

    // 연속 기록
    const streaks = calculateStreaks(predictionList);

    // 신호별 통계
    const longPreds = predictionList.filter(p => p.signal === 'long');
    const shortPreds = predictionList.filter(p => p.signal === 'short');
    const neutralPreds = predictionList.filter(p => p.signal === 'neutral');

    const longSuccessRate = longPreds.length > 0
      ? (longPreds.filter(p => p.status === 'success').length / longPreds.length) * 100
      : 0;
    const shortSuccessRate = shortPreds.length > 0
      ? (shortPreds.filter(p => p.status === 'success').length / shortPreds.length) * 100
      : 0;

    // 최근 10개 결과
    const recentResults = predictionList
      .slice(0, 10)
      .map(p => p.status === 'success');

    results.push({
      expertId: profile.id,
      expertName: profile.name,
      expertEmoji: profile.emoji,
      expertStrategy: profile.strategy,
      coin,
      timeframe,
      totalPredictions: total,
      successCount,
      failCount,
      pendingCount: 0, // 완료된 예측만 조회했으므로 0
      successRate,
      avgProfit,
      maxProfit,
      maxLoss,
      totalProfit,
      currentStreak: streaks.currentStreak,
      maxWinStreak: streaks.maxWinStreak,
      maxLossStreak: streaks.maxLossStreak,
      longCount: longPreds.length,
      shortCount: shortPreds.length,
      neutralCount: neutralPreds.length,
      longSuccessRate,
      shortSuccessRate,
      recentResults,
      lastUpdated: new Date()
    });
  }

  return results;
}

/**
 * 타임프레임을 분(minutes)으로 변환
 */
function timeframeToMinutes(timeframe: Timeframe): number {
  const mapping: Record<Timeframe, number> = {
    '5m': 5,
    '10m': 10,
    '30m': 30,
    '1h': 60,
    '6h': 360,
    '12h': 720,
    '24h': 1440
  };
  return mapping[timeframe] || 60;
}

/**
 * 자동 예측 검증 시스템
 * - pending 상태의 예측 중 타임프레임이 경과한 것들을 찾아서
 * - 현재 가격과 비교하여 성공/실패 판정
 * - DB에 결과 업데이트
 */
export async function validatePendingPredictions(
  db: D1Database,
  coin: 'btc' | 'eth'
): Promise<{
  validated: number;
  success: number;
  fail: number;
}> {
  const now = new Date();

  // pending 상태의 예측 조회
  const pendingPredictions = await db
    .prepare(`
      SELECT * FROM predictions
      WHERE coin = ? AND status = 'pending'
      ORDER BY createdAt ASC
    `)
    .bind(coin)
    .all();

  if (!pendingPredictions.results || pendingPredictions.results.length === 0) {
    return { validated: 0, success: 0, fail: 0 };
  }

  let validated = 0;
  let success = 0;
  let fail = 0;

  for (const pred of pendingPredictions.results) {
    const prediction = pred as any;
    const createdAt = new Date(prediction.createdAt);
    const timeframeMinutes = timeframeToMinutes(prediction.timeframe as Timeframe);
    const elapsedMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

    // 타임프레임이 아직 경과하지 않았으면 스킵
    if (elapsedMinutes < timeframeMinutes) {
      continue;
    }

    // 검증 시점의 가격 가져오기 (현재가 사용)
    // 실제로는 createdAt + timeframe 시점의 가격을 가져와야 하지만
    // 간단하게 현재가로 검증
    const currentPriceResult = await db
      .prepare(`
        SELECT close FROM prices
        WHERE coin = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `)
      .bind(coin)
      .first();

    if (!currentPriceResult) {
      continue;
    }

    const currentPrice = currentPriceResult.close as number;
    const entryPrice = prediction.entryPrice as number;
    const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;

    // 성공/실패 판정 (레버리지 20배, 목표 5% = 0.25% 가격 변동)
    let status: 'success' | 'fail';
    let profit: number;

    if (prediction.signal === 'long') {
      // 롱: 가격이 0.25% 이상 상승하면 성공
      if (priceChange >= 0.25) {
        status = 'success';
        profit = priceChange * 20; // 레버리지 20배
      } else {
        status = 'fail';
        profit = priceChange * 20;
      }
    } else if (prediction.signal === 'short') {
      // 숏: 가격이 0.25% 이상 하락하면 성공
      if (priceChange <= -0.25) {
        status = 'success';
        profit = Math.abs(priceChange) * 20; // 레버리지 20배
      } else {
        status = 'fail';
        profit = priceChange * 20;
      }
    } else {
      // 중립: 스킵
      continue;
    }

    // DB 업데이트
    await db
      .prepare(`
        UPDATE predictions
        SET status = ?, profit = ?, exitPrice = ?, validatedAt = ?
        WHERE id = ?
      `)
      .bind(status, profit, currentPrice, now.toISOString(), prediction.id)
      .run();

    validated++;
    if (status === 'success') {
      success++;
    } else {
      fail++;
    }

    console.log(`✅ 예측 검증: ID ${prediction.id}, ${prediction.signal}, ${status}, profit: ${profit.toFixed(2)}%`);
  }

  return { validated, success, fail };
}

/**
 * 전문가별 최근 승률 계산 (10분 타임프레임, 최근 N개)
 */
export async function getRecentWinRates(
  db: D1Database,
  coin: 'btc' | 'eth',
  timeframe: Timeframe = '10m',
  recentCount: number = 20
): Promise<Map<number, number>> {
  const winRates = new Map<number, number>();

  for (const expertId of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const predictions = await db
      .prepare(`
        SELECT status FROM predictions
        WHERE coin = ? AND expert_id = ? AND timeframe = ? AND status IN ('success', 'fail')
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .bind(coin, expertId, timeframe, recentCount)
      .all();

    if (!predictions.results || predictions.results.length === 0) {
      winRates.set(expertId, 50); // 기본값 50%
      continue;
    }

    const successCount = predictions.results.filter((p: any) => p.status === 'success').length;
    const totalCount = predictions.results.length;
    const winRate = (successCount / totalCount) * 100;

    winRates.set(expertId, winRate);
  }

  return winRates;
}

/**
 * 최근 1시간 전체 승률 계산 (10분 타임프레임)
 */
export async function getRecentOverallSuccessRate(
  db: D1Database,
  coin: 'btc' | 'eth',
  timeframe: Timeframe = '10m',
  hoursAgo: number = 1
): Promise<number> {
  const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  const result = await db
    .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success
      FROM predictions
      WHERE coin = ? AND timeframe = ? AND status IN ('success', 'fail') AND created_at >= ?
    `)
    .bind(coin, timeframe, cutoffTime)
    .first();

  if (!result || result.total === 0) {
    return 50; // 기본값
  }

  return ((result.success as number) / (result.total as number)) * 100;
}
