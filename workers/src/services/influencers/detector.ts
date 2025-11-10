/**
 * Influencer Mention Detector
 * RSS 뉴스에서 유명인 발언 감지
 */

import { findInfluencer, detectTriggerSentiment } from './keywords';
import type { NewsArticle } from '../../types';

export interface InfluencerMention {
  influencer_name: string;
  platform: string;
  content: string;
  content_ko?: string; // Korean translation
  url: string;
  symbols: string;
  sentiment_score: number;
  impact_level: 'high' | 'medium' | 'low';
  published_at: number;
}

/**
 * Analyze news article for influencer mentions
 * 뉴스 기사에서 유명인 언급 분석
 */
export function detectInfluencerMention(
  article: NewsArticle
): InfluencerMention | null {
  const fullText = `${article.title} ${article.description || ''}`;

  // Find influencer
  const influencer = findInfluencer(fullText);
  if (!influencer) {
    return null;
  }

  // Calculate sentiment using trigger keywords
  const sentimentScore = detectTriggerSentiment(fullText);

  // Extract mentioned symbols (BTC, ETH)
  const symbols = extractSymbols(fullText, influencer.primarySymbols);

  return {
    influencer_name: influencer.name,
    platform: 'news',
    content: article.title,
    url: article.url,
    symbols: symbols.join(','),
    sentiment_score: sentimentScore,
    impact_level: influencer.impact,
    published_at: article.published_at,
  };
}

/**
 * Extract crypto symbols from text
 * 텍스트에서 암호화폐 심볼 추출
 */
function extractSymbols(text: string, primarySymbols: string[]): string[] {
  const lowerText = text.toLowerCase();
  const found: string[] = [];

  // Check for BTC
  if (
    lowerText.includes('bitcoin') ||
    lowerText.includes('btc') ||
    lowerText.includes('비트코인')
  ) {
    found.push('BTC');
  }

  // Check for ETH
  if (
    lowerText.includes('ethereum') ||
    lowerText.includes('eth') ||
    lowerText.includes('이더리움')
  ) {
    found.push('ETH');
  }

  // If no symbols found, use influencer's primary symbols
  if (found.length === 0) {
    return primarySymbols;
  }

  return found;
}

/**
 * Filter high-impact mentions
 * 높은 영향력 발언만 필터링
 */
export function filterHighImpact(
  mentions: InfluencerMention[]
): InfluencerMention[] {
  return mentions.filter((mention) => mention.impact_level === 'high');
}

/**
 * Group mentions by influencer
 * 유명인별로 발언 그룹화
 */
export function groupByInfluencer(
  mentions: InfluencerMention[]
): Map<string, InfluencerMention[]> {
  const groups = new Map<string, InfluencerMention[]>();

  for (const mention of mentions) {
    const existing = groups.get(mention.influencer_name) || [];
    existing.push(mention);
    groups.set(mention.influencer_name, existing);
  }

  return groups;
}
