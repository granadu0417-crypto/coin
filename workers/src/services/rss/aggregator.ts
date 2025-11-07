import type { RSSFeedItem, NewsArticle } from '../../types';
import { sentimentAnalyzer } from '../analysis/sentiment';

/**
 * RSS Feed sources for crypto news
 */
const RSS_FEEDS = [
  {
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
  },
  {
    name: 'CoinTelegraph',
    url: 'https://cointelegraph.com/rss',
  },
  {
    name: 'Bitcoin Magazine',
    url: 'https://bitcoinmagazine.com/.rss/full/',
  },
  {
    name: 'Decrypt',
    url: 'https://decrypt.co/feed',
  },
];

export class RSSAggregator {
  /**
   * Parse RSS XML to extract feed items
   */
  private parseRSS(xml: string): RSSFeedItem[] {
    const items: RSSFeedItem[] = [];

    // Simple regex-based XML parsing (works for standard RSS)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const matches = xml.matchAll(itemRegex);

    for (const match of matches) {
      const itemXML = match[1];

      // Extract fields
      const title = this.extractTag(itemXML, 'title');
      const link = this.extractTag(itemXML, 'link');
      const pubDate = this.extractTag(itemXML, 'pubDate');
      const description = this.extractTag(itemXML, 'description');

      if (title && link && pubDate) {
        items.push({
          title,
          link,
          pubDate,
          description,
        });
      }
    }

    return items;
  }

  /**
   * Extract content from XML tag
   */
  private extractTag(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\/${tagName}>`, 's');
    const match = xml.match(regex);
    if (match && match[1]) {
      // Decode HTML entities and remove CDATA
      let content = match[1]
        .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .trim();
      return content;
    }
    return '';
  }

  /**
   * Fetch and parse a single RSS feed
   */
  async fetchFeed(feedUrl: string): Promise<RSSFeedItem[]> {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Crypto-Analysis-Platform/1.0',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch ${feedUrl}: ${response.statusText}`);
        return [];
      }

      const xml = await response.text();
      return this.parseRSS(xml);
    } catch (error) {
      console.error(`Error fetching feed ${feedUrl}:`, error);
      return [];
    }
  }

  /**
   * Fetch all RSS feeds
   */
  async fetchAllFeeds(): Promise<NewsArticle[]> {
    const allItems: NewsArticle[] = [];

    for (const feed of RSS_FEEDS) {
      const items = await this.fetchFeed(feed.url);

      for (const item of items) {
        // Parse date
        const publishedAt = new Date(item.pubDate).getTime() / 1000;

        // Analyze sentiment
        const text = `${item.title} ${item.description || ''}`;
        const sentimentScore = sentimentAnalyzer.analyzeSentiment(text);

        allItems.push({
          title: item.title,
          url: item.link,
          source: feed.name,
          published_at: publishedAt,
          content: item.description,
          sentiment_score: sentimentScore,
        });
      }
    }

    // Sort by published date (newest first)
    allItems.sort((a, b) => b.published_at - a.published_at);

    return allItems;
  }

  /**
   * Get recent news (last N hours)
   */
  async getRecentNews(hours: number = 24): Promise<NewsArticle[]> {
    const allNews = await this.fetchAllFeeds();
    const cutoffTime = Date.now() / 1000 - hours * 3600;

    return allNews.filter((news) => news.published_at >= cutoffTime);
  }
}

export const rssAggregator = new RSSAggregator();
