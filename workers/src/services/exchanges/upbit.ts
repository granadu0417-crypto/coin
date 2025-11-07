import type { ExchangeTicker, Price } from '../../types';

const UPBIT_API = 'https://api.upbit.com/v1';

export class UpbitService {
  /**
   * Get current ticker information
   */
  async getTicker(symbol: string): Promise<ExchangeTicker> {
    const market = `KRW-${symbol}`;
    const response = await fetch(`${UPBIT_API}/ticker?markets=${market}`);

    if (!response.ok) {
      throw new Error(`Upbit API error: ${response.statusText}`);
    }

    const data = await response.json<any[]>();

    if (!data || data.length === 0) {
      throw new Error(`No data for ${symbol}`);
    }

    const ticker = data[0];

    return {
      symbol: symbol,
      price: ticker.trade_price,
      volume: ticker.acc_trade_volume_24h,
      high24h: ticker.high_price,
      low24h: ticker.low_price,
      change24h: ticker.signed_change_rate * 100,
    };
  }

  /**
   * Get candlestick data
   */
  async getCandles(
    symbol: string,
    unit: number = 1, // minutes: 1, 3, 5, 10, 15, 30, 60, 240
    count: number = 100
  ): Promise<Price[]> {
    const market = `KRW-${symbol}`;
    const response = await fetch(
      `${UPBIT_API}/candles/minutes/${unit}?market=${market}&count=${count}`
    );

    if (!response.ok) {
      throw new Error(`Upbit API error: ${response.statusText}`);
    }

    const data = await response.json<any[]>();

    return data
      .map((candle) => ({
        symbol: symbol,
        exchange: 'upbit',
        timestamp: Math.floor(new Date(candle.candle_date_time_kst).getTime() / 1000),
        open: candle.opening_price,
        high: candle.high_price,
        low: candle.low_price,
        close: candle.trade_price,
        volume: candle.candle_acc_trade_volume,
      }))
      .reverse(); // Upbit returns newest first, reverse to oldest first
  }

  /**
   * Get tickers for multiple symbols
   */
  async getAllTickers(symbols: string[]): Promise<ExchangeTicker[]> {
    const markets = symbols.map((s) => `KRW-${s}`).join(',');
    const response = await fetch(`${UPBIT_API}/ticker?markets=${markets}`);

    if (!response.ok) {
      throw new Error(`Upbit API error: ${response.statusText}`);
    }

    const data = await response.json<any[]>();

    return data.map((ticker) => ({
      symbol: ticker.market.replace('KRW-', ''),
      price: ticker.trade_price,
      volume: ticker.acc_trade_volume_24h,
      high24h: ticker.high_price,
      low24h: ticker.low_price,
      change24h: ticker.signed_change_rate * 100,
    }));
  }
}

export const upbitService = new UpbitService();
