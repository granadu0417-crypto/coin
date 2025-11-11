// 각 모델별 청산 전략

import type { TechnicalSignals } from '../../types/ai';

export interface ExitDecision {
  shouldExit: boolean;
  reason: string;
  reasonEmoji: string;
}

export interface OpenPosition {
  id: number;
  expertId: number;
  position: 'long' | 'short';
  entryTime: Date;
  entryPrice: number;
  entryConfidence: number;
  highestProfit: number; // 최고 수익률 기록 (트레일링 스톱용)
}

const LEVERAGE = 20;
const MAX_HOLD_MINUTES = 30;

/**
 * 레버리지 20배 수익률 계산
 */
function calculateLeveragedProfit(
  position: 'long' | 'short',
  entryPrice: number,
  currentPrice: number
): number {
  const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100;

  if (position === 'long') {
    return priceChange * LEVERAGE;
  } else {
    return -priceChange * LEVERAGE;
  }
}

/**
 * 보유 시간 계산 (분)
 */
function getHoldingMinutes(entryTime: Date): number {
  return (Date.now() - entryTime.getTime()) / 60000;
}

/**
 * #1 RSI 전문가 청산 전략
 */
export function checkRSIExit(
  pos: OpenPosition,
  currentPrice: number,
  signals: TechnicalSignals
): ExitDecision {
  const holdMinutes = getHoldingMinutes(pos.entryTime);
  const profit = calculateLeveragedProfit(pos.position, pos.entryPrice, currentPrice);

  // 30분 타임아웃
  if (holdMinutes >= MAX_HOLD_MINUTES) {
    return { shouldExit: true, reason: '30분 타임아웃', reasonEmoji: '⏰' };
  }

  // RSI 기반 청산
  if (signals.rsi) {
    if (pos.position === 'long') {
      // 롱 포지션: RSI 70 이상 (과매수) → 익절
      if (signals.rsi.strength > 70 && profit > 5) {
        return { shouldExit: true, reason: 'RSI 과매수 익절', reasonEmoji: '📈' };
      }
      // RSI 50 아래로 + 손실 → 손절
      if (signals.rsi.strength < 50 && profit < -5) {
        return { shouldExit: true, reason: 'RSI 약세 손절', reasonEmoji: '📉' };
      }
    } else {
      // 숏 포지션: RSI 30 이하 (과매도) → 익절
      if (signals.rsi.strength < 30 && profit > 5) {
        return { shouldExit: true, reason: 'RSI 과매도 익절', reasonEmoji: '📉' };
      }
      // RSI 50 위로 + 손실 → 손절
      if (signals.rsi.strength > 50 && profit < -5) {
        return { shouldExit: true, reason: 'RSI 강세 손절', reasonEmoji: '📈' };
      }
    }
  }

  // 수익/손실 기반 청산
  if (profit >= 10) {
    return { shouldExit: true, reason: '10% 익절', reasonEmoji: '✅' };
  }
  if (profit <= -8) {
    return { shouldExit: true, reason: '8% 손절', reasonEmoji: '❌' };
  }

  return { shouldExit: false, reason: '보유 중', reasonEmoji: '⏳' };
}

/**
 * #2 MACD 전문가 청산 전략
 */
export function checkMACDExit(
  pos: OpenPosition,
  currentPrice: number,
  signals: TechnicalSignals
): ExitDecision {
  const holdMinutes = getHoldingMinutes(pos.entryTime);
  const profit = calculateLeveragedProfit(pos.position, pos.entryPrice, currentPrice);

  if (holdMinutes >= MAX_HOLD_MINUTES) {
    return { shouldExit: true, reason: '30분 타임아웃', reasonEmoji: '⏰' };
  }

  // MACD 시그널 역전 → 즉시 청산
  if (signals.macd) {
    if (pos.position === 'long' && signals.macd.signal === 'short') {
      return { shouldExit: true, reason: 'MACD 역전 청산', reasonEmoji: '🔄' };
    }
    if (pos.position === 'short' && signals.macd.signal === 'long') {
      return { shouldExit: true, reason: 'MACD 역전 청산', reasonEmoji: '🔄' };
    }
  }

  // 수익/손실 기반
  if (profit >= 8) {
    return { shouldExit: true, reason: '8% 익절', reasonEmoji: '✅' };
  }
  if (profit <= -6) {
    return { shouldExit: true, reason: '6% 손절', reasonEmoji: '❌' };
  }

  return { shouldExit: false, reason: '보유 중', reasonEmoji: '⏳' };
}

