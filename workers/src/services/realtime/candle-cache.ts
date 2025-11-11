// 실시간 캔들 캐시 서비스 - Durable Object와 통신

import type { Price } from '../../types';
import type { Env } from '../../types';

export interface CandleResponse {
  candles: Price[];
  currentPrice: number;
}

/**
 * 실시간 캔들 캐시 서비스
 * Durable Object와 통신하여 최신 캔들 데이터 가져오기
 */
export class CandleCacheService {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Durable Object 인스턴스 가져오기
   */
  private getDurableObject(symbol: string): DurableObjectStub {
    // 각 코인마다 고유한 DO ID 생성
    const id = this.env.CANDLE_BUILDER.idFromName(symbol);
    return this.env.CANDLE_BUILDER.get(id);
  }

  /**
   * WebSocket 연결 시작 (최초 1회)
   */
  async startWebSocket(symbol: string): Promise<void> {
    const stub = this.getDurableObject(symbol);
    const url = `https://fake-host/start?symbol=${symbol}`;

    const response = await stub.fetch(url);
    const result = await response.json<any>();

    console.log(`✅ ${symbol} WebSocket 시작:`, result);
  }

  /**
   * 최신 캔들 데이터 가져오기 (실시간)
   */
  async getCandles(symbol: string): Promise<CandleResponse> {
    const stub = this.getDurableObject(symbol);
    const url = 'https://fake-host/candles';

    const response = await stub.fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to get candles for ${symbol}: ${response.statusText}`);
    }

    const data = await response.json<CandleResponse>();
    return data;
  }

  /**
   * 상태 확인
   */
  async getStatus(symbol: string): Promise<{
    symbol: string;
    connected: boolean;
    candleCount: number;
  }> {
    const stub = this.getDurableObject(symbol);
    const url = 'https://fake-host/status';

    const response = await stub.fetch(url);
    const status = await response.json<any>();

    return status;
  }

  /**
   * WebSocket 연결 종료
   */
  async stopWebSocket(symbol: string): Promise<void> {
    const stub = this.getDurableObject(symbol);
    const url = 'https://fake-host/stop';

    await stub.fetch(url);
    console.log(`🔌 ${symbol} WebSocket 종료`);
  }
}
