// Alternative.me Fear & Greed Index API (무료)
// https://alternative.me/crypto/fear-and-greed-index/

/**
 * Fear & Greed Index
 * 0-25: Extreme Fear (극단적 공포) → 매수 신호
 * 26-45: Fear (공포) → 매수 고려
 * 46-55: Neutral (중립)
 * 56-75: Greed (탐욕) → 매도 고려
 * 76-100: Extreme Greed (극단적 탐욕) → 매도 신호
 */

const FEAR_GREED_API = 'https://api.alternative.me/fng/';

export interface FearGreedData {
  value: number; // 0-100
  valueClassification: string; // "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"
  timestamp: number;
  timeUntilUpdate: number;
}

export class FearGreedService {
  private cache: FearGreedData | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

  /**
   * Get current Fear & Greed Index (무료 API, 캐싱 적용)
   */
  async getFearGreedIndex(): Promise<FearGreedData> {
    try {
      // 캐시 확인
      const now = Date.now();
      if (this.cache && now < this.cacheExpiry) {
        return this.cache;
      }

      const response = await fetch(`${FEAR_GREED_API}?limit=1`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CryptoAnalysisBot/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`Fear & Greed API error: ${response.statusText}`);
      }

      const data = await response.json<any>();
      const fngData = data.data[0];

      const fearGreedData: FearGreedData = {
        value: parseInt(fngData.value),
        valueClassification: fngData.value_classification,
        timestamp: parseInt(fngData.timestamp),
        timeUntilUpdate: parseInt(fngData.time_until_update || '0'),
      };

      // 캐시 저장
      this.cache = fearGreedData;
      this.cacheExpiry = now + this.CACHE_DURATION;

      return fearGreedData;
    } catch (error) {
      console.error('Error fetching Fear & Greed Index:', error);

      // 에러 시 중립 반환 (캐시가 있으면 캐시 사용)
      if (this.cache) {
        console.warn('Using cached Fear & Greed data due to API error');
        return this.cache;
      }

      return {
        value: 50, // 중립
        valueClassification: 'Neutral',
        timestamp: Math.floor(Date.now() / 1000),
        timeUntilUpdate: 0,
      };
    }
  }

  /**
   * Get signal interpretation from Fear & Greed value
   */
  getSignalInterpretation(value: number): {
    signal: 'long' | 'short' | 'neutral';
    strength: number;
    reasoning: string;
  } {
    if (value <= 25) {
      // Extreme Fear → 강한 매수 신호
      return {
        signal: 'long',
        strength: 80 + (25 - value), // 80-105
        reasoning: '극단적 공포 → 저점 매수 기회',
      };
    } else if (value <= 45) {
      // Fear → 매수 신호
      return {
        signal: 'long',
        strength: 50 + (45 - value), // 50-70
        reasoning: '공포 → 매수 고려',
      };
    } else if (value <= 55) {
      // Neutral
      return {
        signal: 'neutral',
        strength: 40,
        reasoning: '중립 → 추세 관망',
      };
    } else if (value <= 75) {
      // Greed → 매도 신호
      return {
        signal: 'short',
        strength: 50 + (value - 55), // 50-70
        reasoning: '탐욕 → 매도 고려',
      };
    } else {
      // Extreme Greed → 강한 매도 신호
      return {
        signal: 'short',
        strength: 80 + (value - 75), // 80-105
        reasoning: '극단적 탐욕 → 고점 매도 기회',
      };
    }
  }
}

export const fearGreedService = new FearGreedService();