/**
 * #3 볼린저 전문가 청산 전략
 */
export function checkBollingerExit(
  pos: OpenPosition,
  currentPrice: number,
  signals: TechnicalSignals
): ExitDecision {
  const holdMinutes = getHoldingMinutes(pos.entryTime);
  const profit = calculateLeveragedProfit(pos.position, pos.entryPrice, currentPrice);

  if (holdMinutes >= MAX_HOLD_MINUTES) {
    return { shouldExit: true, reason: '30분 타임아웃', reasonEmoji: '⏰' };
  }

  // 볼린저 밴드 반대쪽 도달 → 익절
  if (signals.bollinger) {
    if (pos.position === 'long' && signals.bollinger.signal === 'short' && profit > 5) {
      return { shouldExit: true, reason: '상단밴드 도달 익절', reasonEmoji: '🎯' };
    }
    if (pos.position === 'short' && signals.bollinger.signal === 'long' && profit > 5) {
      return { shouldExit: true, reason: '하단밴드 도달 익절', reasonEmoji: '🎯' };
    }
  }

  if (profit >= 8) {
    return { shouldExit: true, reason: '8% 익절', reasonEmoji: '✅' };
  }
  if (profit <= -7) {
    return { shouldExit: true, reason: '7% 손절', reasonEmoji: '❌' };
  }

  return { shouldExit: false, reason: '보유 중', reasonEmoji: '⏳' };
}

/**
 * #7 단기 스캘퍼 청산 전략 (가장 공격적)
 */
export function checkScalperExit(
  pos: OpenPosition,
  currentPrice: number,
  signals: TechnicalSignals
): ExitDecision {
  const holdMinutes = getHoldingMinutes(pos.entryTime);
  const profit = calculateLeveragedProfit(pos.position, pos.entryPrice, currentPrice);

  // 빠른 익절
  if (holdMinutes < 5 && profit >= 8) {
    return { shouldExit: true, reason: '5분 내 8% 달성', reasonEmoji: '⚡' };
  }
  if (holdMinutes < 10 && profit >= 5) {
    return { shouldExit: true, reason: '10분 내 5% 달성', reasonEmoji: '⚡' };
  }
  if (holdMinutes < 20 && profit >= 3) {
    return { shouldExit: true, reason: '20분 내 3% 달성', reasonEmoji: '✅' };
  }

  // 시간 경과 시 작은 수익도 챙김
  if (holdMinutes >= 20 && profit >= 1) {
    return { shouldExit: true, reason: '시간 경과 익절', reasonEmoji: '⏱️' };
  }

  // 30분 타임아웃
  if (holdMinutes >= MAX_HOLD_MINUTES) {
    return { shouldExit: true, reason: '30분 타임아웃', reasonEmoji: '⏰' };
  }

  // 빠른 손절
  if (profit <= -5) {
    return { shouldExit: true, reason: '5% 손절', reasonEmoji: '❌' };
  }

  return { shouldExit: false, reason: '보유 중', reasonEmoji: '⏳' };
}

/**
 * #8 추세 추종가 청산 전략 (가장 보수적, 길게 보유)
 */
