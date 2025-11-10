import { useQuery } from '@tanstack/react-query';

interface ExpertStats {
  id: number;
  name: string;
  strategy: string;
  emoji: string;
  stats: {
    [timeframe: string]: {
      totalPredictions: number;
      successCount: number;
      failCount: number;
      pendingCount: number;
      successRate: number;
      lastUpdated: string;
    };
  };
}

const WORKERS_API_URL = 'https://crypto-analysis-api.granadu0417.workers.dev';

export default function ExpertsStats() {
  const { data: experts, isLoading, error } = useQuery<ExpertStats[]>({
    queryKey: ['expertsStats'],
    queryFn: async () => {
      const response = await fetch(`${WORKERS_API_URL}/api/ai/experts`);
      if (!response.ok) throw new Error('Failed to fetch expert stats');
      const data = await response.json();
      return data.experts;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl p-8 border border-purple-700/50 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>🌐</span>
          <span>서버 기반 AI 전문가 (24/7 자동 학습 중)</span>
        </h3>
        <div className="text-center text-slate-300">
          <p>⏳ AI 전문가 통계 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !experts || experts.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl p-8 border border-purple-700/50 shadow-xl">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>🌐</span>
          <span>서버 기반 AI 전문가 (24/7 자동 학습 중)</span>
        </h3>
        <div className="text-center text-slate-300">
          <p>ℹ️ 아직 학습 데이터가 부족합니다</p>
          <p className="text-sm text-slate-400 mt-2">Cloudflare Workers를 배포하면 자동으로 학습이 시작됩니다</p>
        </div>
      </div>
    );
  }

  const timeframes = ['5m', '10m', '30m', '1h'];
  const timeframeLabels = { '5m': '5분', '10m': '10분', '30m': '30분', '1h': '1시간' };

  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-2xl p-6 border border-purple-700/50 shadow-xl">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>🌐</span>
        <span>서버 기반 AI 전문가 (24/7 자동 학습 중)</span>
      </h3>

      {/* Stats Table */}
      <div className="overflow-x-auto">
        <table className="w-full bg-slate-800/50 rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-slate-700/50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-200">전문가</th>
              {timeframes.map((tf) => (
                <th key={tf} className="px-4 py-3 text-center text-sm font-semibold text-slate-200">
                  {timeframeLabels[tf as keyof typeof timeframeLabels]}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-200">평균</th>
            </tr>
          </thead>
          <tbody>
            {experts.map((expert, index) => {
              const rates = timeframes.map((tf) => expert.stats[tf]?.successRate || 0);
              const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;

              return (
                <tr
                  key={expert.id}
                  className={`border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                    index % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{expert.emoji}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{expert.name}</div>
                        <div className="text-xs text-slate-400">{expert.strategy}</div>
                      </div>
                    </div>
                  </td>
                  {timeframes.map((tf) => {
                    const stat = expert.stats[tf];
                    if (!stat || stat.totalPredictions === 0) {
                      return (
                        <td key={tf} className="px-4 py-3 text-center text-slate-500">
                          <div className="text-sm">-</div>
                        </td>
                      );
                    }
                    const rate = stat.successRate;
                    const color =
                      rate >= 60
                        ? 'text-green-400'
                        : rate >= 40
                        ? 'text-yellow-400'
                        : 'text-red-400';
                    return (
                      <td key={tf} className="px-4 py-3 text-center">
                        <div className={`text-sm font-semibold ${color}`}>
                          {rate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-400">
                          {stat.successCount}/{stat.successCount + stat.failCount}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <div
                      className={`text-sm font-bold ${
                        avgRate >= 60
                          ? 'text-green-400'
                          : avgRate >= 40
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }`}
                    >
                      {avgRate.toFixed(1)}%
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info Footer */}
      <div className="mt-4 text-center text-sm text-slate-300 bg-slate-800/30 rounded-lg px-4 py-3">
        <p className="flex items-center justify-center gap-2 flex-wrap">
          <span>⏰ 매 1분마다 자동 예측 생성 및 검증</span>
          <span className="text-slate-500">|</span>
          <span>🧠 실시간 가중치 학습 중</span>
          <span className="text-slate-500">|</span>
          <span>☁️ 브라우저를 닫아도 24/7 학습</span>
        </p>
      </div>
    </div>
  );
}
