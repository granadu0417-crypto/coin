import { TrendingUp, TrendingDown, Minus, User } from 'lucide-react';
import type { Prediction } from '../types';

interface PredictionsListProps {
  predictions: Prediction[];
}

const PERSONA_NAMES: Record<string, string> = {
  // New analyst types
  technical: '📊 기술적 분석가',
  momentum: '🚀 모멘텀 트레이더',
  volatility: '📉 변동성 분석가',
  sentiment: '💭 심리 분석가',
  trend: '📈 추세 추종자',
  // Legacy support
  value_investor: '💼 가치 투자자',
  technical_analyst: '📊 기술적 분석가',
  momentum_trader: '🚀 모멘텀 트레이더',
  contrarian: '🔄 역발상 투자자',
  macro_economist: '🌍 거시경제 분석가',
  quant_analyst: '🔢 퀀트 분석가',
  risk_manager: '🛡️ 리스크 관리자',
};

export default function PredictionsList({ predictions }: PredictionsListProps) {
  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return <TrendingUp className="w-5 h-5" />;
      case 'bearish':
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <Minus className="w-5 h-5" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'bearish':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getDirectionText = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return '상승';
      case 'bearish':
        return '하락';
      default:
        return '중립';
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-xl hover:shadow-2xl transition-shadow">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        🎯 <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">개별 전문가 예측</span>
      </h3>

      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        {predictions.map((prediction) => (
          <div
            key={prediction.id}
            className="bg-gradient-to-br from-slate-700/50 to-slate-800/30 rounded-xl p-3 border border-slate-600/50 hover:border-slate-500 hover:shadow-lg transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-slate-600 to-slate-700 rounded-full p-2.5 border border-slate-500">
                  <User className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <p className="font-bold text-white">
                    {PERSONA_NAMES[prediction.analyst || prediction.persona || 'unknown'] || prediction.analyst || prediction.persona || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {prediction.created_at ? new Date(
                      typeof prediction.created_at === 'number'
                        ? prediction.created_at * 1000
                        : prediction.created_at
                    ).toLocaleString('ko-KR') : '날짜 미상'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${getDirectionColor(
                    prediction.direction
                  )}`}
                >
                  {getDirectionIcon(prediction.direction)}
                  <span className="font-bold">
                    {getDirectionText(prediction.direction)}
                  </span>
                </div>
                <div className="text-right bg-slate-700/50 rounded-xl px-3 py-2 border border-slate-600/50">
                  <p className="text-xs text-slate-400">신뢰도</p>
                  <p className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    {prediction.confidence.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/70 rounded-lg p-3 border border-slate-700/50">
              <p className="text-xs text-slate-200 leading-relaxed line-clamp-3">{prediction.reasoning}</p>
            </div>

            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full border border-slate-600/50">
                기간: {prediction.timeframe}
              </span>
              {prediction.is_active && (
                <span className="px-3 py-1 bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-blue-300 rounded-full border border-blue-500/50">
                  활성
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
