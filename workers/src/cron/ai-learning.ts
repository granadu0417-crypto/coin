// AI 전문가 자동 학습 Cron Job (매 1분)

import type { Env } from '../types';
import { binanceService } from '../services/exchanges/binance';
import { generateTechnicalSignals } from '../services/ai/signals';
import {
  getAllExpertPredictions,
  verifyPrediction,
  calculateConsensus
} from '../services/ai/predictions';
import {
  loadExpertProfile,
  saveExpertProfile,
  savePrediction,
  getPendingPredictions,
  updatePredictionResult,
  updateExpertStats,
  getRecentPredictions
} from '../services/ai/database';
import { learnFromResult, calculateIndicatorImportance } from '../services/ai/learning';
import { EXPERT_IDS, TIMEFRAMES, COINS } from '../services/ai/experts';
import type { IndicatorImportance } from '../types/ai';

/**
 * AI 전문가 자동 학습 Cron Job
 *
 * 실행 주기: 매 1분
 *
 * 실행 단계:
 * 1. BTC/ETH 현재 가격 및 과거 데이터 가져오기
 * 2. 기술적 지표 계산
 * 3. 모든 타임프레임(5m, 10m, 30m, 1h)에 대해 예측 생성
 * 4. D1에 예측 저장
 * 5. 30초 이상 경과한 예측 검증
 * 6. 검증 결과에 따라 학습
 * 7. D1에 전문가 가중치 및 통계 업데이트
 */
export async function runAILearning(env: Env): Promise<void> {
  console.log('🤖 AI 전문가 자동 학습 시작');

  try {
    // Step 1: BTC/ETH 가격 및 과거 데이터 가져오기
    const [btcPrices, ethPrices] = await Promise.all([
      binanceService.getKlines('BTC', '1m', 100),
      binanceService.getKlines('ETH', '1m', 100)
    ]);

    const btcCurrentPrice = btcPrices[btcPrices.length - 1].close;
    const ethCurrentPrice = ethPrices[ethPrices.length - 1].close;

    console.log(`💰 현재 가격: BTC $${btcCurrentPrice.toFixed(2)}, ETH $${ethCurrentPrice.toFixed(2)}`);

    // Step 2: 기술적 지표 계산
    const btcSignals = generateTechnicalSignals(btcPrices, btcCurrentPrice);
    const ethSignals = generateTechnicalSignals(ethPrices, ethCurrentPrice);

    // Step 3 & 4: 모든 타임프레임에 대해 예측 생성 및 저장
    for (const coin of COINS) {
      const signals = coin === 'btc' ? btcSignals : ethSignals;
      const currentPrice = coin === 'btc' ? btcCurrentPrice : ethCurrentPrice;

      for (const timeframe of TIMEFRAMES) {
        // Phase 2-3: 지표 중요도 계산 (전문가별)
        const importanceMap = new Map<number, IndicatorImportance>();

        for (const expertId of EXPERT_IDS) {
          const recentPredictions = await getRecentPredictions(env.DB, expertId, timeframe, 30);
          const importance = calculateIndicatorImportance(recentPredictions, expertId, timeframe, 30);
          if (importance) {
            importanceMap.set(expertId, importance);
          }
        }

        // 예측 생성
        const predictions = getAllExpertPredictions(
          coin,
          timeframe,
          signals,
          currentPrice,
          importanceMap
        );

        // D1에 저장
        for (const prediction of predictions) {
          await savePrediction(env.DB, prediction);
        }

        // 컨센서스 계산 및 로그
        const consensus = calculateConsensus(predictions);
        console.log(
          `📊 ${coin.toUpperCase()} ${timeframe} 컨센서스: ${consensus.signal.toUpperCase()} (${consensus.confidence.toFixed(0)}%) - L:${consensus.longCount} S:${consensus.shortCount} N:${consensus.neutralCount}`
        );
      }
    }

    // Step 5: 30초 이상 경과한 예측 검증
    const pendingPredictions = await getPendingPredictions(env.DB, 30);
    console.log(`🔍 검증 대상: ${pendingPredictions.length}개 예측`);

    for (const prediction of pendingPredictions) {
      // 현재 가격 가져오기
      const symbol = prediction.coin === 'btc' ? 'BTC' : 'ETH';
      const ticker = await binanceService.getTicker(symbol);
      const exitPrice = ticker.price;

      // 예측 검증
      const verifiedPrediction = verifyPrediction(prediction, exitPrice);

      // D1에 결과 업데이트
      await updatePredictionResult(
        env.DB,
        prediction.id!,
        verifiedPrediction.exitPrice!,
        verifiedPrediction.status as 'success' | 'fail',
        verifiedPrediction.profitPercent!
      );

      // Step 6: 학습
      if (verifiedPrediction.status !== 'pending') {
        const isSuccess = verifiedPrediction.status === 'success';

        // D1에서 전문가 프로필 로드
        const expert = await loadExpertProfile(env.DB, prediction.expertId);

        // 학습 수행
        const updatedExpert = learnFromResult(expert, verifiedPrediction, isSuccess);

        // D1에 업데이트된 가중치 저장
        await saveExpertProfile(env.DB, updatedExpert);

        // 통계 업데이트
        await updateExpertStats(env.DB, prediction.expertId, prediction.timeframe);

        console.log(
          `${isSuccess ? '✅' : '❌'} 전문가 #${prediction.expertId} (${prediction.timeframe}) 학습 완료: ${prediction.signal.toUpperCase()} ${verifiedPrediction.profitPercent!.toFixed(2)}%`
        );
      }
    }

    console.log('✨ AI 전문가 자동 학습 완료');
  } catch (error) {
    console.error('❌ AI 학습 중 오류:', error);
    throw error;
  }
}

/**
 * Cloudflare Workers Scheduled Event Handler
 */
export async function handleScheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  // Cron 실행 시간 로깅
  console.log(`⏰ Cron 실행: ${new Date(event.scheduledTime).toISOString()}`);

  // AI 학습 실행 (비동기로 처리하여 타임아웃 방지)
  ctx.waitUntil(runAILearning(env));
}
