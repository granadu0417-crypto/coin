// AI 트레이더 배틀 아레나 - 트레이딩 엔진

import type { TechnicalSignals, Timeframe } from '../../types/ai';
import type { D1Database } from '@cloudflare/workers-types';
import { predictByExpert, getExpertProfile } from './experts';
import { checkExitSignal } from './exit-strategies';

const LEVERAGE = 20;
const MIN_ENTRY_CONFIDENCE = 60; // 최소 진입 신뢰도 60%
const DAILY_LOSS_LIMIT = -20; // 일일 손실 한도 -20%

interface TraderBalance {
  expertId: number;
  coin: 'btc' | 'eth';
  currentBalance: number;
  todayProfitPercent: number;
  dailyLossLimitHit: boolean;
  status: string;
}

interface OpenPosition {
  id: number;
  expertId: number;
  coin: string;
  position: 'long' | 'short';
  entryTime: Date;
  entryPrice: number;
  entryConfidence: number;
  highestProfit: number;
}

/**
 * 트레이더 잔고 조회
 */
export async function getTraderBalance(
  db: D1Database,
  expertId: number,
  coin: 'btc' | 'eth'
): Promise<TraderBalance | null> {
  const result = await db
    .prepare(`
      SELECT
        expert_id as expertId,
        coin,
        current_balance as currentBalance,
        today_profit_percent as todayProfitPercent,
        daily_loss_limit_hit as dailyLossLimitHit,
        status
      FROM trader_balances
      WHERE expert_id = ? AND coin = ?
    `)
    .bind(expertId, coin)
    .first();

  if (!result) return null;

  return {
    expertId: result.expertId as number,
    coin: result.coin as 'btc' | 'eth',
    currentBalance: result.currentBalance as number,
    todayProfitPercent: result.todayProfitPercent as number,
    dailyLossLimitHit: Boolean(result.dailyLossLimitHit),
    status: result.status as string
  };
}

/**
 * 진입 가능 여부 확인
 */
export async function canEnterTrade(
  db: D1Database,
  expertId: number,
  coin: 'btc' | 'eth'
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. 이미 열린 포지션 있는지 확인
  const openPosition = await db
    .prepare(`
      SELECT id FROM trading_sessions
      WHERE expert_id = ? AND coin = ? AND status = 'open'
      LIMIT 1
    `)
    .bind(expertId, coin)
    .first();

  if (openPosition) {
    return { allowed: false, reason: '이미 열린 포지션 있음' };
  }

  // 2. 잔고 확인
  const balance = await getTraderBalance(db, expertId, coin);
  if (!balance) {
    return { allowed: false, reason: '잔고 정보 없음' };
  }

  // 3. 일일 손실 한도 확인
  if (balance.dailyLossLimitHit) {
    return { allowed: false, reason: '일일 손실 한도 도달' };
  }

  // 4. 상태 확인
  if (balance.status !== 'active') {
    return { allowed: false, reason: `트레이더 상태: ${balance.status}` };
  }

  // 5. 잔고 부족 확인
  if (balance.currentBalance < 100) {
    return { allowed: false, reason: '잔고 부족 ($100 미만)' };
  }

  return { allowed: true };
}

/**
 * 포지션 진입
 */
export async function enterPosition(
  db: D1Database,
  expertId: number,
  coin: 'btc' | 'eth',
  position: 'long' | 'short',
  entryPrice: number,
  confidence: number,
  signals: TechnicalSignals
): Promise<number | null> {
  // 진입 가능 여부 확인
  const check = await canEnterTrade(db, expertId, coin);
  if (!check.allowed) {
    console.log(`❌ Expert #${expertId} 진입 불가: ${check.reason}`);
    return null;
  }

  // 신뢰도 체크
  if (confidence < MIN_ENTRY_CONFIDENCE) {
    console.log(`❌ Expert #${expertId} 신뢰도 부족: ${confidence.toFixed(1)}%`);
    return null;
  }

  // 잔고 조회
  const balance = await getTraderBalance(db, expertId, coin);
  if (!balance) {
    return null;
  }

  // 포지션 생성
  const result = await db
    .prepare(`
      INSERT INTO trading_sessions (
        expert_id, coin, position,
        entry_time, entry_price, entry_confidence,
        balance_before, entry_indicators, status
      )
      VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?, 'open')
      RETURNING id
    `)
    .bind(
      expertId,
      coin,
      position,
      entryPrice,
      confidence,
      balance.currentBalance,
      JSON.stringify(signals)
    )
    .first();

  const sessionId = result?.id as number;

  console.log(
    `✅ Expert #${expertId} (${coin.toUpperCase()}) 진입: ${position.toUpperCase()} @ $${entryPrice.toFixed(2)} (신뢰도: ${confidence.toFixed(1)}%)`
  );

  return sessionId;
}

