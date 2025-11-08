/**
 * Influencer Keywords and Impact Levels
 * 유명인 키워드 및 영향력 레벨 정의
 */

export interface Influencer {
  name: string;
  keywords: string[];
  impact: 'high' | 'medium' | 'low';
  primarySymbols: string[]; // BTC, ETH, etc.
}

// 비트코인 영향력 있는 인물들
export const BITCOIN_INFLUENCERS: Influencer[] = [
  {
    name: 'Elon Musk',
    keywords: ['elon musk', 'tesla', '@elonmusk', 'elon'],
    impact: 'high',
    primarySymbols: ['BTC', 'DOGE'],
  },
  {
    name: 'Michael Saylor',
    keywords: ['michael saylor', 'microstrategy', 'saylor', '@saylor'],
    impact: 'high',
    primarySymbols: ['BTC'],
  },
  {
    name: 'Jerome Powell',
    keywords: ['jerome powell', 'fed chairman', 'federal reserve', 'powell', 'fomc'],
    impact: 'high',
    primarySymbols: ['BTC', 'ETH'],
  },
  {
    name: 'CZ (Changpeng Zhao)',
    keywords: ['cz', 'changpeng zhao', 'binance ceo', '@cz_binance'],
    impact: 'high',
    primarySymbols: ['BTC', 'ETH', 'BNB'],
  },
  {
    name: 'Cathie Wood',
    keywords: ['cathie wood', 'ark invest', 'cathie', '@cathiedwood'],
    impact: 'medium',
    primarySymbols: ['BTC'],
  },
  {
    name: 'Gary Gensler',
    keywords: ['gary gensler', 'sec chairman', 'sec', 'gensler'],
    impact: 'high',
    primarySymbols: ['BTC', 'ETH'],
  },
];

// 이더리움 영향력 있는 인물들
export const ETHEREUM_INFLUENCERS: Influencer[] = [
  {
    name: 'Vitalik Buterin',
    keywords: ['vitalik buterin', 'vitalik', '@vitalikbuterin', 'buterin'],
    impact: 'high',
    primarySymbols: ['ETH'],
  },
  {
    name: 'Ethereum Foundation',
    keywords: ['ethereum foundation', 'eth foundation', 'ethereum.org'],
    impact: 'high',
    primarySymbols: ['ETH'],
  },
  {
    name: 'Gary Gensler',
    keywords: ['gary gensler', 'sec chairman', 'sec', 'gensler', 'etf'],
    impact: 'high',
    primarySymbols: ['BTC', 'ETH'],
  },
  {
    name: 'Jerome Powell',
    keywords: ['jerome powell', 'fed chairman', 'federal reserve', 'powell', 'fomc'],
    impact: 'high',
    primarySymbols: ['BTC', 'ETH'],
  },
];

// 모든 영향력 있는 인물들 (중복 제거)
export const ALL_INFLUENCERS: Influencer[] = [
  ...BITCOIN_INFLUENCERS,
  ...ETHEREUM_INFLUENCERS.filter(
    (ethInf) =>
      !BITCOIN_INFLUENCERS.some((btcInf) => btcInf.name === ethInf.name)
  ),
];

// 가격 변동 트리거 키워드
export const PRICE_TRIGGER_KEYWORDS = {
  positive: [
    'buy', 'buying', 'bullish', 'invest', 'investing', 'adopt', 'adoption',
    'partnership', 'integration', 'upgrade', 'moon', 'rally', 'surge',
    'breakthrough', 'approval', 'etf approved', '구매', '매수', '투자',
  ],
  negative: [
    'sell', 'selling', 'bearish', 'dump', 'crash', 'ban', 'regulate',
    'regulation', 'lawsuit', 'scam', 'hack', 'exploit', 'concern',
    'warning', 'rejected', '판매', '매도', '규제', '금지',
  ],
};

// 한국 유명 암호화폐 인플루언서 (선택적)
export const KOREAN_INFLUENCERS: Influencer[] = [
  {
    name: 'Upbit',
    keywords: ['업비트', 'upbit', '상장', '상폐'],
    impact: 'medium',
    primarySymbols: ['BTC', 'ETH'],
  },
  {
    name: 'Bithumb',
    keywords: ['빗썸', 'bithumb', '상장', '상폐'],
    impact: 'medium',
    primarySymbols: ['BTC', 'ETH'],
  },
];

/**
 * Find influencer by text content
 * 텍스트에서 유명인 찾기
 */
export function findInfluencer(text: string): Influencer | null {
  const lowerText = text.toLowerCase();

  for (const influencer of ALL_INFLUENCERS) {
    for (const keyword of influencer.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return influencer;
      }
    }
  }

  // 한국 인플루언서도 체크
  for (const influencer of KOREAN_INFLUENCERS) {
    for (const keyword of influencer.keywords) {
      if (text.includes(keyword) || lowerText.includes(keyword.toLowerCase())) {
        return influencer;
      }
    }
  }

  return null;
}

/**
 * Detect sentiment from trigger keywords
 * 트리거 키워드로부터 감성 감지
 */
export function detectTriggerSentiment(text: string): number {
  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  for (const keyword of PRICE_TRIGGER_KEYWORDS.positive) {
    if (lowerText.includes(keyword.toLowerCase())) {
      positiveCount++;
    }
  }

  for (const keyword of PRICE_TRIGGER_KEYWORDS.negative) {
    if (lowerText.includes(keyword.toLowerCase())) {
      negativeCount++;
    }
  }

  if (positiveCount === 0 && negativeCount === 0) {
    return 0; // Neutral
  }

  // Calculate weighted sentiment (-1 to 1)
  const total = positiveCount + negativeCount;
  return (positiveCount - negativeCount) / total;
}
