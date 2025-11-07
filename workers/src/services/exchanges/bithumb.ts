import type { ExchangeTicker } from '../../types';

const BITHUMB_API = 'https://api.bithumb.com/public';

export class BithumbService {
  /**
   * Get current ticker information
   */
  async getTicker(symbol: string): Promise<ExchangeTicker> {
    const response = await fetch(`${BITHUMB_API}/ticker/${symbol}_KRW`);

    if (!response.ok) {
      throw new Error(`Bithumb API error: ${response.statusText}`);
    }

    const result = await response.json<any>();

    if (result.status !== '0000') {
      throw new Error(`Bithumb API error: ${result.message}`);
    }

    const data = result.data;

    return {
      symbol: symbol,
      price: parseFloat(data.closing_price),
      volume: parseFloat(data.units_traded_24H),
      high24h: parseFloat(data.max_price),
      low24h: parseFloat(data.min_price),
      change24h: parseFloat(data.fluctate_rate_24H),
    };
  }

  /**
   * Get all tickers at once
   */
  async getAllTickers(symbols: string[]): Promise<ExchangeTicker[]> {
    const response = await fetch(`${BITHUMB_API}/ticker/ALL_KRW`);

    if (!response.ok) {
      throw new Error(`Bithumb API error: ${response.statusText}`);
    }

    const result = await response.json<any>();

    if (result.status !== '0000') {
      throw new Error(`Bithumb API error: ${result.message}`);
    }

    const tickers: ExchangeTicker[] = [];

    for (const symbol of symbols) {
      const data = result.data[symbol];
      if (data) {
        tickers.push({
          symbol: symbol,
          price: parseFloat(data.closing_price),
          volume: parseFloat(data.units_traded_24H),
          high24h: parseFloat(data.max_price),
          low24h: parseFloat(data.min_price),
          change24h: parseFloat(data.fluctate_rate_24H),
        });
      }
    }

    return tickers;
  }
}

export const bithumbService = new BithumbService();
