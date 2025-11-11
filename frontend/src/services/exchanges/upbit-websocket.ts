// Upbit WebSocket 실시간 가격 서비스

export interface UpbitTickerData {
  type: 'ticker';
  code: string; // KRW-BTC, KRW-ETH
  trade_price: number; // 현재가
  change: 'RISE' | 'EVEN' | 'FALL'; // 전일 대비
  change_price: number; // 전일 대비 가격 변동
  change_rate: number; // 전일 대비 변동률
  signed_change_rate: number; // 부호가 있는 변동률
  trade_volume: number; // 거래량
  acc_trade_volume_24h: number; // 24시간 누적 거래량
  acc_trade_price_24h: number; // 24시간 누적 거래대금
  high_price: number; // 고가
  low_price: number; // 저가
  prev_closing_price: number; // 전일 종가
  timestamp: number; // 타임스탬프 (milliseconds)
}

export type UpbitTickerCallback = (data: UpbitTickerData) => void;

export class UpbitWebSocketService {
  private ws: WebSocket | null = null;
  private callbacks: Map<string, Set<UpbitTickerCallback>> = new Map();
  private reconnectTimer: number | null = null;
  private isIntentionallyClosed = false;
  private subscribedCodes: Set<string> = new Set();

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyClosed = false;
    this.ws = new WebSocket('wss://api.upbit.com/websocket/v1');

    this.ws.onopen = () => {
      console.log('✅ Upbit WebSocket 연결 성공');

      // 재연결 시 기존 구독 복원
      if (this.subscribedCodes.size > 0) {
        this.subscribe(Array.from(this.subscribedCodes));
      }
    };

    this.ws.onmessage = async (event) => {
      try {
        const blob = event.data as Blob;
        const text = await blob.text();
        const data = JSON.parse(text) as UpbitTickerData;

        if (data.type === 'ticker') {
          const callbacks = this.callbacks.get(data.code);
          if (callbacks) {
            callbacks.forEach(callback => callback(data));
          }
        }
      } catch (error) {
        console.error('❌ WebSocket 메시지 파싱 오류:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ Upbit WebSocket 오류:', error);
    };

    this.ws.onclose = () => {
      console.log('🔌 Upbit WebSocket 연결 종료');

      // 의도적으로 닫은 게 아니면 재연결
      if (!this.isIntentionallyClosed) {
        this.reconnectTimer = setTimeout(() => {
          console.log('🔄 Upbit WebSocket 재연결 시도...');
          this.connect();
        }, 3000);
      }
    };
  }

  /**
   * 코인 구독
   * @param codes 업비트 마켓 코드 배열 (예: ['KRW-BTC', 'KRW-ETH'])
   */
  public subscribe(codes: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket이 연결되지 않았습니다. 연결 후 자동 구독됩니다.');
      codes.forEach(code => this.subscribedCodes.add(code));
      return;
    }

    codes.forEach(code => this.subscribedCodes.add(code));

    const subscribeMessage = [
      { ticket: 'crypto-arena' },
      { type: 'ticker', codes }
    ];

    this.ws.send(JSON.stringify(subscribeMessage));
    console.log(`📡 구독 요청: ${codes.join(', ')}`);
  }

  /**
   * 특정 코인의 실시간 데이터 수신 콜백 등록
   */
  public on(code: string, callback: UpbitTickerCallback) {
    if (!this.callbacks.has(code)) {
      this.callbacks.set(code, new Set());
    }
    this.callbacks.get(code)!.add(callback);
  }

  /**
   * 콜백 해제
   */
  public off(code: string, callback: UpbitTickerCallback) {
    const callbacks = this.callbacks.get(code);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.callbacks.delete(code);
      }
    }
  }

  /**
   * 연결 종료
   */
  public disconnect() {
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
    this.subscribedCodes.clear();
    console.log('🔌 Upbit WebSocket 연결 해제');
  }
}

// 싱글톤 인스턴스
export const upbitWebSocket = new UpbitWebSocketService();
