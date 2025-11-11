// Cloudflare Durable Object - 실시간 캔들 빌더
// WebSocket 연결을 유지하며 틱 데이터를 10분봉으로 변환

import { DurableObject } from 'cloudflare:workers';
import { CandleBuilder, type Tick } from '../services/realtime/candle-builder';
import type { Price } from '../types';

export interface Env {
  CANDLE_BUILDER: DurableObjectNamespace;
}

/**
 * Upbit WebSocket 클라이언트 Durable Object
 *
 * 각 코인(BTC, ETH)마다 하나씩 생성됨
 * - WebSocket 연결 유지
 * - 틱 데이터 수신 및 10분봉 빌드
 * - Smart Trigger 감지 시 알림
 */
export class CandleBuilderDO extends DurableObject {
  private symbol: string = '';
  private ws: WebSocket | null = null;
  private candleBuilder: CandleBuilder | null = null;
  private reconnectTimer: number | null = null;

  /**
   * DO 초기화
   */
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  /**
   * HTTP 요청 처리
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. WebSocket 연결 시작
      if (path === '/start') {
        const symbol = url.searchParams.get('symbol');
        if (!symbol) {
          return new Response('Missing symbol', { status: 400 });
        }

        this.symbol = symbol;
        await this.startWebSocket();

        return new Response(JSON.stringify({ status: 'started', symbol }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 2. 최신 캔들 데이터 가져오기
      if (path === '/candles') {
        if (!this.candleBuilder) {
          return new Response('Candle builder not initialized', { status: 400 });
        }

        const candles = this.candleBuilder.getCandles();
        const currentPrice = this.candleBuilder.getCurrentPrice();

        return new Response(JSON.stringify({ candles, currentPrice }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 3. 상태 확인
      if (path === '/status') {
        return new Response(JSON.stringify({
          symbol: this.symbol,
          connected: this.ws !== null && this.ws.readyState === WebSocket.OPEN,
          candleCount: this.candleBuilder?.getCandles().length || 0
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 4. WebSocket 연결 종료
      if (path === '/stop') {
        this.stopWebSocket();
        return new Response(JSON.stringify({ status: 'stopped' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error('❌ DO 요청 처리 오류:', error);
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Upbit WebSocket 연결 시작
   */
  private async startWebSocket(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`✅ ${this.symbol} WebSocket 이미 연결됨`);
      return;
    }

    try {
      // Candle Builder 초기화
      if (!this.candleBuilder) {
        // 상태 복원 시도
        const savedState = await this.state.storage.get<string>('candleBuilder');
        if (savedState) {
          this.candleBuilder = CandleBuilder.deserialize(savedState);
          console.log(`🔄 ${this.symbol} 캔들 빌더 상태 복원`);
        } else {
          this.candleBuilder = new CandleBuilder(this.symbol, 10, 100);
          console.log(`🆕 ${this.symbol} 캔들 빌더 생성`);
        }
      }

      // WebSocket 연결
      this.ws = new WebSocket('wss://api.upbit.com/websocket/v1');

      this.ws.addEventListener('open', () => {
        console.log(`✅ ${this.symbol} Upbit WebSocket 연결 성공`);

        // 구독 메시지 전송
        const subscribeMessage = [
          { ticket: 'crypto-arena' },
          { type: 'trade', codes: [`KRW-${this.symbol}`] }
        ];

        this.ws?.send(JSON.stringify(subscribeMessage));
        console.log(`📡 ${this.symbol} 거래 데이터 구독 시작`);
      });

      this.ws.addEventListener('message', async (event) => {
        await this.handleWebSocketMessage(event);
      });

      this.ws.addEventListener('error', (error) => {
        console.error(`❌ ${this.symbol} WebSocket 오류:`, error);
      });

      this.ws.addEventListener('close', () => {
        console.log(`🔌 ${this.symbol} WebSocket 연결 종료`);
        this.scheduleReconnect();
      });
    } catch (error) {
      console.error(`❌ ${this.symbol} WebSocket 연결 실패:`, error);
      this.scheduleReconnect();
    }
  }

  /**
   * WebSocket 메시지 처리
   */
  private async handleWebSocketMessage(event: MessageEvent): Promise<void> {
    try {
      // Upbit은 Blob으로 응답
      const blob = event.data as Blob;
      const text = await blob.text();
      const data = JSON.parse(text);

      // 거래 데이터만 처리
      if (data.type !== 'trade') {
        return;
      }

      // Tick 데이터 생성
      const tick: Tick = {
        symbol: this.symbol,
        price: data.trade_price,
        volume: data.trade_volume,
        timestamp: data.timestamp // milliseconds
      };

      // Candle Builder에 추가
      if (this.candleBuilder) {
        const result = this.candleBuilder.addTick(tick);

        // 스마트 트리거 감지
        if (result.shouldAnalyze) {
          console.log(`🚨 ${this.symbol} ${result.reason} - 분석 필요`);

          // 상태 저장
          await this.saveState();

          // TODO: 실제 트레이딩 로직 호출
          // 여기서 trading-arena의 processCoin을 호출할 수 있음
        }
      }
    } catch (error) {
      console.error(`❌ ${this.symbol} 메시지 처리 오류:`, error);
    }
  }

  /**
   * 재연결 스케줄링
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    console.log(`🔄 ${this.symbol} 3초 후 재연결 시도`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.startWebSocket();
    }, 3000) as unknown as number;
  }

  /**
   * WebSocket 연결 종료
   */
  private stopWebSocket(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log(`🔌 ${this.symbol} WebSocket 연결 종료`);
  }

  /**
   * 상태 저장
   */
  private async saveState(): Promise<void> {
    if (this.candleBuilder) {
      await this.state.storage.put('candleBuilder', this.candleBuilder.serialize());
    }
  }

  /**
   * DO 종료 시 정리
   */
  async alarm(): Promise<void> {
    // 주기적으로 상태 저장 (5분마다)
    await this.saveState();
    await this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000);
  }
}
