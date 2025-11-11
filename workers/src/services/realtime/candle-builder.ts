// 실시간 캔들 빌더 - WebSocket 틱 데이터를 10분봉으로 변환

import type { Price } from '../../types';

export interface Tick {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number; // milliseconds
}

export interface Candle {
  symbol: string;
  exchange: string;
  timestamp: number; // seconds (candle start time)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * In-Memory 캔들 빌더
 * WebSocket 틱 데이터를 받아서 10분봉으로 변환
 */
export class CandleBuilder {
  private symbol: string;
  private intervalMinutes: number;
  private candles: Candle[] = [];
  private maxCandles: number;

  // 현재 진행 중인 캔들
  private currentCandle: Candle | null = null;

  // 스마트 트리거 감지용
  private lastTriggerCheck: number = 0;
  private previousVolume: number = 0;

  constructor(
    symbol: string,
    intervalMinutes: number = 10,
    maxCandles: number = 100
  ) {
    this.symbol = symbol;
    this.intervalMinutes = intervalMinutes;
    this.maxCandles = maxCandles;
  }

  /**
   * 새로운 틱 데이터 추가
   * @returns 트리거 조건 충족 여부 (분석 실행해야 하는지)
   */
  public addTick(tick: Tick): { shouldAnalyze: boolean; reason?: string } {
    const candleStartTime = this.getCandleStartTime(tick.timestamp);

    // 새로운 캔들 시작
    if (!this.currentCandle || this.currentCandle.timestamp !== candleStartTime) {
      // 이전 캔들 저장
      if (this.currentCandle) {
        this.saveCandle(this.currentCandle);

        // 캔들 완성 시 항상 분석
        return { shouldAnalyze: true, reason: '🕐 10분봉 완성' };
      }

      // 새 캔들 생성
      this.currentCandle = {
        symbol: tick.symbol,
        exchange: 'upbit',
        timestamp: candleStartTime,
        open: tick.price,
        high: tick.price,
        low: tick.price,
        close: tick.price,
        volume: tick.volume
      };
    } else {
      // 기존 캔들 업데이트
      this.currentCandle.high = Math.max(this.currentCandle.high, tick.price);
      this.currentCandle.low = Math.min(this.currentCandle.low, tick.price);
      this.currentCandle.close = tick.price;
      this.currentCandle.volume += tick.volume;
    }

    // 스마트 트리거 체크
    return this.checkSmartTriggers(tick);
  }

  /**
   * 스마트 트리거 감지
   * - 거래량 급증 (2배 이상)
   * - 가격 급변 (1% 이상)
   * - 최소 5초 간격
   */
  private checkSmartTriggers(tick: Tick): { shouldAnalyze: boolean; reason?: string } {
    const now = Date.now();

    // 최소 5초 간격 체크
    if (now - this.lastTriggerCheck < 5000) {
      return { shouldAnalyze: false };
    }

    if (!this.currentCandle) {
      return { shouldAnalyze: false };
    }

    // 1. 거래량 급증 감지 (2배 이상)
    const recentVolume = this.currentCandle.volume;
    if (this.previousVolume > 0) {
      const volumeRatio = recentVolume / this.previousVolume;

      if (volumeRatio >= 2.0) {
        this.lastTriggerCheck = now;
        this.previousVolume = recentVolume;
        return { shouldAnalyze: true, reason: `📊 거래량 급증 ${volumeRatio.toFixed(1)}배` };
      }
    }
    this.previousVolume = recentVolume;

    // 2. 가격 급변 감지 (1% 이상)
    const priceChange = Math.abs((tick.price - this.currentCandle.open) / this.currentCandle.open) * 100;

    if (priceChange >= 1.0) {
      this.lastTriggerCheck = now;
      return { shouldAnalyze: true, reason: `⚡ 가격 급변 ${priceChange.toFixed(2)}%` };
    }

    return { shouldAnalyze: false };
  }

  /**
   * 캔들 저장
   */
  private saveCandle(candle: Candle): void {
    this.candles.push(candle);

    // 최대 개수 유지
    if (this.candles.length > this.maxCandles) {
      this.candles.shift();
    }
  }

  /**
   * 최신 100개 캔들 가져오기 (signals.ts와 호환)
   */
  public getCandles(): Price[] {
    const allCandles = [...this.candles];

    // 현재 진행 중인 캔들도 포함
    if (this.currentCandle) {
      allCandles.push(this.currentCandle);
    }

    // Price 타입으로 변환
    return allCandles.map(c => ({
      symbol: c.symbol,
      exchange: c.exchange,
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    }));
  }

  /**
   * 현재 가격 가져오기
   */
  public getCurrentPrice(): number {
    return this.currentCandle?.close || 0;
  }

  /**
   * 캔들 시작 시간 계산
   * @param timestamp 틱 타임스탬프 (milliseconds)
   * @returns 캔들 시작 시간 (seconds)
   */
  private getCandleStartTime(timestamp: number): number {
    const intervalMs = this.intervalMinutes * 60 * 1000;
    const candleStartMs = Math.floor(timestamp / intervalMs) * intervalMs;
    return Math.floor(candleStartMs / 1000); // seconds
  }

  /**
   * 상태 저장용 직렬화
   */
  public serialize(): string {
    return JSON.stringify({
      symbol: this.symbol,
      intervalMinutes: this.intervalMinutes,
      maxCandles: this.maxCandles,
      candles: this.candles,
      currentCandle: this.currentCandle,
      lastTriggerCheck: this.lastTriggerCheck,
      previousVolume: this.previousVolume
    });
  }

  /**
   * 상태 복원용 역직렬화
   */
  public static deserialize(data: string): CandleBuilder {
    const obj = JSON.parse(data);
    const builder = new CandleBuilder(obj.symbol, obj.intervalMinutes, obj.maxCandles);

    builder.candles = obj.candles || [];
    builder.currentCandle = obj.currentCandle || null;
    builder.lastTriggerCheck = obj.lastTriggerCheck || 0;
    builder.previousVolume = obj.previousVolume || 0;

    return builder;
  }
}
