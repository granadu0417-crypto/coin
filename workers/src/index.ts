import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';

// Import services
import { binanceService } from './services/exchanges/binance';
import { upbitService } from './services/exchanges/upbit';
import { bithumbService } from './services/exchanges/bithumb';
import { technicalAnalyst } from './services/analysis/technical';
import { rssAggregator } from './services/rss/aggregator';

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
  const exchange = c.req.query('exchange') || 'binance';
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
    // Fetch price history
    const prices = await binanceService.getKlines(symbol, '1m', 100);
    const ticker = await binanceService.getTicker(symbol);

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
      ? await rssAggregator.getHighImpactMentions(hours)
      : await rssAggregator.getInfluencerMentions(hours);

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
    const allMentions = await rssAggregator.getInfluencerMentions(hours);

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

// Scheduled cron trigger handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Handle cron triggers
    const cronType = event.cron;

    console.log(`Cron triggered: ${cronType}`);

    // TODO: Implement cron handlers
    // - Update prices every 1 minute
    // - Fetch news every 5 minutes
    // - Run analysis every 30 minutes
  },
};
