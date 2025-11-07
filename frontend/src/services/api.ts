import axios from 'axios';
import type { Price, Prediction, Consensus, HealthStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const healthApi = {
  check: async (): Promise<HealthStatus> => {
    const response = await api.get('/api/v1/health');
    return response.data;
  },
};

export const pricesApi = {
  getHistory: async (
    symbol: string,
    exchange: string = 'binance',
    hours: number = 24
  ): Promise<Price[]> => {
    const response = await api.get(`/api/v1/prices/${symbol}`, {
      params: { exchange, hours },
    });
    return response.data;
  },

  getLatest: async (
    symbol: string,
    exchange: string = 'binance'
  ): Promise<Price> => {
    const response = await api.get(`/api/v1/prices/${symbol}/latest`, {
      params: { exchange },
    });
    return response.data;
  },
};

export const predictionsApi = {
  getAll: async (
    symbol: string,
    persona?: string,
    timeframe?: string
  ): Promise<Prediction[]> => {
    const response = await api.get(`/api/v1/predictions/${symbol}`, {
      params: { persona, timeframe, active_only: true },
    });
    return response.data;
  },

  getConsensus: async (
    symbol: string,
    timeframe: string = '24h'
  ): Promise<Consensus> => {
    const response = await api.get(`/api/v1/predictions/${symbol}/consensus`, {
      params: { timeframe },
    });
    return response.data;
  },
};

export default api;
