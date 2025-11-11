import type { ExchangeTicker, Price } from '../../types';

const BINANCE_API = 'https://data-api.binance.vision/api/v3'; // Public data endpoint (no IP restrictions)
const BINANCE_FUTURES_API = 'https://fapi.binance.com/fapi/v1'; // Futures API (무료)

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

  /**
   * Get current funding rate from Binance Futures (무료 API)
   * 펀딩비율: 롱/숏 포지션 비율을 나타냄
   * - 양수(+): 롱 포지션이 많음 → 숏 신호
   * - 음수(-): 숏 포지션이 많음 → 롱 신호
   */
  async getFundingRate(symbol: string): Promise<{
    fundingRate: number;
    fundingTime: number;
    markPrice: number;
  }> {
    try {
      const response = await fetch(
        `${BINANCE_FUTURES_API}/premiumIndex?symbol=${symbol}USDT`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CryptoAnalysisBot/1.0)',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Binance Futures API error: ${response.statusText}`);
      }

      const data = await response.json<any>();

      return {
        fundingRate: parseFloat(data.lastFundingRate), // 현재 펀딩비율
        fundingTime: parseInt(data.nextFundingTime), // 다음 펀딩 시간
        markPrice: parseFloat(data.markPrice), // Mark Price
      };
    } catch (error) {
      console.error(`Error fetching funding rate for ${symbol}:`, error);
      // 에러 시 중립 반환
      return {
        fundingRate: 0,
        fundingTime: 0,
        markPrice: 0,
      };
    }
  }
}

export const binanceService = new BinanceService();