/**
 * 열린 포지션 조회
 */
export async function getOpenPositions(
  db: D1Database,
  coin?: 'btc' | 'eth'
): Promise<OpenPosition[]> {
  let query = `
    SELECT
      id, expert_id as expertId, coin, position,
      entry_time as entryTime, entry_price as entryPrice,
      entry_confidence as entryConfidence
    FROM trading_sessions
    WHERE status = 'open'
  `;

  const bindings: any[] = [];
  if (coin) {
    query += ` AND coin = ?`;
    bindings.push(coin);
  }

  query += ` ORDER BY entry_time ASC`;

  const result = await db.prepare(query).bind(...bindings).all();

  return (result.results || []).map((row: any) => ({
    id: row.id,
    expertId: row.expertId,
    coin: row.coin,
    position: row.position,
    entryTime: new Date(row.entryTime),
    entryPrice: row.entryPrice,
    entryConfidence: row.entryConfidence,
    highestProfit: 0 // 초기값
  }));
}

/**
 * 포지션 청산
 */
export async function closePosition(
  db: D1Database,
  sessionId: number,
  exitPrice: number,
  exitReason: string,
  exitReasonEmoji: string
): Promise<void> {
  // 세션 정보 조회
  const session = await db
    .prepare(`
      SELECT
        expert_id, coin, position,
        entry_time, entry_price, balance_before
      FROM trading_sessions
      WHERE id = ? AND status = 'open'
    `)
    .bind(sessionId)
    .first();

  if (!session) {
    console.error(`❌ 세션 #${sessionId} 찾을 수 없음`);
    return;
  }

  const expertId = session.expert_id as number;
  const coin = session.coin as 'btc' | 'eth';
  const position = session.position as 'long' | 'short';
  const entryPrice = session.entry_price as number;
  const balanceBefore = session.balance_before as number;
  const entryTime = new Date(session.entry_time as string);
  const exitTime = new Date();

  // 보유 시간 계산 (분)
  const holdDurationMinutes = Math.floor((exitTime.getTime() - entryTime.getTime()) / 60000);

  // 가격 변동률 계산
  const priceChangePercent = ((exitPrice - entryPrice) / entryPrice) * 100;

  // 레버리지 20배 수익률 계산
  let leveragedProfitPercent: number;
  if (position === 'long') {
    leveragedProfitPercent = priceChangePercent * LEVERAGE;
  } else {
    leveragedProfitPercent = -priceChangePercent * LEVERAGE;
  }

  // 실제 달러 수익 계산 (잔고의 100% 투자 가정)
  const profitAmount = balanceBefore * (leveragedProfitPercent / 100);
  const balanceAfter = balanceBefore + profitAmount;

  // 상태 결정
  const status = leveragedProfitPercent >= 0 ? 'closed_win' : 'closed_loss';

  // 세션 업데이트
  await db
    .prepare(`
      UPDATE trading_sessions
      SET
        exit_time = datetime('now'),
        exit_price = ?,
        exit_reason = ?,
        hold_duration_minutes = ?,
        price_change_percent = ?,
        leveraged_profit_percent = ?,
        profit_amount = ?,
        balance_after = ?,
        status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `)
    .bind(
      exitPrice,
      `${exitReasonEmoji} ${exitReason}`,
      holdDurationMinutes,
      priceChangePercent,
      leveragedProfitPercent,
      profitAmount,
      balanceAfter,
      status,
      sessionId
    )
    .run();

  // 트레이더 잔고 및 통계 업데이트
  await updateTraderStats(db, expertId, coin, leveragedProfitPercent, profitAmount, balanceAfter);

  console.log(
    `${status === 'closed_win' ? '✅' : '❌'} Expert #${expertId} (${coin.toUpperCase()}) 청산: ${exitReasonEmoji} ${exitReason} | ${leveragedProfitPercent > 0 ? '+' : ''}${leveragedProfitPercent.toFixed(2)}% ($${profitAmount > 0 ? '+' : ''}${profitAmount.toFixed(2)})`
  );
}

