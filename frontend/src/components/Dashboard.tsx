import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pricesApi, predictionsApi } from '../services/api';
import PriceCard from './PriceCard';
import ConsensusView from './ConsensusView';
import PredictionsList from './PredictionsList';

const TRACKED_COINS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'XRP', name: 'Ripple' },
];

export default function Dashboard() {
  const [selectedCoin, setSelectedCoin] = useState('BTC');

  const { data: latestPrice } = useQuery({
    queryKey: ['price', selectedCoin],
    queryFn: () => pricesApi.getLatest(selectedCoin),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: priceHistory } = useQuery({
    queryKey: ['priceHistory', selectedCoin],
    queryFn: () => pricesApi.getHistory(selectedCoin, 'upbit', 24),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: consensus } = useQuery({
    queryKey: ['consensus', selectedCoin],
    queryFn: () => predictionsApi.getConsensus(selectedCoin, '24h'),
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const { data: predictions } = useQuery({
    queryKey: ['predictions', selectedCoin],
    queryFn: () => predictionsApi.getAll(selectedCoin),
    refetchInterval: 300000,
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-blue-400">
            🚀 암호화폐 분석 플랫폼
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            AI 기반 다중 전문가 분석
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {/* Coin Selector */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {TRACKED_COINS.map((coin) => (
              <button
                key={coin.symbol}
                onClick={() => setSelectedCoin(coin.symbol)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  selectedCoin === coin.symbol
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {coin.name} ({coin.symbol})
              </button>
            ))}
          </div>
        </div>

        {/* Price Card */}
        {latestPrice && (
          <div className="mb-6">
            <PriceCard price={latestPrice} history={priceHistory || []} />
          </div>
        )}

        {/* Consensus View */}
        {consensus && (
          <div className="mb-6">
            <ConsensusView consensus={consensus} />
          </div>
        )}

        {/* Predictions List */}
        {predictions && predictions.length > 0 && (
          <div>
            <PredictionsList predictions={predictions} />
          </div>
        )}

        {/* Empty State */}
        {(!predictions || predictions.length === 0) && (
          <div className="bg-slate-800 rounded-lg p-8 text-center">
            <p className="text-slate-400">
              ⏳ AI 예측 분석 중...
            </p>
            <p className="text-sm text-slate-500 mt-2">
              분석은 4시간마다 실행됩니다. 잠시 후 확인해주세요!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
