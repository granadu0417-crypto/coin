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
    symbol: string,
    exchange: string = 'binance'
  ): Promise<Price> => {
    const response = await api.get(`/api/prices/${symbol}`, {
      params: { exchange },
    });
    return response.data.exchanges?.[exchange] || response.data;
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

export default api;
