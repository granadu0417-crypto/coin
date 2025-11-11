import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { pricesApi } from '../services/api';

interface ExpertPrediction {
  id: number;
  expertId: number;
  expertName: string;
  expertEmoji: string;
  expertStrategy: string;
  signal: 'long' | 'short' | 'neutral';
  confidence: number;
  entryPrice: number;
  createdAt: string;
}

interface TimeframeConsensus {
  signal: 'long' | 'short' | 'neutral';
  confidence: number;
  longCount: number;
  shortCount: number;
  neutralCount: number;
  totalExperts: number;
}

interface TimeframeData {
  consensus: TimeframeConsensus;
  predictions: ExpertPrediction[];
}

interface LivePredictionsData {
  coin: string;
  timeframes: Record<string, TimeframeData>;
  timestamp: number;
}

interface LivePredictionsProps {
  coin: 'btc' | 'eth';
}

const TIMEFRAMES = ['5m', '10m', '30m', '1h', '6h', '12h', '24h'];

const TIMEFRAME_LABELS: Record<string, string> = {
  '5m': '5분',
  '10m': '10분',
  '30m': '30분',
  '1h': '1시간',
  '6h': '6시간',
  '12h': '12시간',
  '24h': '24시간',
};

export default function LivePredictions({ coin }: LivePredictionsProps) {
  const [activeTimeframe, setActiveTimeframe] = useState('1h');
  const [data, setData] = useState<LivePredictionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 현재 가격 가져오기 (5초마다 갱신)
  const { data: currentPrice } = useQuery({
    queryKey: ['price', coin.toUpperCase()],
    queryFn: () => pricesApi.getLatest(coin.toUpperCase()),
    refetchInterval: 5000,
  });

  const fetchPredictions = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ai/predictions/live?coin=${coin}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }

      const result = await response.json();
      setData(result);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
    const interval = setInterval(fetchPredictions, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [coin]);

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'long':
        return <TrendingUp className="w-5 h-5" />;
      case 'short':
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <Minus className="w-5 h-5" />;
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'long':
        return 'text-green-400 bg-green-500/20 border-green-500';
      case 'short':
        return 'text-red-400 bg-red-500/20 border-red-500';
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500';
    }
  };

  const getSignalText = (signal: string) => {
    switch (signal) {
      case 'long':
        return '롱';
      case 'short':
        return '숏';
      default:
        return '중립';
    }
  };

  // 가격 변동률 계산 (실제 가격 기준)
  const calculatePriceChange = (entryPrice: number, currentPriceValue: number) => {
    return ((currentPriceValue - entryPrice) / entryPrice) * 100;
  };

  // 레버리지 수익률 계산 (20배)
  const calculateLeverageProfit = (priceChange: number) => {
    return priceChange * 20;
  };

  // 신호 신선도 판단
  const getSignalFreshness = (createdAt: string): { label: string; color: string; minutesAgo: number } => {
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const minutesAgo = Math.floor((now - created) / 1000 / 60);

    if (minutesAgo < 5) {
      return { label: 'Fresh', color: 'text-green-400 bg-green-500/20 border-green-500/50', minutesAgo };
    } else if (minutesAgo < 15) {
      return { label: 'Good', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50', minutesAgo };
    } else if (minutesAgo < 30) {
      return { label: 'Old', color: 'text-orange-400 bg-orange-500/20 border-orange-500/50', minutesAgo };
    } else {
      return { label: 'Stale', color: 'text-red-400 bg-red-500/20 border-red-500/50', minutesAgo };
    }
  };

  // 진입 가능 여부 판단
  const canEnter = (signal: string, priceChange: number): {
    canEnter: boolean;
    reason: string;
    color: string;
  } => {
    const leverageProfit = calculateLeverageProfit(priceChange);

    if (signal === 'long') {
      // 롱: 가격이 이미 5% 이상 올랐으면 늦음
      if (leverageProfit >= 5) {
        return {
          canEnter: false,
          reason: '이미 목표 달성',
          color: 'text-red-400 bg-red-500/10'
        };
      } else if (leverageProfit > 0) {
        return {
          canEnter: true,
          reason: '진행 중',
          color: 'text-yellow-400 bg-yellow-500/10'
        };
      } else {
        return {
          canEnter: true,
          reason: '진입 가능',
          color: 'text-green-400 bg-green-500/10'
        };
      }
    } else if (signal === 'short') {
      // 숏: 가격이 이미 5% 이상 떨어졌으면 늦음
      if (leverageProfit <= -5) {
        return {
          canEnter: false,
          reason: '이미 목표 달성',
          color: 'text-red-400 bg-red-500/10'
        };
      } else if (leverageProfit < 0) {
        return {
          canEnter: true,
          reason: '진행 중',
          color: 'text-yellow-400 bg-yellow-500/10'
        };
      } else {
        return {
          canEnter: true,
          reason: '진입 가능',
          color: 'text-green-400 bg-green-500/10'
        };
      }
    }

    return {
      canEnter: false,
      reason: '중립',
      color: 'text-slate-400 bg-slate-500/10'
    };
  };

  if (loading && !data) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
          <span className="ml-2 text-slate-400">예측 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 rounded-2xl p-6 border border-red-500/50">
        <p className="text-red-400">⚠️ {error}</p>
      </div>
    );
  }

  if (!data || !data.timeframes) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
        <p className="text-slate-400">예측 데이터가 없습니다.</p>
      </div>
    );
  }

  const currentData = data.timeframes[activeTimeframe];

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          📡 <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            실시간 AI 예측
          </span>
          <span className="ml-2 px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 text-sm font-bold">
            {coin.toUpperCase()}
          </span>
        </h3>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Clock className="w-4 h-4" />
          {lastUpdate && (
            <span>
              {lastUpdate.toLocaleTimeString('ko-KR')} 업데이트
            </span>
          )}
        </div>
      </div>

      {/* Timeframe Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {TIMEFRAMES.map((tf) => {
          const hasData = data.timeframes[tf];
          return (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              disabled={!hasData}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeTimeframe === tf
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : hasData
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              {TIMEFRAME_LABELS[tf]}
              {hasData && (
                <span className="ml-1 text-xs opacity-75">
                  ({data.timeframes[tf].predictions.length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {currentData ? (
        <>
          {/* ========== 1. 컨센서스 (맨 위) ========== */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              🎯 <span>10명 전문가 종합 의견</span>
            </h3>
            <div className={`flex items-center gap-4 p-5 rounded-xl border-2 ${getSignalColor(currentData.consensus.signal)} shadow-lg`}>
              <div className="flex items-center gap-3">
                {getSignalIcon(currentData.consensus.signal)}
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-80">컨센서스</p>
                  <p className="text-3xl font-bold">{getSignalText(currentData.consensus.signal)}</p>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">신뢰도</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-600/50 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        currentData.consensus.signal === 'long'
                          ? 'bg-gradient-to-r from-green-500 to-green-400'
                          : currentData.consensus.signal === 'short'
                          ? 'bg-gradient-to-r from-red-500 to-red-400'
                          : 'bg-gradient-to-r from-slate-400 to-slate-300'
                      }`}
                      style={{ width: `${currentData.consensus.confidence}%` }}
                    />
                  </div>
                  <span className="text-base font-bold min-w-[4rem] text-right">
                    {currentData.consensus.confidence.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-green-400 text-2xl font-bold">{currentData.consensus.longCount}</p>
                  <p className="text-xs text-slate-400">롱</p>
                </div>
                <div>
                  <p className="text-red-400 text-2xl font-bold">{currentData.consensus.shortCount}</p>
                  <p className="text-xs text-slate-400">숏</p>
                </div>
                <div>
                  <p className="text-slate-300 text-2xl font-bold">{currentData.consensus.neutralCount}</p>
                  <p className="text-xs text-slate-400">중립</p>
                </div>
              </div>
            </div>
          </div>

          {/* ========== 2. 10개 모델 개별 예측 ========== */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              📊 <span>10명 전문가 개별 예측</span>
              <span className="text-sm text-slate-400 font-normal">({currentData.predictions.length}명)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {currentData.predictions.map((pred) => {
                const currentPriceValue = currentPrice?.close || pred.entryPrice;
                const priceChange = calculatePriceChange(pred.entryPrice, currentPriceValue);
                const leverageProfit = calculateLeverageProfit(priceChange);
                const freshness = getSignalFreshness(pred.createdAt);
                const entryStatus = canEnter(pred.signal, priceChange);

                return (
                  <div
                    key={pred.id}
                    className={`p-3 rounded-lg border ${getSignalColor(pred.signal)} bg-opacity-50 hover:bg-opacity-70 transition-all`}
                  >
                    {/* Expert Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{pred.expertEmoji}</span>
                        <div>
                          <p className="text-sm font-bold">{pred.expertName}</p>
                          <p className="text-xs text-slate-400">{pred.expertStrategy}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {getSignalIcon(pred.signal)}
                          <span className="font-bold">{getSignalText(pred.signal)}</span>
                        </div>
                        <p className="text-xs text-slate-400">{pred.confidence.toFixed(0)}%</p>
                      </div>
                    </div>

                    {/* Price Comparison */}
                    <div className="space-y-2 mb-2">
                      {/* Entry vs Current Price */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">진입가:</span>
                          <span className="text-white font-semibold">${pred.entryPrice.toFixed(2)}</span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">현재가:</span>
                          <span className="text-white font-semibold">${currentPriceValue.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Price Change & Leverage Profit */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-700/30 rounded px-2 py-1">
                          <p className="text-xs text-slate-400">실제 변동</p>
                          <p className={`text-sm font-bold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
                          </p>
                        </div>
                        <div className="bg-slate-700/30 rounded px-2 py-1">
                          <p className="text-xs text-slate-400">레버리지 20배</p>
                          <p className={`text-sm font-bold ${leverageProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {leverageProfit > 0 ? '+' : ''}{leverageProfit.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {/* Freshness & Entry Status */}
                      <div className="flex items-center justify-between gap-2">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded border text-xs ${freshness.color}`}>
                          <span>{freshness.label}</span>
                          <span className="opacity-75">({freshness.minutesAgo}분 전)</span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded ${entryStatus.color} text-xs font-medium`}>
                          {entryStatus.canEnter ? (
                            <span>✓ {entryStatus.reason}</span>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>{entryStatus.reason}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-700/50">
                      {new Date(pred.createdAt).toLocaleString('ko-KR')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-slate-400">
          <p>{TIMEFRAME_LABELS[activeTimeframe]} 타임프레임에 대한 예측이 없습니다.</p>
        </div>
      )}
    </div>
  );
}
