// Upbit WebSocket React Hook

import { useEffect, useState } from 'react';
import { upbitWebSocket, type UpbitTickerData } from '../services/exchanges/upbit-websocket';

interface RealtimePrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

/**
 * Upbit WebSocket으로 실시간 가격 데이터 수신
 * @param symbol 코인 심볼 (BTC, ETH)
 */
export function useUpbitWebSocket(symbol: string): RealtimePrice | null {
  const [price, setPrice] = useState<RealtimePrice | null>(null);

  useEffect(() => {
    // 업비트 마켓 코드로 변환 (BTC → KRW-BTC)
    const marketCode = `KRW-${symbol}`;

    // 실시간 데이터 수신 콜백
    const handleTicker = (data: UpbitTickerData) => {
      setPrice({
        symbol,
        price: data.trade_price,
        change24h: data.change_price,
        changePercent24h: data.signed_change_rate * 100, // 소수점 → 퍼센트
        volume24h: data.acc_trade_volume_24h,
        high24h: data.high_price,
        low24h: data.low_price,
        timestamp: data.timestamp
      });
    };

    // 구독 시작
    upbitWebSocket.subscribe([marketCode]);
    upbitWebSocket.on(marketCode, handleTicker);

    // 클린업: 컴포넌트 언마운트 시 콜백 해제
    return () => {
      upbitWebSocket.off(marketCode, handleTicker);
    };
  }, [symbol]);

  return price;
}
