// AI 시스템 상수 정의

import type { Timeframe } from '../../types/ai';

/**
 * 타임프레임별 검증 시간 (초)
 * 실제 타임프레임이 경과한 후 검증
 * 예: 5m → 300초 (5분), 1h → 3600초 (1시간)
 */
export const VERIFICATION_TIMES: Record<Timeframe, number> = {
  '5m': 300,      // 5분 경과 후 검증
  '10m': 600,     // 10분 경과 후 검증
  '30m': 1800,    // 30분 경과 후 검증
  '1h': 3600,     // 1시간 경과 후 검증
  '6h': 21600,    // 6시간 경과 후 검증
  '12h': 43200,   // 12시간 경과 후 검증
  '24h': 86400,   // 24시간 경과 후 검증
};

/**
 * 타임프레임별 검증 시간 가져오기
 */
export function getVerificationTime(timeframe: Timeframe): number {
  return VERIFICATION_TIMES[timeframe] || 30;
}
