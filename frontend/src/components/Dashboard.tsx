import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pricesApi, predictionsApi, influencerApi } from '../services/api';
import PriceCard from './PriceCard';
import ConsensusView from './ConsensusView';
import PredictionsList from './PredictionsList';
import InfluencerTimeline from './InfluencerTimeline';

const TRACKED_COINS = [
  { symbol: 'BTC', name: 'Bitcoin', emoji: '₿' },
  { symbol: 'ETH', name: 'Ethereum', emoji: 'Ξ' },
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

  const { data: influencerMentions } = useQuery({
    queryKey: ['influencerMentions', selectedCoin],
    queryFn: () => influencerApi.getBySymbol(selectedCoin, 24),
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50 shadow-xl">
        <div className="w-full max-w-[1800px] mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            🚀 암호화폐 분석 플랫폼
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            AI 기반 실시간 시장 분석 · 유명인 발언 추적
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-[1800px] mx-auto px-6 py-4">
        {/* Coin Selector */}
        <div className="mb-6">
          <div className="flex gap-4 justify-center">
            {TRACKED_COINS.map((coin) => (
              <button
                key={coin.symbol}
                onClick={() => setSelectedCoin(coin.symbol)}
                className={`px-6 py-3 rounded-xl font-bold text-base transition-all transform hover:scale-105 shadow-lg ${
                  selectedCoin === coin.symbol
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-blue-500/50'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700'
                }`}
              >
                <span className="text-xl mr-2">{coin.emoji}</span>
                {coin.name}
              </button>
            ))}
          </div>
        </div>

        {/* Balanced Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column: 2/3 width - Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Price Card */}
            {latestPrice && (
              <PriceCard price={latestPrice} history={priceHistory || []} />
            )}

            {/* Consensus View */}
            {consensus && (
              <ConsensusView consensus={consensus} />
            )}

            {/* Predictions List */}
            {predictions && predictions.length > 0 ? (
              <PredictionsList predictions={predictions} />
            ) : (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-center border border-slate-700 shadow-xl h-full flex flex-col items-center justify-center">
                <p className="text-slate-400 text-lg">
                  ⏳ AI 예측 분석 중...
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  분석은 매 30분마다 실행됩니다
                </p>
              </div>
            )}
          </div>

          {/* Right Column: 1/3 width - Influencer Timeline */}
          <div className="lg:col-span-1">
            <div className="sticky top-20">
              <InfluencerTimeline mentions={influencerMentions || []} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 py-4 border-t border-slate-800 text-center text-slate-500 text-xs">
        <p>실시간 데이터 제공: Upbit, Bithumb · AI 분석: 기술적 분석가</p>
        <p className="mt-1">© 2025 암호화폐 분석 플랫폼. 투자 결정은 신중하게.</p>
      </footer>
    </div>
  );
}
