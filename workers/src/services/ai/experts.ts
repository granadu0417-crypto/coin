// 10명의 AI 전문가 프로필 정의

import type { ExpertProfile } from '../../types/ai';

export const expertProfiles: ExpertProfile[] = [
  // Expert #1: RSI 전문가
  {
    id: 1,
    name: 'RSI 전문가',
    strategy: 'RSI 과매수/과매도 중심',
    emoji: '📊',
    weights: {
      '5m': {
        rsi: 0.50, macd: 0.70, bollinger: 0.40,
        funding: 0.60, volume: 0.80, trend: 0.20, fearGreed: 0.10
      },
      '10m': {
        rsi: 0.70, macd: 0.65, bollinger: 0.50,
        funding: 0.50, volume: 0.60, trend: 0.40, fearGreed: 0.15
      },
      '30m': {
        rsi: 0.85, macd: 0.50, bollinger: 0.60,
        funding: 0.40, volume: 0.50, trend: 0.55, fearGreed: 0.20
      },
      '1h': {
        rsi: 0.80, macd: 0.45, bollinger: 0.55,
        funding: 0.30, volume: 0.40, trend: 0.70, fearGreed: 0.25
      }
    },
    confidenceThreshold: {
      '5m': 0.55, '10m': 0.50, '30m': 0.45, '1h': 0.40
    },
    recentPerformance: {
      '5m': [], '10m': [], '30m': [], '1h': []
    }
  },

  // Expert #2: MACD 전문가
  {
    id: 2,
    name: 'MACD 전문가',
    strategy: 'MACD 모멘텀 중심',
    emoji: '📈',
    weights: {
      '5m': {
        rsi: 0.40, macd: 0.90, bollinger: 0.50,
        funding: 0.60, volume: 0.85, trend: 0.35, fearGreed: 0.10
      },
      '10m': {
        rsi: 0.45, macd: 0.85, bollinger: 0.55,
        funding: 0.50, volume: 0.70, trend: 0.50, fearGreed: 0.15
      },
      '30m': {
        rsi: 0.50, macd: 0.75, bollinger: 0.60,
        funding: 0.40, volume: 0.60, trend: 0.65, fearGreed: 0.20
      },
      '1h': {
        rsi: 0.50, macd: 0.70, bollinger: 0.55,
        funding: 0.30, volume: 0.50, trend: 0.75, fearGreed: 0.25
      }
    },
    confidenceThreshold: {
      '5m': 0.55, '10m': 0.50, '30m': 0.45, '1h': 0.40
    },
    recentPerformance: {
      '5m': [], '10m': [], '30m': [], '1h': []
    }
  },

  // Expert #3: 볼린저 전문가
  {
    id: 3,
    name: '볼린저 전문가',
    strategy: '볼린저 밴드 돌파 중심',
    emoji: '🎯',
    weights: {
      '5m': {
        rsi: 0.45, macd: 0.65, bollinger: 0.85,
        funding: 0.55, volume: 0.75, trend: 0.25, fearGreed: 0.10
      },
      '10m': {
        rsi: 0.55, macd: 0.60, bollinger: 0.85,
        funding: 0.45, volume: 0.65, trend: 0.40, fearGreed: 0.15
      },
      '30m': {
        rsi: 0.60, macd: 0.55, bollinger: 0.80,
        funding: 0.35, volume: 0.55, trend: 0.50, fearGreed: 0.20
      },
      '1h': {
        rsi: 0.60, macd: 0.50, bollinger: 0.75,
        funding: 0.25, volume: 0.45, trend: 0.60, fearGreed: 0.25
      }
    },
    confidenceThreshold: {
      '5m': 0.55, '10m': 0.50, '30m': 0.45, '1h': 0.40
    },
    recentPerformance: {
      '5m': [], '10m': [], '30m': [], '1h': []
    }
  },

  // Expert #4: 펀딩 전문가
  {
    id: 4,
    name: '펀딩 전문가',
    strategy: '선물 펀딩비율 중심',
    emoji: '💰',
    weights: {
      '5m': {
        rsi: 0.35, macd: 0.55, bollinger: 0.40,
        funding: 0.90, volume: 0.70, trend: 0.30, fearGreed: 0.15
      },
      '10m': {
        rsi: 0.40, macd: 0.50, bollinger: 0.45,
        funding: 0.85, volume: 0.60, trend: 0.45, fearGreed: 0.20
      },
      '30m': {
        rsi: 0.45, macd: 0.45, bollinger: 0.50,
        funding: 0.80, volume: 0.50, trend: 0.60, fearGreed: 0.25
      },
      '1h': {
        rsi: 0.45, macd: 0.40, bollinger: 0.45,
        funding: 0.75, volume: 0.40, trend: 0.70, fearGreed: 0.30
      }
    },
    confidenceThreshold: {
      '5m': 0.55, '10m': 0.50, '30m': 0.45, '1h': 0.40
    },
    recentPerformance: {
      '5m': [], '10m': [], '30m': [], '1h': []
    }
  },

  // Expert #5: 거래량 전문가
  {
    id: 5,
    name: '거래량 전문가',
    strategy: '거래량 분석 중심',
    emoji: '📊',
    weights: {
      '5m': {
        rsi: 0.40, macd: 0.70, bollinger: 0.45,
        funding: 0.55, volume: 0.90, trend: 0.30, fearGreed: 0.10
      },
      '10m': {
        rsi: 0.50, macd: 0.65, bollinger: 0.50,
        funding: 0.45, volume: 0.85, trend: 0.45, fearGreed: 0.15
      },
      '30m': {
        rsi: 0.55, macd: 0.60, bollinger: 0.55,
        funding: 0.35, volume: 0.80, trend: 0.60, fearGreed: 0.20
      },
      '1h': {
        rsi: 0.55, macd: 0.55, bollinger: 0.50,
        funding: 0.25, volume: 0.75, trend: 0.70, fearGreed: 0.25
      }
    },
    confidenceThreshold: {
      '5m': 0.55, '10m': 0.50, '30m': 0.45, '1h': 0.40
    },
    recentPerformance: {
      '5m': [], '10m': [], '30m': [], '1h': []
    }
  },

  // Expert #6: 균형형 전문가
  {
    id: 6,
    name: '균형형 전문가',
    strategy: '모든 지표 균등 분석',
    emoji: '⚖️',
    weights: {
      '5m': {
        rsi: 0.60, macd: 0.65, bollinger: 0.60,
        funding: 0.60, volume: 0.70, trend: 0.55, fearGreed: 0.15
      },
      '10m': {
        rsi: 0.65, macd: 0.65, bollinger: 0.65,
        funding: 0.55, volume: 0.65, trend: 0.60, fearGreed: 0.20
      },
      '30m': {
        rsi: 0.70, macd: 0.65, bollinger: 0.70,
        funding: 0.50, volume: 0.60, trend: 0.70, fearGreed: 0.25
      },
      '1h': {
        rsi: 0.70, macd: 0.65, bollinger: 0.65,
        funding: 0.45, volume: 0.55, trend: 0.75, fearGreed: 0.30
      }
    },
    confidenceThreshold: {
      '5m': 0.55, '10m': 0.50, '30m': 0.45, '1h': 0.40
    },
    recentPerformance: {
      '5m': [], '10m': [], '30m': [], '1h': []
    }
  },

  // Expert #7: 단기 스캘퍼
  {
    id: 7,
    name: '단기 스캘퍼',
    strategy: 'MACD + 볼린저 단기',
    emoji: '⚡',
    weights: {
      '5m': {
        rsi: 0.45, macd: 0.85, bollinger: 0.80,
        funding: 0.50, volume: 0.75, trend: 0.25, fearGreed: 0.10
      },
      '10m': {
        rsi: 0.50, macd: 0.80, bollinger: 0.75,
        funding: 0.45, volume: 0.65, trend: 0.35, fearGreed: 0.15
      },
      '30m': {
        rsi: 0.55, macd: 0.70, bollinger: 0.70,
        funding: 0.40, volume: 0.55, trend: 0.50, fearGreed: 0.20
      },
      '1h': {
        rsi: 0.55, macd: 0.65, bollinger: 0.65,
        funding: 0.35, volume: 0.45, trend: 0.65, fearGreed: 0.25
      }
    },
    confidenceThreshold: {
      '5m': 0.60, '10m': 0.55, '30m': 0.50, '1h': 0.45
    },
    recentPerformance: {
      '5m': [], '10m': [], '30m': [], '1h': []
    }
  },

  // Expert #8: 추세 추종가
  {
    id: 8,
    name: '추세 추종가',
    strategy: '추세 + 거래량 중심',
    emoji: '🚀',
    weights: {
      '5m': {
        rsi: 0.35, macd: 0.60, bollinger: 0.45,
        funding: 0.45, volume: 0.80, trend: 0.75, fearGreed: 0.15
      },
      '10m': {
        rsi: 0.40, macd: 0.60, bollinger: 0.50,
        funding: 0.40, volume: 0.75, trend: 0.80, fearGreed: 0.20
      },
      '30m': {
        rsi: 0.45, macd: 0.55, bollinger: 0.55,
        funding: 0.35, volume: 0.70, trend: 0.85, fearGreed: 0.25
      },
      '1h': {
        rsi: 0.45, macd: 0.50, bollinger: 0.50,
        funding: 0.30, volume: 0.65, trend: 0.90, fearGreed: 0.30
      }
    },
    confidenceThreshold: {
      '5m': 0.50, '10m': 0.45, '30m': 0.40, '1h': 0.35
    },
    recentPerformance: {
      '5m': [], '10m': [], '30m': [], '1h': []
    }
  },

  // Expert #9: 역추세 사냥꾼
  {
    id: 9,
    name: '역추세 사냥꾼',
    strategy: '볼린저 + RSI 역추세',
    emoji: '🎣',
    weights: {
      '5m': {
        rsi: 0.80, macd: 0.50, bollinger: 0.85,
        funding: 0.45, volume: 0.60, trend: 0.20, fearGreed: 0.15
      },
      '10m': {
        rsi: 0.85, macd: 0.50, bollinger: 0.80,
        funding: 0.40, volume: 0.55, trend: 0.25, fearGreed: 0.20
      },
      '30m': {
        rsi: 0.85, macd: 0.45, bollinger: 0.75,
        funding: 0.35, volume: 0.50, trend: 0.35, fearGreed: 0.25
      },
      '1h': {
        rsi: 0.80, macd: 0.40, bollinger: 0.70,
        funding: 0.30, volume: 0.45, trend: 0.45, fearGreed: 0.30
      }
    },
    confidenceThreshold: {
      '5m': 0.60, '10m': 0.55, '30m': 0.50, '1h': 0.45
    },
    recentPerformance: {
      '5m': [], '10m': [], '30m': [], '1h': []
    }
  },

  // Expert #10: 펀딩+고래 추적가
  {
    id: 10,
    name: '펀딩+고래 추적가',
    strategy: '펀딩비율 + 고래움직임',
    emoji: '🐋',
    weights: {
      '5m': {
        rsi: 0.40, macd: 0.60, bollinger: 0.45,
        funding: 0.85, volume: 0.85, trend: 0.35, fearGreed: 0.20
      },
      '10m': {
        rsi: 0.45, macd: 0.55, bollinger: 0.50,
        funding: 0.80, volume: 0.80, trend: 0.45, fearGreed: 0.25
      },
      '30m': {
        rsi: 0.50, macd: 0.50, bollinger: 0.55,
        funding: 0.75, volume: 0.75, trend: 0.60, fearGreed: 0.30
      },
      '1h': {
        rsi: 0.50, macd: 0.45, bollinger: 0.50,
        funding: 0.70, volume: 0.70, trend: 0.70, fearGreed: 0.35
      }
    },
    confidenceThreshold: {
      '5m': 0.55, '10m': 0.50, '30m': 0.45, '1h': 0.40
    },
    recentPerformance: {
      '5m': [], '10m': [], '30m': [], '1h': []
    }
  }
];

// 전문가 ID로 프로필 찾기
export function getExpertProfile(expertId: number): ExpertProfile | undefined {
  return expertProfiles.find(e => e.id === expertId);
}

// 모든 전문가 ID 목록
export const EXPERT_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 지원하는 타임프레임 목록
export const TIMEFRAMES = ['5m', '10m', '30m', '1h'] as const;

// 지원하는 코인 목록
export const COINS = ['btc', 'eth'] as const;
