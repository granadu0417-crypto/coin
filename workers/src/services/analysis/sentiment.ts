/**
 * Keyword-based sentiment analysis for crypto news
 * No external API required - completely free
 */

const POSITIVE_KEYWORDS = [
  // Price action
  'surge', 'rally', 'soar', 'pump', 'moon', 'breakthrough', 'break out', 'all-time high', 'ath',
  'gain', 'rise', 'climb', 'jump', 'spike', 'boost', 'increase',

  // Sentiment
  'bullish', 'optimistic', 'positive', 'strong', 'confident', 'exciting',

  // Adoption & Development
  'adoption', 'partnership', 'collaboration', 'integration', 'launch', 'release',
  'upgrade', 'improvement', 'innovation', 'development', 'progress',

  // Investment
  'invest', 'buy', 'accumulate', 'institutional', 'whale', 'demand',

  // Success
  'success', 'win', 'victory', 'achieve', 'milestone', 'record', 'growth'
];

const NEGATIVE_KEYWORDS = [
  // Price action
  'crash', 'dump', 'plunge', 'collapse', 'drop', 'fall', 'decline', 'sink',
  'tank', 'slump', 'dip', 'correction', 'selloff', 'sell-off',

  // Sentiment
  'bearish', 'pessimistic', 'negative', 'weak', 'fear', 'panic', 'fud',

  // Problems
  'hack', 'scam', 'fraud', 'ponzi', 'rug pull', 'exploit', 'vulnerability',
  'bug', 'issue', 'problem', 'concern', 'risk', 'danger',

  // Regulation
  'ban', 'regulation', 'crackdown', 'restriction', 'lawsuit', 'sec',

  // Failure
  'fail', 'failure', 'loss', 'lose', 'bankrupt', 'shutdown'
];

const CRYPTO_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
  'blockchain', 'defi', 'nft', 'altcoin', 'coin', 'token'
];

export class SentimentAnalyzer {
  /**
   * Analyze text sentiment using keyword matching
   * Returns score from -1 (very negative) to 1 (very positive)
   */
  analyzeSentiment(text: string): number {
    const lowerText = text.toLowerCase();

    // Check if text is crypto-related
    const isCryptoRelated = CRYPTO_KEYWORDS.some(keyword =>
      lowerText.includes(keyword)
    );

    if (!isCryptoRelated) {
      return 0; // Neutral for non-crypto content
    }

    let positiveScore = 0;
    let negativeScore = 0;

    // Count positive keywords
    for (const keyword of POSITIVE_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        positiveScore += matches.length;
      }
    }

    // Count negative keywords
    for (const keyword of NEGATIVE_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        negativeScore += matches.length;
      }
    }

    // Calculate net score
    const netScore = positiveScore - negativeScore;

    // Normalize to -1 to 1 range
    // Using sigmoid-like function for smooth scaling
    const normalized = netScore / (Math.abs(netScore) + 5);

    return Math.max(-1, Math.min(1, normalized));
  }

  /**
   * Classify sentiment as positive, negative, or neutral
   */
  classifySentiment(score: number): 'positive' | 'negative' | 'neutral' {
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  }

  /**
   * Analyze multiple texts and return aggregate sentiment
   */
  analyzeMultiple(texts: string[]): {
    averageScore: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    distribution: {
      positive: number;
      negative: number;
      neutral: number;
    };
  } {
    if (texts.length === 0) {
      return {
        averageScore: 0,
        sentiment: 'neutral',
        distribution: { positive: 0, negative: 0, neutral: 0 }
      };
    }

    const scores = texts.map(text => this.analyzeSentiment(text));
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const distribution = {
      positive: scores.filter(s => s > 0.2).length,
      negative: scores.filter(s => s < -0.2).length,
      neutral: scores.filter(s => s >= -0.2 && s <= 0.2).length
    };

    return {
      averageScore,
      sentiment: this.classifySentiment(averageScore),
      distribution
    };
  }

  /**
   * Extract crypto symbols mentioned in text
   */
  extractSymbols(text: string): string[] {
    const symbols: string[] = [];
    const lowerText = text.toLowerCase();

    const symbolPatterns = [
      { pattern: /\$btc\b/gi, symbol: 'BTC' },
      { pattern: /\bbitcoin\b/gi, symbol: 'BTC' },
      { pattern: /\$eth\b/gi, symbol: 'ETH' },
      { pattern: /\bethereum\b/gi, symbol: 'ETH' },
      { pattern: /\$bnb\b/gi, symbol: 'BNB' },
      { pattern: /\$sol\b/gi, symbol: 'SOL' },
      { pattern: /\bsolana\b/gi, symbol: 'SOL' },
      { pattern: /\$xrp\b/gi, symbol: 'XRP' },
      { pattern: /\bripple\b/gi, symbol: 'XRP' },
      { pattern: /\$ada\b/gi, symbol: 'ADA' },
      { pattern: /\bcardano\b/gi, symbol: 'ADA' },
    ];

    for (const { pattern, symbol } of symbolPatterns) {
      if (pattern.test(lowerText)) {
        if (!symbols.includes(symbol)) {
          symbols.push(symbol);
        }
      }
    }

    return symbols;
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer();