/**
 * 트레이더 통계 업데이트
 */
async function updateTraderStats(
  db: D1Database,
  expertId: number,
  coin: 'btc' | 'eth',
  profitPercent: number,
  profitAmount: number,
  newBalance: number
): Promise<void> {
  // 승/패 판정
  const isWin = profitPercent >= 0;

  await db
    .prepare(`
      UPDATE trader_balances
      SET
        current_balance = ?,
        peak_balance = CASE WHEN ? > peak_balance THEN ? ELSE peak_balance END,

        today_trades = today_trades + 1,
        today_wins = today_wins + CASE WHEN ? THEN 1 ELSE 0 END,
        today_losses = today_losses + CASE WHEN ? THEN 1 ELSE 0 END,
        today_profit_percent = today_profit_percent + ?,
        today_profit_amount = today_profit_amount + ?,

        total_trades = total_trades + 1,
        total_wins = total_wins + CASE WHEN ? THEN 1 ELSE 0 END,
        total_losses = total_losses + CASE WHEN ? THEN 1 ELSE 0 END,

        total_profit_amount = total_profit_amount + ?,
        total_profit_percent = ((current_balance + ?) - initial_balance) / initial_balance * 100,

        best_trade_percent = CASE WHEN ? > best_trade_percent THEN ? ELSE best_trade_percent END,
        worst_trade_percent = CASE WHEN ? < worst_trade_percent THEN ? ELSE worst_trade_percent END,

        consecutive_wins = CASE WHEN ? THEN consecutive_wins + 1 ELSE 0 END,
        consecutive_losses = CASE WHEN ? THEN consecutive_losses + 1 ELSE 0 END,
        max_consecutive_wins = CASE WHEN (CASE WHEN ? THEN consecutive_wins + 1 ELSE 0 END) > max_consecutive_wins THEN (CASE WHEN ? THEN consecutive_wins + 1 ELSE 0 END) ELSE max_consecutive_wins END,
        max_consecutive_losses = CASE WHEN (CASE WHEN ? THEN consecutive_losses + 1 ELSE 0 END) > max_consecutive_losses THEN (CASE WHEN ? THEN consecutive_losses + 1 ELSE 0 END) ELSE max_consecutive_losses END,

        last_trade_at = datetime('now'),
        updated_at = datetime('now')
      WHERE expert_id = ? AND coin = ?
    `)
    .bind(
      newBalance,
      newBalance, newBalance, // peak_balance
      isWin ? 1 : 0, // today_wins
      !isWin ? 1 : 0, // today_losses
      profitPercent,
      profitAmount,
      isWin ? 1 : 0, // total_wins
      !isWin ? 1 : 0, // total_losses
      profitAmount,
      profitAmount, // total_profit_percent 계산용
      profitPercent, profitPercent, // best_trade_percent
      profitPercent, profitPercent, // worst_trade_percent
      isWin ? 1 : 0, // consecutive_wins
      !isWin ? 1 : 0, // consecutive_losses
      isWin ? 1 : 0, isWin ? 1 : 0, // max_consecutive_wins
      !isWin ? 1 : 0, !isWin ? 1 : 0, // max_consecutive_losses
      expertId,
      coin
    )
    .run();

  // 승률 재계산
  await db
    .prepare(`
      UPDATE trader_balances
      SET win_rate = CAST(total_wins AS REAL) / CAST(total_trades AS REAL) * 100
      WHERE expert_id = ? AND coin = ? AND total_trades > 0
    `)
    .bind(expertId, coin)
    .run();

  // 일일 손실 한도 체크
  const balance = await getTraderBalance(db, expertId, coin);
  if (balance && balance.todayProfitPercent <= DAILY_LOSS_LIMIT) {
    await db
      .prepare(`
        UPDATE trader_balances
        SET daily_loss_limit_hit = 1, status = 'paused'
        WHERE expert_id = ? AND coin = ?
      `)
      .bind(expertId, coin)
      .run();

    console.log(`⚠️ Expert #${expertId} (${coin.toUpperCase()}) 일일 손실 한도 도달 - 거래 중단`);
  }
}
