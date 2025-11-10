import axios from 'axios';
import type { Price, Prediction, Consensus, HealthStatus } from '../types';

// Cloudflare Workers API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const healthApi = {
  check: async (): Promise<HealthStatus> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export const pricesApi = {
  getHistory: async (
    symbol: string,
    exchange: string = 'binance',
    limit: number = 100
  ): Promise<Price[]> => {
    const response = await api.get(`/api/prices/${symbol}/history`, {
      params: { exchange, limit },
    });
    return response.data.prices || [];
  },

  getLatest: async (
    symbol: string
  ): Promise<Price> => {
    const response = await api.get(`/api/prices/${symbol}`);
    // Return upbit data by default, fallback to bithumb if upbit is null
    const exchangeData = response.data.exchanges?.upbit || response.data.exchanges?.bithumb;

    if (!exchangeData) {
      throw new Error('No exchange data available');
    }

    // Convert exchange data format to Price format
    return {
      symbol: exchangeData.symbol,
      exchange: response.data.exchanges?.upbit ? 'upbit' : 'bithumb',
      timestamp: response.data.timestamp,
      open: exchangeData.price, // Use current price as open (we don't have historical open)
      high: exchangeData.high24h,
      low: exchangeData.low24h,
      close: exchangeData.price,
      volume: exchangeData.volume,
    };
  },
};

export const predictionsApi = {
  getAll: async (
    symbol: string,
    analyst?: string,
    timeframe?: string
  ): Promise<Prediction[]> => {
    const response = await api.get(`/api/predictions/${symbol}`, {
      params: { analyst, timeframe },
    });
    return response.data.predictions || [];
  },

  getConsensus: async (
    symbol: string,
    timeframe: string = '24h'
  ): Promise<Consensus> => {
    const response = await api.get(`/api/predictions/${symbol}/consensus`, {
      params: { timeframe },
    });
    return response.data;
  },
};

export interface InfluencerMention {
  influencer_name: string;
  platform: string;
  content: string;
  url: string;
  symbols: string;
  sentiment_score: number;
  impact_level: 'high' | 'medium' | 'low';
  published_at: number;
}

export const influencerApi = {
  getAll: async (hours: number = 24, impactOnly: boolean = false): Promise<InfluencerMention[]> => {
    const response = await api.get('/api/influencer-mentions', {
      params: { hours, impact: impactOnly ? 'high' : undefined },
    });
    return response.data.mentions || [];
  },

  getBySymbol: async (symbol: string, hours: number = 24): Promise<InfluencerMention[]> => {
    const response = await api.get(`/api/influencer-mentions/${symbol}`, {
      params: { hours },
    });
    return response.data.mentions || [];
  },
};

export default api;
