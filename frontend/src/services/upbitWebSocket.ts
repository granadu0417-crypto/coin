/**
 * 업비트 웹소켓 서비스
 * 실시간 비트코인, 이더리움 시세를 받아옵니다
 */

export interface UpbitTicker {
  type: string;
  code: string; // 마켓 코드 (예: KRW-BTC)
  trade_price: number; // 현재가
  change: 'RISE' | 'EVEN' | 'FALL'; // 전일 대비
  change_price: number; // 전일 대비 변화 금액
  change_rate: number; // 전일 대비 변화율
  signed_change_price: number; // 부호가 있는 변화 금액
  signed_change_rate: number; // 부호가 있는 변화율
  trade_volume: number; // 가장 최근 거래량
  acc_trade_volume_24h: number; // 24시간 누적 거래량
  acc_trade_price_24h: number; // 24시간 누적 거래대금
  high_price: number; // 고가
  low_price: number; // 저가
  prev_closing_price: number; // 전일 종가
  timestamp: number; // 타임스탬프 (milliseconds)
}

type TickerCallback = (ticker: UpbitTicker) => void;

export class UpbitWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private callbacks: Map<string, Set<TickerCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isIntentionallyClosed = false;

  /**
   * 특정 코인의 실시간 시세 구독
   * @param symbol 코인 심볼 (예: 'BTC', 'ETH')
   * @param callback 시세 업데이트 콜백 함수
   */
  subscribe(symbol: string, callback: TickerCallback) {
    const market = `KRW-${symbol.toUpperCase()}`;

    if (!this.callbacks.has(market)) {
      this.callbacks.set(market, new Set());
    }

    this.callbacks.get(market)!.add(callback);

    // 웹소켓이 없거나 닫혀있으면 연결
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.connect();
    } else if (this.ws.readyState === WebSocket.OPEN) {
      // 이미 연결되어 있으면 구독 메시지 전송
      this.sendSubscribeMessage();
    }
  }

  /**
   * 구독 취소
   */
  unsubscribe(symbol: string, callback: TickerCallback) {
    const market = `KRW-${symbol.toUpperCase()}`;
    const callbacks = this.callbacks.get(market);

    if (callbacks) {
      callbacks.delete(callback);

      // 해당 마켓의 모든 콜백이 제거되면 Map에서도 제거
      if (callbacks.size === 0) {
        this.callbacks.delete(market);
      }
    }

    // 모든 구독이 취소되면 연결 종료
    if (this.callbacks.size === 0) {
      this.disconnect();
    }
  }

  /**
   * 웹소켓 연결
   */
  private connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket('wss://api.upbit.com/websocket/v1');

      this.ws.onopen = () => {
        console.log('[Upbit WebSocket] Connected');
        this.reconnectAttempts = 0;
        this.sendSubscribeMessage();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.ws.onerror = (error) => {
        console.error('[Upbit WebSocket] Error:', error);
      };

      this.ws.onclose = () => {
        console.log('[Upbit WebSocket] Disconnected');
        this.ws = null;

        // 의도적으로 닫은 게 아니면 재연결 시도
        if (!this.isIntentionallyClosed && this.callbacks.size > 0) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('[Upbit WebSocket] Connection failed:', error);
      this.attemptReconnect();
    }
  }

  /**
   * 재연결 시도
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Upbit WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`[Upbit WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * 구독 메시지 전송
   */
  private sendSubscribeMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const markets = Array.from(this.callbacks.keys());

    if (markets.length === 0) {
      return;
    }

    const subscribeMessage = [
      { ticket: 'ai-trading-arena' },
      {
        type: 'ticker',
        codes: markets,
      },
    ];

    this.ws.send(JSON.stringify(subscribeMessage));
    console.log('[Upbit WebSocket] Subscribed to:', markets);
  }

  /**
   * 메시지 처리
   */
  private async handleMessage(event: MessageEvent) {
    try {
      // 업비트는 바이너리 데이터를 보내므로 변환 필요
      const blob = event.data as Blob;
      const text = await blob.text();
      const data: UpbitTicker = JSON.parse(text);

      // 티커 타입 메시지만 처리
      if (data.type === 'ticker') {
        const callbacks = this.callbacks.get(data.code);

        if (callbacks) {
          callbacks.forEach(callback => {
            callback(data);
          });
        }
      }
    } catch (error) {
      console.error('[Upbit WebSocket] Failed to parse message:', error);
    }
  }

  /**
   * 연결 종료
   */
  disconnect() {
    this.isIntentionallyClosed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.callbacks.clear();
    console.log('[Upbit WebSocket] Disconnected by user');
  }

  /**
   * 현재 연결 상태 확인
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// 싱글톤 인스턴스
export const upbitWebSocket = new UpbitWebSocketService();
