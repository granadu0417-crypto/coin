// AI 트레이더 배틀 아레나 Cron Job (실시간 WebSocket 기반)

import type { Env } from '../types';
import { upbitService } from '../services/exchanges/upbit';
import { CandleCacheService } from '../services/realtime/candle-cache';
import { generateTechnicalSignals } from '../services/ai/signals';
import { predictByExpert } from '../services/ai/predictions';
import { EXPERT_IDS } from '../services/ai/experts';
import {
  enterPosition,
  getOpenPositions,
  closePosition,
  getTraderBalance
} from '../services/ai/trading-engine';
import { checkExitSignal } from '../services/ai/exit-strategies';

// WebSocket 초기화 플래그 (메모리에 저장)
let isWebSocketInitialized = false;

/**
 * 트레이딩 아레나 Cron Job (실시간 WebSocket 기반)
 *
 * 실행 주기: 매 1분
 * 데이터 소스: Durable Object (실시간 WebSocket 캔들)
 *
 * 실행 단계:
 * 1. WebSocket 초기화 (최초 1회)
 * 2. 실시간 캔들 데이터 가져오기
 * 3. 기술적 지표 계산 (10분 타임프레임)
 * 4. 각 전문가별 예측 생성
 * 5. 신뢰도 60% 이상 → 자동 진입
 * 6. 열린 포지션 체크 → 청산 조건 만족 시 청산
 */
export async function runTradingArena(env: Env): Promise<void> {
  console.log('🎮 트레이딩 아레나 실행 시작 (실시간 모드)');

  try {
    const candleCache = new CandleCacheService(env);

    // Step 1: WebSocket 초기화 (최초 1회)
    if (!isWebSocketInitialized) {
      console.log('🚀 WebSocket 초기화 중...');
      await Promise.all([
        candleCache.startWebSocket('BTC'),
        candleCache.startWebSocket('ETH')
      ]);
      isWebSocketInitialized = true;
      console.log('✅ WebSocket 초기화 완료');

      // 초기 캔들 데이터가 쌓일 때까지 대기 (10초)
      console.log('⏳ 초기 캔들 데이터 대기 중...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    // Step 2: 코인별로 처리
    for (const coin of ['btc', 'eth'] as const) {
      await processCoin(env, candleCache, coin);
    }

    console.log('✨ 트레이딩 아레나 실행 완료');
  } catch (error) {
    console.error('❌ 트레이딩 아레나 오류:', error);
    throw error;
  }
}

/**
 * 코인별 트레이딩 처리 (실시간 캔들 사용)
 */
async function processCoin(
  env: Env,
  candleCache: CandleCacheService,
  coin: 'btc' | 'eth'
): Promise<void> {
  console.log(`\n💰 ${coin.toUpperCase()} 트레이딩 처리`);

  try {
    // 1. 실시간 캔들 데이터 가져오기 (Durable Object)
    const symbol = coin === 'btc' ? 'BTC' : 'ETH';
    const { candles, currentPrice } = await candleCache.getCandles(symbol);

    if (!candles || candles.length === 0) {
      console.log(`⚠️ ${coin.toUpperCase()} 캔들 데이터 없음 - Fallback to API`);

      // Fallback: Upbit API 사용
      const fallbackCandles = await upbitService.getCandles(symbol, 10, 100);
      const fallbackPrice = fallbackCandles[fallbackCandles.length - 1].close;
      const signals = await generateTechnicalSignals(symbol, fallbackCandles, fallbackPrice);

      await checkAndClosePositions(env.DB, coin, fallbackPrice, signals);
      await checkAndEnterPositions(env.DB, coin, fallbackPrice, signals);
      return;
    }

    console.log(`📊 ${coin.toUpperCase()} 현재 가격: $${currentPrice.toFixed(2)} (실시간)`);
    console.log(`📈 ${coin.toUpperCase()} 캔들 개수: ${candles.length}개`);

    // 2. 기술적 지표 계산 (10분 타임프레임)
    const signals = await generateTechnicalSignals(symbol, candles, currentPrice);

    // 3. 열린 포지션 먼저 체크 (청산 로직)
    await checkAndClosePositions(env.DB, coin, currentPrice, signals);

    // 4. 새로운 진입 기회 체크
    await checkAndEnterPositions(env.DB, coin, currentPrice, signals);
  } catch (error) {
    console.error(`❌ ${coin.toUpperCase()} 처리 오류:`, error);

    // 에러 발생 시 Fallback to API
    console.log(`🔄 ${coin.toUpperCase()} Fallback to Upbit API`);
    const symbol = coin === 'btc' ? 'BTC' : 'ETH';
    const fallbackCandles = await upbitService.getCandles(symbol, 10, 100);
    const fallbackPrice = fallbackCandles[fallbackCandles.length - 1].close;
    const signals = generateTechnicalSignals(fallbackCandles, fallbackPrice);

    await checkAndClosePositions(env.DB, coin, fallbackPrice, signals);
    await checkAndEnterPositions(env.DB, coin, fallbackPrice, signals);
  }
}

/**
 * 열린 포지션 체크 및 청산
 */
async function checkAndClosePositions(
  db: any,
  coin: 'btc' | 'eth',
  currentPrice: number,
  signals: any
): Promise<void> {
  const openPositions = await getOpenPositions(db, coin);

  if (openPositions.length === 0) {
    return;
  }

  console.log(`🔍 ${coin.toUpperCase()} 열린 포지션: ${openPositions.length}개`);

  for (const pos of openPositions) {
    // 현재 수익률 계산
    const priceChange = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
    const leveragedProfit = pos.position === 'long'
      ? priceChange * 20
      : -priceChange * 20;

    // 최고 수익률 갱신
    if (leveragedProfit > pos.highestProfit) {
      pos.highestProfit = leveragedProfit;
    }

    // 청산 조건 체크
    const exitDecision = checkExitSignal(pos, currentPrice, signals, pos.expertId);

    if (exitDecision.shouldExit) {
      await closePosition(
        db,
        pos.id,
        currentPrice,
        exitDecision.reason,
        exitDecision.reasonEmoji
      );
    }
  }
}

/**
 * 새로운 진입 기회 체크
 */
async function checkAndEnterPositions(
  db: any,
  coin: 'btc' | 'eth',
  currentPrice: number,
  signals: any
): Promise<void> {
  console.log(`🔎 ${coin.toUpperCase()} 진입 기회 체크`);

  let entryCount = 0;

  for (const expertId of EXPERT_IDS) {
    // 예측 생성
    const prediction = predictByExpert(
      expertId,
      coin,
      '10m',
      signals,
      currentPrice,
      null // 트레이딩 아레나에서는 지표 중요도 사용 안 함
    );

    if (!prediction || prediction.signal === 'neutral') {
      continue;
    }

    // 진입 시도
    const sessionId = await enterPosition(
      db,
      expertId,
      coin,
      prediction.signal as 'long' | 'short',
      currentPrice,
      prediction.confidence,
      signals
    );

    if (sessionId) {
      entryCount++;
    }
  }

  if (entryCount > 0) {
    console.log(`✅ ${coin.toUpperCase()} ${entryCount}개 포지션 진입`);
  } else {
    console.log(`⏸️ ${coin.toUpperCase()} 진입 기회 없음`);
  }
}
