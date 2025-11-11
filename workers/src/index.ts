import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

// Import services
import { binanceService } from './services/exchanges/binance';
import { upbitService } from './services/exchanges/upbit';
import { bithumbService } from './services/exchanges/bithumb';
import { technicalAnalyst } from './services/analysis/technical';
import { rssAggregator } from './services/rss/aggregator';

// Import cron handlers
import { handleScheduled as handleAILearning } from './cron/ai-learning';
import { runTradingArena } from './cron/trading-arena';

// Trading Arena handler wrapper
async function handleTradingArena(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  ctx.waitUntil(runTradingArena(env));
}

// Import AI services
import {
  getAllExpertStats,
  getExpertStats,
  loadExpertProfile,
  getDetailedExpertStats
} from './services/ai/database';
import { expertProfiles } from './services/ai/experts';

// Export Durable Objects
export { CandleBuilderDO } from './durable-objects/candle-builder-do';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors());

// Health check
app.get('/health', async (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '1.0.0',
  });
});

// Get price from all exchanges
app.get('/api/prices/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();

  try {
    const [binance, upbit, bithumb] = await Promise.allSettled([
      binanceService.getTicker(symbol),
      upbitService.getTicker(symbol),
      bithumbService.getTicker(symbol),
    ]);

    return c.json({
      symbol,
      exchanges: {
        binance: binance.status === 'fulfilled' ? binance.value : null,
        upbit: upbit.status === 'fulfilled' ? upbit.value : null,
        bithumb: bithumb.status === 'fulfilled' ? bithumb.value : null,
      },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get historical price data
app.get('/api/prices/:symbol/history', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();
  const exchange = c.req.query('exchange') || 'upbit';
  const limit = parseInt(c.req.query('limit') || '100');

  try {
    let prices;

    // Binance is blocked on Cloudflare Workers, fallback to Upbit
    if (exchange === 'binance' || exchange === 'upbit') {
      prices = await upbitService.getCandles(symbol, 1, limit);
    } else {
      return c.json({ error: 'Invalid exchange' }, 400);
    }

    return c.json({
      symbol,
      exchange,
      prices,
      count: prices.length,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get technical analysis
app.get('/api/analysis/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();

  try {
    // Fetch price history (using Upbit since Binance is blocked on Cloudflare Workers)
    const prices = await upbitService.getCandles(symbol, 1, 100);
    const ticker = await upbitService.getTicker(symbol);

    // Perform analysis
    const analysis = technicalAnalyst.analyze({
      symbol,
      prices,
      currentPrice: ticker.price,
      volume24h: ticker.volume,
      priceChange24h: ticker.change24h,
    });

    return c.json({
      symbol,
      analysis,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get crypto news
app.get('/api/news', async (c) => {
  const hours = parseInt(c.req.query('hours') || '24');

  try {
    const news = await rssAggregator.getRecentNews(hours);

    return c.json({
      news,
      count: news.length,
      hours,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get influencer mentions
app.get('/api/influencer-mentions', async (c) => {
  const hours = parseInt(c.req.query('hours') || '24');
  const impactOnly = c.req.query('impact') === 'high';

  try {
    const mentions = impactOnly
      ? await rssAggregator.getHighImpactMentions(hours, c.env)
      : await rssAggregator.getInfluencerMentions(hours, c.env);

    return c.json({
      mentions,
      count: mentions.length,
      hours,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get influencer mentions by symbol
app.get('/api/influencer-mentions/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();
  const hours = parseInt(c.req.query('hours') || '24');

  try {
    const allMentions = await rssAggregator.getInfluencerMentions(hours, c.env);

    // Filter by symbol
    const symbolMentions = allMentions.filter((mention) =>
      mention.symbols.includes(symbol)
    );

    return c.json({
      symbol,
      mentions: symbolMentions,
      count: symbolMentions.length,
      hours,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get predictions (using technical analysis)
app.get('/api/predictions/:symbol', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();

  try {
    // Use Upbit since Binance is blocked
    const prices = await upbitService.getCandles(symbol, 1, 100);
    const ticker = await upbitService.getTicker(symbol);

    if (!ticker) {
      return c.json({ error: 'Symbol not found' }, 404);
    }

    // Perform analysis
    const analysis = technicalAnalyst.analyze({
      symbol,
      prices,
      currentPrice: ticker.price,
      volume24h: ticker.volume,
      priceChange24h: ticker.change24h,
    });

    // Convert analysis to prediction format
    const prediction = {
      id: 1,
      analyst: 'technical' as const,
      symbol,
      direction: analysis.direction,
      confidence: analysis.confidence,
      timeframe: '24h',
      reasoning: analysis.reasoning,
      created_at: Math.floor(Date.now() / 1000),
      is_active: true,
    };

    return c.json({
      predictions: [prediction],
      count: 1,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get consensus (aggregated predictions)
app.get('/api/predictions/:symbol/consensus', async (c) => {
  const symbol = c.req.param('symbol').toUpperCase();

  try {
    // Use Upbit since Binance is blocked
    const prices = await upbitService.getCandles(symbol, 1, 100);
    const ticker = await upbitService.getTicker(symbol);

    if (!ticker) {
      return c.json({ error: 'Symbol not found' }, 404);
    }

    // Perform analysis
    const analysis = technicalAnalyst.analyze({
      symbol,
      prices,
      currentPrice: ticker.price,
      volume24h: ticker.volume,
      priceChange24h: ticker.change24h,
    });

    // Convert to prediction format
    const prediction = {
      id: 1,
      analyst: 'technical' as const,
      symbol,
      direction: analysis.direction,
      confidence: analysis.confidence,
      timeframe: '24h',
      reasoning: analysis.reasoning,
      created_at: Math.floor(Date.now() / 1000),
      is_active: true,
    };

    // Create consensus (single analyst for now)
    const consensus = {
      symbol,
      consensus_direction: analysis.direction,
      consensus_confidence: analysis.confidence,
      bullish_count: analysis.direction === 'bullish' ? 1 : 0,
      bearish_count: analysis.direction === 'bearish' ? 1 : 0,
      neutral_count: analysis.direction === 'neutral' ? 1 : 0,
      predictions: [prediction],
    };

    return c.json(consensus);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==================== AI 전문가 시스템 API ====================

// Get AI expert predictions
app.get('/api/ai/predictions', async (c) => {
  const coin = c.req.query('coin') || 'btc';
  const timeframe = c.req.query('timeframe') || '5m';
  const limit = parseInt(c.req.query('limit') || '10');

  try {
    const predictions = await c.env.DB
      .prepare(
        `SELECT p.*, ep.name, ep.emoji
         FROM predictions p
         JOIN expert_profiles ep ON p.expert_id = ep.id
         WHERE p.coin = ? AND p.timeframe = ?
         ORDER BY p.created_at DESC
         LIMIT ?`
      )
      .bind(coin, timeframe, limit)
      .all();

    return c.json({
      coin,
      timeframe,
      predictions: predictions.results.map(row => ({
        id: row.id,
        expertId: row.expert_id,
        expertName: row.name,
        expertEmoji: row.emoji,
        signal: row.signal,
        confidence: row.confidence,
        entryPrice: row.entry_price,
        exitPrice: row.exit_price,
        status: row.status,
        profitPercent: row.profit_percent,
        indicatorContributions: JSON.parse(row.indicator_contributions as string),
        createdAt: row.created_at,
        checkedAt: row.checked_at
      })),
      count: predictions.results.length
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get all AI experts stats
app.get('/api/ai/experts', async (c) => {
  try {
    const stats = await getAllExpertStats(c.env.DB);

    // 전문가 프로필과 통계 결합
    const expertsWithStats = expertProfiles.map(expert => {
      const expertStats = stats.filter(s => s.expertId === expert.id);

      const timeframeStats: any = {};
      expertStats.forEach(s => {
        timeframeStats[s.timeframe] = {
          totalPredictions: s.totalPredictions,
          successCount: s.successCount,
          failCount: s.failCount,
          pendingCount: s.pendingCount,
          successRate: s.successRate,
          lastUpdated: s.lastUpdated
        };
      });

      return {
        id: expert.id,
        name: expert.name,
        strategy: expert.strategy,
        emoji: expert.emoji,
        stats: timeframeStats
      };
    });

    return c.json({
      experts: expertsWithStats,
      count: expertsWithStats.length
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get detailed expert stats (투자 판단용)
app.get('/api/ai/experts/stats', async (c) => {
  const coin = (c.req.query('coin') || 'btc') as 'btc' | 'eth';
  const expertIdParam = c.req.query('expertId');
  const timeframeParam = c.req.query('timeframe');

  const expertId = expertIdParam ? parseInt(expertIdParam) : undefined;
  const timeframe = timeframeParam as any; // Timeframe type

  try {
    const stats = await getDetailedExpertStats(
      c.env.DB,
      coin,
      expertId,
      timeframe
    );

    return c.json({
      coin,
      timeframe: timeframe || 'all',
      expertId: expertId || 'all',
      stats,
      count: stats.length
    });
  } catch (error: any) {
    console.error('❌ 전문가 상세 통계 조회 실패:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get trading recommendation (실시간 매수/대기 추천)
app.get('/api/ai/trading-recommendation', async (c) => {
  const coin = (c.req.query('coin') || 'btc') as 'btc' | 'eth';
  const timeframe = '10m'; // 10분 타임프레임으로 통일

  try {
    // 1. Import 필요한 함수들
    const {
      calculateWeightedConsensus,
      calculateSignalStrength,
      getTradingRecommendation
    } = await import('./services/ai/predictions');

    const {
      getRecentWinRates,
      getRecentOverallSuccessRate
    } = await import('./services/ai/database');

    // 2. 최근 10분 예측 가져오기
    const recentPredictions = await c.env.DB
      .prepare(`
        SELECT p.*, e.name, e.emoji, e.strategy
        FROM predictions p
        JOIN expert_profiles e ON p.expert_id = e.id
        WHERE p.coin = ? AND p.timeframe = ? AND p.status = 'pending'
        ORDER BY p.created_at DESC
        LIMIT 10
      `)
      .bind(coin, timeframe)
      .all();

    if (!recentPredictions.results || recentPredictions.results.length === 0) {
      return c.json({
        error: '현재 예측이 없습니다. 잠시 후 다시 시도해주세요.',
        hasData: false
      });
    }

    // 3. 전문가별 최근 승률 계산
    const expertWinRates = await getRecentWinRates(c.env.DB, coin, timeframe, 20);

    // 4. 최근 1시간 전체 승률 계산
    const recentSuccessRate = await getRecentOverallSuccessRate(c.env.DB, coin, timeframe, 1);

    // 5. 신호 생성 시간 계산
    const latestPrediction = recentPredictions.results[0] as any;
    const signalAge = (Date.now() - new Date(latestPrediction.created_at).getTime()) / 1000 / 60; // 분 단위

    // 6. Prediction 객체 변환
    const predictions = recentPredictions.results.map((row: any) => ({
      id: row.id,
      expertId: row.expert_id,
      expertName: row.name,
      expertEmoji: row.emoji,
      expertStrategy: row.strategy,
      coin: row.coin,
      timeframe: row.timeframe,
      signal: row.signal,
      confidence: row.confidence,
      entryPrice: row.entry_price,
      exitPrice: row.exit_price,
      status: row.status,
      profitPercent: row.profit_percent,
      createdAt: new Date(row.created_at),
      checkedAt: row.checked_at ? new Date(row.checked_at) : null,
      indicatorContributions: null
    }));

    // 7. 가중치 컨센서스 계산
    const weightedConsensus = calculateWeightedConsensus(predictions, expertWinRates);

    // 8. 신호 강도 계산
    const signalStrength = calculateSignalStrength(
      predictions,
      expertWinRates,
      recentSuccessRate,
      signalAge
    );

    // 9. 매수/대기 추천 결정
    const recommendation = getTradingRecommendation(signalStrength);

    // 10. 상위 3개 모델 찾기
    const sortedExperts = Array.from(expertWinRates.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const top3Models = sortedExperts.map(([expertId, winRate]) => {
      const pred = predictions.find(p => p.expertId === expertId);
      return {
        expertId,
        expertName: pred?.expertName || `Expert ${expertId}`,
        expertEmoji: pred?.expertEmoji || '📊',
        winRate: Math.round(winRate * 10) / 10,
        signal: pred?.signal || 'neutral'
      };
    });

    // 11. 응답 반환
    return c.json({
      hasData: true,
      coin,
      timeframe,
      timestamp: new Date().toISOString(),

      // 신호 강도 및 추천
      signalStrength,
      recommendation,

      // 가중치 컨센서스
      consensus: {
        signal: weightedConsensus.signal,
        confidence: Math.round(weightedConsensus.confidence * 10) / 10,
        weightedLongScore: Math.round(weightedConsensus.weightedLongScore * 10) / 10,
        weightedShortScore: Math.round(weightedConsensus.weightedShortScore * 10) / 10
      },

      // 통계
      stats: {
        recentSuccessRate: Math.round(recentSuccessRate * 10) / 10,
        signalAgeMinutes: Math.round(signalAge * 10) / 10,
        totalPredictions: predictions.length,
        top3Models
      },

      // 예측 목록
      predictions: predictions.map(p => ({
        expertId: p.expertId,
        expertName: p.expertName,
        expertEmoji: p.expertEmoji,
        signal: p.signal,
        confidence: Math.round(p.confidence * 10) / 10,
        winRate: Math.round((expertWinRates.get(p.expertId) || 50) * 10) / 10
      }))
    });

  } catch (error: any) {
    console.error('❌ 트레이딩 추천 계산 실패:', error);
    return c.json({ error: error.message, hasData: false }, 500);
  }
});

// Get specific AI expert details
app.get('/api/ai/experts/:id', async (c) => {
  const expertId = parseInt(c.req.param('id'));

  try {
    const expert = await loadExpertProfile(c.env.DB, expertId);

    return c.json({
      expert: {
        id: expert.id,
        name: expert.name,
        strategy: expert.strategy,
        emoji: expert.emoji,
        weights: expert.weights,
        confidenceThreshold: expert.confidenceThreshold,
        recentPerformance: expert.recentPerformance
      }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get AI consensus for a specific coin and timeframe
app.get('/api/ai/consensus', async (c) => {
  const coin = c.req.query('coin') || 'btc';
  const timeframe = c.req.query('timeframe') || '5m';

  try {
    // 최근 1시간 이내 예측만 조회
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const predictions = await c.env.DB
      .prepare(
        `SELECT p.*, ep.name, ep.emoji
         FROM predictions p
         JOIN expert_profiles ep ON p.expert_id = ep.id
         WHERE p.coin = ? AND p.timeframe = ? AND p.created_at >= ?
         AND p.status = 'pending'
         ORDER BY p.created_at DESC`
      )
      .bind(coin, timeframe, oneHourAgo)
      .all();

    // 컨센서스 계산
    const longCount = predictions.results.filter((p: any) => p.signal === 'long').length;
    const shortCount = predictions.results.filter((p: any) => p.signal === 'short').length;
    const neutralCount = predictions.results.filter((p: any) => p.signal === 'neutral').length;
    const totalExperts = predictions.results.length;

    let consensusSignal: 'long' | 'short' | 'neutral';
    let consensusConfidence: number;

    if (longCount > shortCount && longCount > neutralCount) {
      consensusSignal = 'long';
      consensusConfidence = totalExperts > 0 ? (longCount / totalExperts) * 100 : 0;
    } else if (shortCount > longCount && shortCount > neutralCount) {
      consensusSignal = 'short';
      consensusConfidence = totalExperts > 0 ? (shortCount / totalExperts) * 100 : 0;
    } else {
      consensusSignal = 'neutral';
      consensusConfidence = totalExperts > 0 ? (neutralCount / totalExperts) * 100 : 0;
    }

    return c.json({
      coin,
      timeframe,
      consensus: {
        signal: consensusSignal,
        confidence: consensusConfidence,
        longCount,
        shortCount,
        neutralCount,
        totalExperts
      },
      predictions: predictions.results.map((row: any) => ({
        expertId: row.expert_id,
        expertName: row.name,
        expertEmoji: row.emoji,
        signal: row.signal,
        confidence: row.confidence,
        createdAt: row.created_at
      }))
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get live predictions (pending) for all timeframes
app.get('/api/ai/predictions/live', async (c) => {
  const coin = c.req.query('coin') || 'btc';

  try {
    // 최근 2시간 이내 pending 예측만 조회 (모든 타임프레임)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const predictions = await c.env.DB
      .prepare(
        `SELECT p.*, ep.name, ep.emoji, ep.strategy
         FROM predictions p
         JOIN expert_profiles ep ON p.expert_id = ep.id
         WHERE p.coin = ? AND p.status = 'pending' AND p.created_at >= ?
         ORDER BY p.timeframe, p.expert_id`
      )
      .bind(coin, twoHoursAgo)
      .all();

    // 타임프레임별로 그룹화
    const timeframes = ['5m', '10m', '30m', '1h', '6h', '12h', '24h'];
    const groupedByTimeframe: any = {};

    timeframes.forEach(tf => {
      const tfPredictions = predictions.results.filter((p: any) => p.timeframe === tf);

      if (tfPredictions.length > 0) {
        // 컨센서스 계산
        const longCount = tfPredictions.filter((p: any) => p.signal === 'long').length;
        const shortCount = tfPredictions.filter((p: any) => p.signal === 'short').length;
        const neutralCount = tfPredictions.filter((p: any) => p.signal === 'neutral').length;
        const totalExperts = tfPredictions.length;

        let consensusSignal: 'long' | 'short' | 'neutral';
        let consensusConfidence: number;

        if (longCount > shortCount && longCount > neutralCount) {
          consensusSignal = 'long';
          consensusConfidence = (longCount / totalExperts) * 100;
        } else if (shortCount > longCount && shortCount > neutralCount) {
          consensusSignal = 'short';
          consensusConfidence = (shortCount / totalExperts) * 100;
        } else {
          consensusSignal = 'neutral';
          consensusConfidence = (neutralCount / totalExperts) * 100;
        }

        groupedByTimeframe[tf] = {
          consensus: {
            signal: consensusSignal,
            confidence: consensusConfidence,
            longCount,
            shortCount,
            neutralCount,
            totalExperts
          },
          predictions: tfPredictions.map((row: any) => ({
            id: row.id,
            expertId: row.expert_id,
            expertName: row.name,
            expertEmoji: row.emoji,
            expertStrategy: row.strategy,
            signal: row.signal,
            confidence: row.confidence,
            entryPrice: row.entry_price,
            createdAt: row.created_at
          }))
        };
      }
    });

    return c.json({
      coin,
      timeframes: groupedByTimeframe,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get prediction history with results
app.get('/api/ai/predictions/history', async (c) => {
  const coin = c.req.query('coin') || 'btc';
  const timeframe = c.req.query('timeframe'); // optional
  const expertId = c.req.query('expert'); // optional
  const limit = parseInt(c.req.query('limit') || '100');
  const status = c.req.query('status'); // optional: 'success' or 'fail'

  try {
    let query = `
      SELECT p.*, ep.name, ep.emoji, ep.strategy
      FROM predictions p
      JOIN expert_profiles ep ON p.expert_id = ep.id
      WHERE p.coin = ? AND p.status IN ('success', 'fail')
    `;

    const bindings: any[] = [coin];

    if (timeframe) {
      query += ` AND p.timeframe = ?`;
      bindings.push(timeframe);
    }

    if (expertId) {
      query += ` AND p.expert_id = ?`;
      bindings.push(parseInt(expertId));
    }

    if (status) {
      query += ` AND p.status = ?`;
      bindings.push(status);
    }

    query += ` ORDER BY p.created_at DESC LIMIT ?`;
    bindings.push(limit);

    const predictions = await c.env.DB
      .prepare(query)
      .bind(...bindings)
      .all();

    // 통계 계산
    const totalPredictions = predictions.results.length;
    const successCount = predictions.results.filter((p: any) => p.status === 'success').length;
    const failCount = predictions.results.filter((p: any) => p.status === 'fail').length;
    const successRate = totalPredictions > 0 ? (successCount / totalPredictions) * 100 : 0;

    // 평균 수익률 계산
    const avgProfit = predictions.results.reduce((sum: number, p: any) =>
      sum + (p.profit_percent || 0), 0) / totalPredictions;

    return c.json({
      coin,
      timeframe: timeframe || 'all',
      expertId: expertId || 'all',
      stats: {
        totalPredictions,
        successCount,
        failCount,
        successRate: parseFloat(successRate.toFixed(2)),
        avgProfit: parseFloat(avgProfit.toFixed(2))
      },
      predictions: predictions.results.map((row: any) => ({
        id: row.id,
        expertId: row.expert_id,
        expertName: row.name,
        expertEmoji: row.emoji,
        expertStrategy: row.strategy,
        timeframe: row.timeframe,
        signal: row.signal,
        confidence: row.confidence,
        entryPrice: row.entry_price,
        exitPrice: row.exit_price,
        profitPercent: row.profit_percent,
        status: row.status,
        createdAt: row.created_at,
        checkedAt: row.checked_at
      })),
      count: predictions.results.length
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==========================================
// Trading Arena API Endpoints
// ==========================================

// Get leaderboard (트레이더 순위)
app.get('/api/trading-arena/leaderboard', async (c) => {
  const coin = (c.req.query('coin') || 'btc') as 'btc' | 'eth';

  try {
    const leaderboard = await c.env.DB
      .prepare(`
        SELECT
          tb.expert_id as expertId,
          ep.name,
          ep.emoji,
          ep.strategy,
          tb.current_balance as currentBalance,
          tb.initial_balance as initialBalance,
          tb.today_profit_percent as todayProfitPercent,
          tb.today_profit_amount as todayProfitAmount,
          tb.today_trades as todayTrades,
          tb.today_wins as todayWins,
          tb.today_losses as todayLosses,
          tb.total_trades as totalTrades,
          tb.win_rate as winRate,
          tb.total_profit_percent as totalProfitPercent,
          tb.best_trade_percent as bestTradePercent,
          tb.worst_trade_percent as worstTradePercent,
          tb.consecutive_wins as consecutiveWins,
          tb.consecutive_losses as consecutiveLosses,
          tb.status
        FROM trader_balances tb
        JOIN expert_profiles ep ON tb.expert_id = ep.id
        WHERE tb.coin = ?
        ORDER BY tb.current_balance DESC
      `)
      .bind(coin)
      .all();

    return c.json({
      coin,
      timestamp: new Date().toISOString(),
      leaderboard: leaderboard.results || []
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get open positions (열린 포지션)
app.get('/api/trading-arena/positions/open', async (c) => {
  const coin = c.req.query('coin') as 'btc' | 'eth' | undefined;

  try {
    let query = `
      SELECT
        ts.id,
        ts.expert_id as expertId,
        ep.name as expertName,
        ep.emoji as expertEmoji,
        ts.coin,
        ts.position,
        ts.entry_time as entryTime,
        ts.entry_price as entryPrice,
        ts.entry_confidence as entryConfidence,
        ts.balance_before as balanceBefore
      FROM trading_sessions ts
      JOIN expert_profiles ep ON ts.expert_id = ep.id
      WHERE ts.status = 'open'
    `;

    const bindings: any[] = [];
    if (coin) {
      query += ` AND ts.coin = ?`;
      bindings.push(coin);
    }

    query += ` ORDER BY ts.entry_time DESC`;

    const positions = await c.env.DB
      .prepare(query)
      .bind(...bindings)
      .all();

    return c.json({
      coin: coin || 'all',
      count: positions.results.length,
      positions: positions.results || []
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get recent closed trades (최근 거래 내역)
app.get('/api/trading-arena/trades/recent', async (c) => {
  const coin = c.req.query('coin') as 'btc' | 'eth' | undefined;
  const limit = parseInt(c.req.query('limit') || '50');

  try {
    let query = `
      SELECT
        ts.id,
        ts.expert_id as expertId,
        ep.name as expertName,
        ep.emoji as expertEmoji,
        ts.coin,
        ts.position,
        ts.entry_time as entryTime,
        ts.entry_price as entryPrice,
        ts.exit_time as exitTime,
        ts.exit_price as exitPrice,
        ts.exit_reason as exitReason,
        ts.hold_duration_minutes as holdDurationMinutes,
        ts.leveraged_profit_percent as leveragedProfitPercent,
        ts.profit_amount as profitAmount,
        ts.balance_before as balanceBefore,
        ts.balance_after as balanceAfter,
        ts.status
      FROM trading_sessions ts
      JOIN expert_profiles ep ON ts.expert_id = ep.id
      WHERE ts.status IN ('closed_win', 'closed_loss', 'closed_timeout')
    `;

    const bindings: any[] = [];
    if (coin) {
      query += ` AND ts.coin = ?`;
      bindings.push(coin);
    }

    query += ` ORDER BY ts.exit_time DESC LIMIT ?`;
    bindings.push(limit);

    const trades = await c.env.DB
      .prepare(query)
      .bind(...bindings)
      .all();

    return c.json({
      coin: coin || 'all',
      count: trades.results.length,
      trades: trades.results || []
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get trader stats (트레이더별 상세 통계)
app.get('/api/trading-arena/trader/:expertId', async (c) => {
  const expertId = parseInt(c.params.expertId);
  const coin = (c.req.query('coin') || 'btc') as 'btc' | 'eth';

  try {
    // 트레이더 정보 및 잔고
    const trader = await c.env.DB
      .prepare(`
        SELECT
          tb.*,
          ep.name,
          ep.emoji,
          ep.strategy
        FROM trader_balances tb
        JOIN expert_profiles ep ON tb.expert_id = ep.id
        WHERE tb.expert_id = ? AND tb.coin = ?
      `)
      .bind(expertId, coin)
      .first();

    if (!trader) {
      return c.json({ error: 'Trader not found' }, 404);
    }

    // 최근 10개 거래
    const recentTrades = await c.env.DB
      .prepare(`
        SELECT * FROM trading_sessions
        WHERE expert_id = ? AND coin = ?
        AND status IN ('closed_win', 'closed_loss', 'closed_timeout')
        ORDER BY exit_time DESC
        LIMIT 10
      `)
      .bind(expertId, coin)
      .all();

    return c.json({
      trader,
      recentTrades: recentTrades.results || []
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get live predictions (실시간 예측 신뢰도)
app.get('/api/trading-arena/predictions/live', async (c) => {
  const coin = (c.req.query('coin') || 'btc') as 'btc' | 'eth';

  try {
    // 1. 가격 데이터 가져오기
    const symbol = coin === 'btc' ? 'BTC' : 'ETH';
    const candles = await upbitService.getCandles(symbol, 10, 100);
    const currentPrice = candles[candles.length - 1].close;

    // 2. 기술적 지표 계산
    const { generateTechnicalSignals } = await import('./services/ai/signals');
    const signals = generateTechnicalSignals(candles, currentPrice);

    // 3. 각 전문가별 예측 생성
    const { predictByExpert } = await import('./services/ai/predictions');
    const { EXPERT_IDS } = await import('./services/ai/experts');
    const expertProfiles = (await import('./services/ai/experts')).expertProfiles;

    const predictions = EXPERT_IDS.map(expertId => {
      const profile = expertProfiles.find(p => p.id === expertId);
      const prediction = predictByExpert(
        expertId,
        coin,
        '10m',
        signals,
        currentPrice,
        null
      );

      return {
        expertId,
        expertName: profile?.name || 'Unknown',
        expertEmoji: profile?.emoji || '❓',
        signal: prediction?.signal || 'neutral',
        confidence: prediction?.confidence || 0,
        canEnter: prediction ? prediction.confidence >= 60 && prediction.signal !== 'neutral' : false
      };
    });

    return c.json({
      coin,
      timestamp: new Date().toISOString(),
      currentPrice,
      predictions
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ==================== 트레이딩 아레나 히스토리 API ====================

// Get daily performance stats (일별 성과 통계)
app.get('/api/trading-arena/history/daily-stats', async (c) => {
  const coin = (c.req.query('coin') || 'btc') as 'btc' | 'eth';

  // 날짜 범위 파라미터 (startDate, endDate)
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  // 기본값: 최근 7일
  const defaultEndDate = new Date().toISOString().split('T')[0];
  const defaultStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const finalStartDate = startDate || defaultStartDate;
  const finalEndDate = endDate || defaultEndDate;

  try {
    const dailyStats = await c.env.DB
      .prepare(`
        SELECT
          DATE(ts.exit_time) as date,
          ts.expert_id as expertId,
          ep.name as expertName,
          ep.emoji as expertEmoji,
          COUNT(*) as trades,
          SUM(CASE WHEN ts.status = 'closed_win' THEN 1 ELSE 0 END) as wins,
          SUM(CASE WHEN ts.status = 'closed_loss' THEN 1 ELSE 0 END) as losses,
          SUM(ts.profit_amount) as totalProfit,
          AVG(ts.leveraged_profit_percent) as avgProfitPercent,
          MAX(ts.leveraged_profit_percent) as bestTradePercent,
          MIN(ts.leveraged_profit_percent) as worstTradePercent
        FROM trading_sessions ts
        JOIN expert_profiles ep ON ts.expert_id = ep.id
        WHERE ts.coin = ?
          AND ts.status IN ('closed_win', 'closed_loss', 'closed_timeout')
          AND DATE(ts.exit_time) >= ?
          AND DATE(ts.exit_time) <= ?
        GROUP BY DATE(ts.exit_time), ts.expert_id
        ORDER BY date DESC, totalProfit DESC
      `)
      .bind(coin, finalStartDate, finalEndDate)
      .all();

    return c.json({
      coin,
      startDate: finalStartDate,
      endDate: finalEndDate,
      stats: dailyStats.results || []
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get cumulative performance over time (누적 성과 추이)
app.get('/api/trading-arena/history/performance', async (c) => {
  const coin = (c.req.query('coin') || 'btc') as 'btc' | 'eth';
  const expertId = c.req.query('expertId') ? parseInt(c.req.query('expertId')!) : undefined;

  try {
    let query = `
      SELECT
        ts.expert_id as expertId,
        ep.name as expertName,
        ep.emoji as expertEmoji,
        ts.exit_time as timestamp,
        ts.balance_after as balance,
        ts.leveraged_profit_percent as profitPercent,
        ts.profit_amount as profitAmount,
        ts.status
      FROM trading_sessions ts
      JOIN expert_profiles ep ON ts.expert_id = ep.id
      WHERE ts.coin = ?
        AND ts.status IN ('closed_win', 'closed_loss', 'closed_timeout')
    `;

    const bindings: any[] = [coin];

    if (expertId) {
      query += ` AND ts.expert_id = ?`;
      bindings.push(expertId);
    }

    query += ` ORDER BY ts.exit_time ASC`;

    const performance = await c.env.DB
      .prepare(query)
      .bind(...bindings)
      .all();

    return c.json({
      coin,
      expertId: expertId || 'all',
      data: performance.results || []
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Get all trades with pagination (전체 거래 내역)
app.get('/api/trading-arena/history/all-trades', async (c) => {
  const coin = c.req.query('coin') as 'btc' | 'eth' | undefined;
  const expertId = c.req.query('expertId') ? parseInt(c.req.query('expertId')!) : undefined;
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = (page - 1) * limit;

  // 날짜 범위 파라미터
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  try {
    let query = `
      SELECT
        ts.id,
        ts.expert_id as expertId,
        ep.name as expertName,
        ep.emoji as expertEmoji,
        ts.coin,
        ts.position,
        ts.entry_time as entryTime,
        ts.entry_price as entryPrice,
        ts.exit_time as exitTime,
        ts.exit_price as exitPrice,
        ts.exit_reason as exitReason,
        ts.hold_duration_minutes as holdDurationMinutes,
        ts.leveraged_profit_percent as leveragedProfitPercent,
        ts.profit_amount as profitAmount,
        ts.balance_before as balanceBefore,
        ts.balance_after as balanceAfter,
        ts.status
      FROM trading_sessions ts
      JOIN expert_profiles ep ON ts.expert_id = ep.id
      WHERE ts.status IN ('closed_win', 'closed_loss', 'closed_timeout')
    `;

    const bindings: any[] = [];

    if (coin) {
      query += ` AND ts.coin = ?`;
      bindings.push(coin);
    }

    if (expertId) {
      query += ` AND ts.expert_id = ?`;
      bindings.push(expertId);
    }

    if (startDate) {
      query += ` AND DATE(ts.exit_time) >= ?`;
      bindings.push(startDate);
    }

    if (endDate) {
      query += ` AND DATE(ts.exit_time) <= ?`;
      bindings.push(endDate);
    }

    // Get total count
    const countQuery = query.replace(
      /SELECT[\s\S]+FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await c.env.DB
      .prepare(countQuery)
      .bind(...bindings)
      .first();

    const total = (countResult?.total as number) || 0;

    // Get paginated results
    query += ` ORDER BY ts.exit_time DESC LIMIT ? OFFSET ?`;
    bindings.push(limit, offset);

    const trades = await c.env.DB
      .prepare(query)
      .bind(...bindings)
      .all();

    return c.json({
      coin: coin || 'all',
      expertId: expertId || 'all',
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      trades: trades.results || []
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Scheduled cron trigger handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Handle cron triggers
    const cronType = event.cron;

    console.log(`⏰ Cron triggered: ${cronType} at ${new Date(event.scheduledTime).toISOString()}`);

    // AI 전문가 자동 학습 & 트레이딩 아레나 (매 1분)
    if (cronType === '*/1 * * * *') {
      // 두 크론 동시 실행
      await Promise.all([
        handleAILearning(event, env, ctx),
        handleTradingArena(event, env, ctx)
      ]);
    }

    // TODO: Implement additional cron handlers
    // - Fetch news every 5 minutes (*/5 * * * *)
    // - Run analysis every 30 minutes (*/30 * * * *)
  },
};
