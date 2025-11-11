import { useQuery } from '@tanstack/react-query';
import { tradingApi } from '../services/api';
import type { Signal } from '../types';

interface Props {
  coin: 'btc' | 'eth';
}

export default function TradingAssistant({ coin }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tradingRecommendation', coin],
    queryFn: () => tradingApi.getRecommendation(coin),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 shadow-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="h-24 bg-slate-700 rounded"></div>
          <div className="h-12 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data || !data.hasData) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 shadow-xl">
        <div className="text-center">
          <p className="text-slate-400 text-lg">
            ⏳ AI 예측 분석 중...
          </p>
          <p className="text-sm text-slate-500 mt-2">
            {data?.error || '잠시 후 다시 시도해주세요'}
          </p>
        </div>
      </div>
    );
  }

  const { recommendation, signalStrength, consensus, stats, predictions } = data;

  const getSignalIcon = (signal: Signal) => {
    if (signal === 'long') return '📈';
    if (signal === 'short') return '📉';
    return '➖';
  };

  const getSignalColor = (signal: Signal) => {
    if (signal === 'long') return 'text-green-400';
    if (signal === 'short') return 'text-red-400';
    return 'text-slate-400';
  };

  const getFreshnessText = (minutes: number) => {
    if (minutes < 2) return { text: 'Fresh', color: 'text-green-400', icon: '🟢' };
    if (minutes < 5) return { text: 'Good', color: 'text-blue-400', icon: '🔵' };
    if (minutes < 10) return { text: 'Old', color: 'text-yellow-400', icon: '🟡' };
    return { text: 'Stale', color: 'text-red-400', icon: '🔴' };
  };

  const freshness = getFreshnessText(stats.signalAgeMinutes);

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          🤖 스마트 트레이딩 어시스턴트
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className={freshness.color}>{freshness.icon} {freshness.text}</span>
          <span className="text-slate-500">
            {Math.floor(stats.signalAgeMinutes)}분 전
          </span>
        </div>
      </div>

      {/* Main Recommendation Card */}
      <div className={`rounded-xl p-6 mb-6 border-2 ${recommendation.color}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{recommendation.emoji}</span>
            <div>
              <h3 className="text-2xl font-bold text-white">
                {recommendation.actionKr}
              </h3>
              <p className="text-sm text-slate-300 mt-1">
                {recommendation.description}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400 mb-1">신호 강도</div>
            <div className="text-4xl font-bold text-white">
              {signalStrength}
            </div>
            <div className="text-xs text-slate-400">/ 100</div>
          </div>
        </div>

        {/* Consensus */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700">
          <span className="text-lg">{getSignalIcon(consensus.signal)}</span>
          <span className={`text-lg font-bold ${getSignalColor(consensus.signal)}`}>
            {consensus.signal.toUpperCase()}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-white font-semibold">
            일치도: {consensus.confidence.toFixed(1)}%
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300 text-sm">
            {stats.totalPredictions}명의 전문가 의견
          </span>
        </div>
      </div>

      {/* Top 3 Models */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          🏆 상위 3개 모델 (최근 성과 기준)
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {stats.top3Models.map((model, index) => (
            <div
              key={model.expertId}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{model.expertEmoji}</span>
                <span className="text-xs text-slate-400">#{index + 1}</span>
              </div>
              <div className="text-sm font-semibold text-white mb-1">
                {model.expertName}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${getSignalColor(model.signal)}`}>
                  {getSignalIcon(model.signal)} {model.signal.toUpperCase()}
                </span>
                <span className="text-sm text-green-400 font-semibold">
                  {model.winRate.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Expert Predictions */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          📊 전체 전문가 의견
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {predictions.map((pred) => (
            <div
              key={pred.expertId}
              className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">{pred.expertEmoji}</span>
                <span className="text-xs text-slate-500">#{pred.expertId}</span>
              </div>
              <div className="text-xs text-slate-400 mb-1 truncate">
                {pred.expertName}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${getSignalColor(pred.signal)}`}>
                  {getSignalIcon(pred.signal)}
                </span>
                <span className="text-xs text-slate-400">
                  {pred.confidence.toFixed(0)}%
                </span>
              </div>
              <div className="text-xs text-green-400 mt-1">
                승률: {pred.winRate.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="mt-6 pt-6 border-t border-slate-700 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-sm text-slate-400 mb-1">최근 1시간 승률</div>
          <div className="text-xl font-bold text-white">
            {stats.recentSuccessRate.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-sm text-slate-400 mb-1">신호 생성 시간</div>
          <div className="text-xl font-bold text-white">
            {Math.floor(stats.signalAgeMinutes)}분 전
          </div>
        </div>
        <div>
          <div className="text-sm text-slate-400 mb-1">타임프레임</div>
          <div className="text-xl font-bold text-white">
            {data.timeframe}
          </div>
        </div>
      </div>
    </div>
  );
}
