import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Target, Award, AlertTriangle } from 'lucide-react';

interface DetailedExpertStats {
  expertId: number;
  expertName: string;
  expertEmoji: string;
  expertStrategy: string;
  coin: string;
  timeframe?: string;
  totalPredictions: number;
  successCount: number;
  failCount: number;
  successRate: number;
  avgProfit: number;
  maxProfit: number;
  maxLoss: number;
  totalProfit: number;
  currentStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;
  longCount: number;
  shortCount: number;
  longSuccessRate: number;
  shortSuccessRate: number;
  recentResults: boolean[];
  lastUpdated: string;
}

interface ExpertsStatsProps {
  coin?: 'btc' | 'eth';
}

const WORKERS_API_URL = import.meta.env.VITE_API_URL || 'https://crypto-analysis-api.granadu0417.workers.dev';

export default function ExpertsStats({ coin = 'btc' }: ExpertsStatsProps) {
  const { data, isLoading, error } = useQuery<DetailedExpertStats[]>({
    queryKey: ['detailedExpertsStats', coin],
    queryFn: async () => {
      const response = await fetch(`${WORKERS_API_URL}/api/ai/experts/stats?coin=${coin}`);
      if (!response.ok) throw new Error('Failed to fetch expert stats');
      const result = await response.json();
      return result.stats;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl p-8 border border-purple-700/50 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          🧠 <span>AI 전문가 통계 (24/7 학습)</span>
        </h3>
        <div className="text-center text-slate-300">
          <p>⏳ 통계 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl p-8 border border-purple-700/50 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          🧠 <span>AI 전문가 통계 (24/7 학습)</span>
        </h3>
        <div className="text-center text-slate-300">
          <p>ℹ️ 아직 학습 데이터가 부족합니다</p>
        </div>
      </div>
    );
  }

  const getStreakColor = (streak: number) => {
    if (streak > 0) return 'text-green-400';
    if (streak < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 60) return 'text-green-400 bg-green-500/20 border-green-500/50';
    if (rate >= 50) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
    if (rate >= 40) return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
    return 'text-red-400 bg-red-500/20 border-red-500/50';
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl p-6 border border-purple-700/50 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          🧠 <span>AI 전문가 성과 분석</span>
          <span className="ml-2 px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-400 text-sm font-bold">
            {coin.toUpperCase()}
          </span>
        </h3>
        <div className="text-sm text-slate-400">
          {data.length}명의 전문가 활동 중
        </div>
      </div>

      {/* Expert Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map((expert) => (
          <div
            key={expert.expertId}
            className="bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-all"
          >
            {/* Expert Header */}
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{expert.expertEmoji}</span>
                  <div>
                    <h4 className="font-bold text-white">{expert.expertName}</h4>
                    <p className="text-xs text-slate-400">{expert.expertStrategy}</p>
                  </div>
                </div>
              </div>

              {/* Success Rate Badge */}
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getSuccessRateColor(expert.successRate)}`}>
                <Target className="w-4 h-4" />
                <span className="font-bold">{expert.successRate.toFixed(1)}%</span>
                <span className="text-xs opacity-75">승률</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="p-4 space-y-3">
              {/* Profit Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-700/50 rounded-lg p-2">
                  <p className="text-xs text-slate-400 mb-1">평균 수익</p>
                  <p className={`text-sm font-bold ${expert.avgProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {expert.avgProfit > 0 ? '+' : ''}{expert.avgProfit.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-2">
                  <p className="text-xs text-slate-400 mb-1">총 수익</p>
                  <p className={`text-sm font-bold ${expert.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {expert.totalProfit > 0 ? '+' : ''}{expert.totalProfit.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Max Profit/Loss */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-green-500/10 rounded-lg p-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-xs text-slate-400">최대 수익</p>
                    <p className="text-sm font-bold text-green-400">+{expert.maxProfit.toFixed(2)}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-red-500/10 rounded-lg p-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <div>
                    <p className="text-xs text-slate-400">최대 손실</p>
                    <p className="text-sm font-bold text-red-400">{expert.maxLoss.toFixed(2)}%</p>
                  </div>
                </div>
              </div>

              {/* Streak Stats */}
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">현재 연속</span>
                  <span className={`text-sm font-bold ${getStreakColor(expert.currentStreak)}`}>
                    {expert.currentStreak > 0 && '+'}{expert.currentStreak}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Award className="w-3 h-3 text-green-400" />
                    <span className="text-slate-400">최대 성공:</span>
                    <span className="text-green-400 font-semibold">{expert.maxWinStreak}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span className="text-slate-400">최대 실패:</span>
                    <span className="text-red-400 font-semibold">{expert.maxLossStreak}</span>
                  </div>
                </div>
              </div>

              {/* Recent Results */}
              <div>
                <p className="text-xs text-slate-400 mb-2">최근 10개 결과</p>
                <div className="flex gap-1">
                  {expert.recentResults.map((success, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 h-2 rounded ${success ? 'bg-green-500' : 'bg-red-500'}`}
                      title={success ? '성공' : '실패'}
                    />
                  ))}
                </div>
              </div>

              {/* Signal Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-green-500/10 rounded p-2">
                  <p className="text-slate-400">롱 {expert.longCount}회</p>
                  <p className="text-green-400 font-semibold">{expert.longSuccessRate.toFixed(1)}%</p>
                </div>
                <div className="bg-red-500/10 rounded p-2">
                  <p className="text-slate-400">숏 {expert.shortCount}회</p>
                  <p className="text-red-400 font-semibold">{expert.shortSuccessRate.toFixed(1)}%</p>
                </div>
              </div>

              {/* Total Predictions */}
              <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-700/50">
                총 {expert.totalPredictions}회 예측 ({expert.successCount}성공 / {expert.failCount}실패)
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-sm text-slate-300 bg-slate-800/30 rounded-lg px-4 py-3">
        <p className="flex items-center justify-center gap-2 flex-wrap">
          <span>⏰ 매 1분마다 자동 예측</span>
          <span className="text-slate-500">|</span>
          <span>🧠 실시간 학습</span>
          <span className="text-slate-500">|</span>
          <span>📊 레버리지 20배 기준</span>
          <span className="text-slate-500">|</span>
          <span>☁️ 24/7 운영</span>
        </p>
      </div>
    </div>
  );
}
