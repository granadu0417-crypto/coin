import type { ExchangeTicker, Price } from '../../types';

const BINANCE_API = 'https://data-api.binance.vision/api/v3'; // Public data endpoint (no IP restrictions)

export class BinanceService {
  /**
   * Get 24hr ticker price change statistics
   */
  async getTicker(symbol: string): Promise<ExchangeTicker> {
    const response = await fetch(
      `${BINANCE_API}/ticker/24hr?symbol=${symbol}USDT`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CryptoAnalysisBot/1.0)',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }

    const data = await response.json<any>();

    return {
      symbol: symbol,
      price: parseFloat(data.lastPrice),
      volume: parseFloat(data.volume),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      change24h: parseFloat(data.priceChangePercent),
    };
  }

  /**
   * Get historical kline/candlestick data
   */
  async getKlines(
    symbol: string,
    interval: string = '1m',
    limit: number = 100
  ): Promise<Price[]> {
    const response = await fetch(
      `${BINANCE_API}/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CryptoAnalysisBot/1.0)',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }

    const data = await response.json<any[]>();

    return data.map((candle) => ({
      symbol: symbol,
      exchange: 'binance',
      timestamp: Math.floor(candle[0] / 1000), // Convert to seconds
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));
  }

  /**
   * Get current price for multiple symbols
   */
  async getAllTickers(symbols: string[]): Promise<ExchangeTicker[]> {
    const tickers: ExchangeTicker[] = [];

    for (const symbol of symbols) {
      try {
        const ticker = await this.getTicker(symbol);
        tickers.push(ticker);
      } catch (error) {
        console.error(`Error fetching ${symbol} from Binance:`, error);
      }
    }

    return tickers;
  }
}

export const binanceService = new BinanceService();
