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

// Import AI services
import {
  getAllExpertStats,
  getExpertStats,
  loadExpertProfile
} from './services/ai/database';
import { expertProfiles } from './services/ai/experts';

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

    if (exchange === 'binance') {
      prices = await binanceService.getKlines(symbol, '1m', limit);
    } else if (exchange === 'upbit') {
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

// Scheduled cron trigger handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Handle cron triggers
    const cronType = event.cron;

    console.log(`⏰ Cron triggered: ${cronType} at ${new Date(event.scheduledTime).toISOString()}`);

    // AI 전문가 자동 학습 (매 1분)
    if (cronType === '*/1 * * * *') {
      await handleAILearning(event, env, ctx);
    }

    // TODO: Implement additional cron handlers
    // - Fetch news every 5 minutes (*/5 * * * *)
    // - Run analysis every 30 minutes (*/30 * * * *)
  },
};
