import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Check, X, Filter, ChevronDown } from 'lucide-react';

interface HistoricalPrediction {
  id: number;
  expertId: number;
  expertName: string;
  expertEmoji: string;
  expertStrategy: string;
  timeframe: string;
  signal: 'long' | 'short' | 'neutral';
  confidence: number;
  entryPrice: number;
  exitPrice: number;
  profitPercent: number;
  status: 'success' | 'fail';
  createdAt: string;
  checkedAt: string;
}

interface HistoryStats {
  totalPredictions: number;
  successCount: number;
  failCount: number;
  successRate: number;
  avgProfit: number;
}

interface PredictionHistoryData {
  coin: string;
  timeframe: string;
  expertId: string;
  stats: HistoryStats;
  predictions: HistoricalPrediction[];
  count: number;
}

interface PredictionHistoryProps {
  coin: 'btc' | 'eth';
}

const TIMEFRAMES = ['all', '5m', '10m', '30m', '1h', '6h', '12h', '24h'];
const TIMEFRAME_LABELS: Record<string, string> = {
  all: '전체',
  '5m': '5분',
  '10m': '10분',
  '30m': '30분',
  '1h': '1시간',
  '6h': '6시간',
  '12h': '12시간',
  '24h': '24시간',
};

export default function PredictionHistory({ coin }: PredictionHistoryProps) {
  const [data, setData] = useState<PredictionHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [selectedExpert, setSelectedExpert] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'success' | 'fail'>('all');
  const [limit, setLimit] = useState(50);

  // UI State
  const [showFilters, setShowFilters] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        coin,
        limit: limit.toString(),
      });

      if (selectedTimeframe !== 'all') params.append('timeframe', selectedTimeframe);
      if (selectedExpert !== 'all') params.append('expert', selectedExpert);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/ai/predictions/history?${params}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [coin, selectedTimeframe, selectedExpert, selectedStatus, limit]);

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'long':
        return <TrendingUp className="w-4 h-4" />;
      case 'short':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
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

  if (loading && !data) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
        <p className="text-slate-400">히스토리 로딩 중...</p>
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

  if (!data) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
        <p className="text-slate-400">히스토리 데이터가 없습니다.</p>
      </div>
    );
  }

  const { stats, predictions } = data;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          📊 <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            예측 히스토리
          </span>
          <span className="ml-2 px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-400 text-sm font-bold">
            {coin.toUpperCase()}
          </span>
        </h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-sm"
        >
          <Filter className="w-4 h-4" />
          필터
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">타임프레임</label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200"
              >
                {TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {TIMEFRAME_LABELS[tf]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">상태</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'success' | 'fail')}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200"
              >
                <option value="all">전체</option>
                <option value="success">성공</option>
                <option value="fail">실패</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">표시 개수</label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-200"
              >
                <option value={20}>20개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
                <option value={200}>200개</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedTimeframe('all');
                  setSelectedExpert('all');
                  setSelectedStatus('all');
                  setLimit(50);
                }}
                className="w-full px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm transition-colors"
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
          <p className="text-xs text-slate-400 mb-1">총 예측</p>
          <p className="text-2xl font-bold text-slate-200">{stats.totalPredictions}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-lg p-3 border border-green-500/50">
          <p className="text-xs text-slate-400 mb-1">성공</p>
          <p className="text-2xl font-bold text-green-400">{stats.successCount}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-lg p-3 border border-red-500/50">
          <p className="text-xs text-slate-400 mb-1">실패</p>
          <p className="text-2xl font-bold text-red-400">{stats.failCount}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-lg p-3 border border-blue-500/50">
          <p className="text-xs text-slate-400 mb-1">성공률</p>
          <p className="text-2xl font-bold text-blue-400">{stats.successRate.toFixed(1)}%</p>
        </div>
        <div className={`rounded-lg p-3 border ${
          stats.avgProfit >= 0
            ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/50'
            : 'bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/50'
        }`}>
          <p className="text-xs text-slate-400 mb-1">평균 수익</p>
          <p className={`text-2xl font-bold ${stats.avgProfit >= 0 ? 'text-purple-400' : 'text-orange-400'}`}>
            {stats.avgProfit > 0 ? '+' : ''}{stats.avgProfit.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Predictions List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {predictions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p>선택한 필터에 해당하는 예측이 없습니다.</p>
          </div>
        ) : (
          predictions.map((pred) => (
            <div
              key={pred.id}
              className={`p-3 rounded-lg border transition-all hover:shadow-lg ${
                pred.status === 'success'
                  ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                  : 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
              }`}
            >
              <div className="flex items-start justify-between">
                {/* Left: Expert Info */}
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{pred.expertEmoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{pred.expertName}</p>
                    <p className="text-xs text-slate-400 truncate">{pred.expertStrategy}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">
                        {TIMEFRAME_LABELS[pred.timeframe]}
                      </span>
                      <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                        pred.signal === 'long'
                          ? 'bg-green-500/20 text-green-400'
                          : pred.signal === 'short'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {getSignalIcon(pred.signal)}
                        <span>{getSignalText(pred.signal)}</span>
                      </div>
                      <span className="text-xs text-slate-400">{pred.confidence.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Middle: Price Info */}
                <div className="text-center mx-4">
                  <p className="text-xs text-slate-400 mb-1">진입 → 청산</p>
                  <p className="text-sm font-mono">
                    ${pred.entryPrice.toFixed(2)}
                  </p>
                  <p className="text-sm font-mono">
                    → ${pred.exitPrice.toFixed(2)}
                  </p>
                </div>

                {/* Right: Result */}
                <div className="text-right">
                  <div className={`flex items-center gap-1 mb-1 ${
                    pred.status === 'success' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {pred.status === 'success' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    <span className="text-xs font-medium">
                      {pred.status === 'success' ? '성공' : '실패'}
                    </span>
                  </div>
                  <p className={`text-lg font-bold ${
                    pred.profitPercent > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {pred.profitPercent > 0 ? '+' : ''}{pred.profitPercent.toFixed(2)}%
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(pred.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {predictions.length > 0 && (
        <div className="mt-4 text-center text-xs text-slate-500">
          총 {predictions.length}개 표시됨
        </div>
      )}
    </div>
  );
}