export function checkTrendFollowerExit(
  pos: OpenPosition,
  currentPrice: number,
  signals: TechnicalSignals
): ExitDecision {
  const holdMinutes = getHoldingMinutes(pos.entryTime);
  const profit = calculateLeveragedProfit(pos.position, pos.entryPrice, currentPrice);

  // 트레일링 스톱 (최고점 대비 3% 하락)
  if (pos.highestProfit > 5 && profit < pos.highestProfit - 3) {
    return { shouldExit: true, reason: '트레일링 스톱', reasonEmoji: '📉' };
  }

  // 큰 수익 목표
  if (profit >= 15) {
    return { shouldExit: true, reason: '15% 대성공', reasonEmoji: '🚀' };
  }

  // 30분 타임아웃
  if (holdMinutes >= MAX_HOLD_MINUTES) {
    return { shouldExit: true, reason: '30분 타임아웃', reasonEmoji: '⏰' };
  }

  // 깊은 손절
  if (profit <= -10) {
    return { shouldExit: true, reason: '10% 손절', reasonEmoji: '❌' };
  }

  return { shouldExit: false, reason: '보유 중', reasonEmoji: '⏳' };
}

/**
 * #9 역추세 사냥꾼 청산 전략 (반등/반락 단타)
 */
export function checkCountertrendExit(
  pos: OpenPosition,
  currentPrice: number,
  signals: TechnicalSignals
): ExitDecision {
  const holdMinutes = getHoldingMinutes(pos.entryTime);
  const profit = calculateLeveragedProfit(pos.position, pos.entryPrice, currentPrice);

  // 빠른 익절 (반등 목표)
  if (holdMinutes < 10 && profit >= 6) {
    return { shouldExit: true, reason: '반등 목표 달성', reasonEmoji: '🎣' };
  }

  // 15분 이내 승부
  if (holdMinutes >= 15 && profit >= 2) {
    return { shouldExit: true, reason: '반등 완료', reasonEmoji: '✅' };
  }

  if (holdMinutes >= MAX_HOLD_MINUTES) {
    return { shouldExit: true, reason: '30분 타임아웃', reasonEmoji: '⏰' };
  }

  // 빠른 손절
  if (profit <= -6) {
    return { shouldExit: true, reason: '반등 실패 손절', reasonEmoji: '❌' };
  }

  return { shouldExit: false, reason: '보유 중', reasonEmoji: '⏳' };
}

/**
 * 기타 모델 기본 청산 전략
 */
export function checkDefaultExit(
  pos: OpenPosition,
  currentPrice: number,
  signals: TechnicalSignals
): ExitDecision {
  const holdMinutes = getHoldingMinutes(pos.entryTime);
  const profit = calculateLeveragedProfit(pos.position, pos.entryPrice, currentPrice);

  if (holdMinutes >= MAX_HOLD_MINUTES) {
    return { shouldExit: true, reason: '30분 타임아웃', reasonEmoji: '⏰' };
  }

  if (profit >= 8) {
    return { shouldExit: true, reason: '8% 익절', reasonEmoji: '✅' };
  }
  if (profit <= -7) {
    return { shouldExit: true, reason: '7% 손절', reasonEmoji: '❌' };
  }

  return { shouldExit: false, reason: '보유 중', reasonEmoji: '⏳' };
}

/**
 * 모델별 청산 전략 라우터
 */
export function checkExitSignal(
  pos: OpenPosition,
  currentPrice: number,
  signals: TechnicalSignals,
  expertId: number
): ExitDecision {
  switch (expertId) {
    case 1: // RSI 전문가
      return checkRSIExit(pos, currentPrice, signals);
    case 2: // MACD 전문가
      return checkMACDExit(pos, currentPrice, signals);
    case 3: // 볼린저 전문가
      return checkBollingerExit(pos, currentPrice, signals);
    case 7: // 단기 스캘퍼
      return checkScalperExit(pos, currentPrice, signals);
    case 8: // 추세 추종가
      return checkTrendFollowerExit(pos, currentPrice, signals);
    case 9: // 역추세 사냥꾼
      return checkCountertrendExit(pos, currentPrice, signals);
    default: // 기타 모델
      return checkDefaultExit(pos, currentPrice, signals);
  }
}
