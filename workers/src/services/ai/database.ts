// D1 데이터베이스 AI 전문가 시스템 연동

import type {
  ExpertProfile,
  Prediction,
  ExpertStats,
  IndicatorWeights,
  ConfidenceThreshold,
  RecentPerformance
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
    timeframe: row.timeframe as '5m' | '10m' | '30m' | '1h',
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
