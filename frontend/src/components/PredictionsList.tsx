import { TrendingUp, TrendingDown, Minus, User } from 'lucide-react';
import type { Prediction } from '../types';

interface PredictionsListProps {
  predictions: Prediction[];
}

const PERSONA_NAMES: Record<string, string> = {
  // New analyst types
  technical: '📊 Technical Analyst',
  momentum: '🚀 Momentum Trader',
  volatility: '📉 Volatility Analyst',
  sentiment: '💭 Sentiment Analyst',
  trend: '📈 Trend Follower',
  // Legacy support
  value_investor: '💼 Value Investor',
  technical_analyst: '📊 Technical Analyst',
  momentum_trader: '🚀 Momentum Trader',
  contrarian: '🔄 Contrarian',
  macro_economist: '🌍 Macro Economist',
  quant_analyst: '🔢 Quant Analyst',
  risk_manager: '🛡️ Risk Manager',
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

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="text-xl font-bold mb-4">🎯 Individual Expert Predictions</h3>

      <div className="space-y-4">
        {predictions.map((prediction) => (
          <div
            key={prediction.id}
            className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="bg-slate-600 rounded-full p-2">
                  <User className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <p className="font-semibold">
                    {PERSONA_NAMES[prediction.analyst || prediction.persona || 'unknown'] || prediction.analyst || prediction.persona || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {prediction.created_at ? new Date(
                      typeof prediction.created_at === 'number'
                        ? prediction.created_at * 1000
                        : prediction.created_at
                    ).toLocaleString() : 'Unknown date'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getDirectionColor(
                    prediction.direction
                  )}`}
                >
                  {getDirectionIcon(prediction.direction)}
                  <span className="font-medium capitalize">
                    {prediction.direction}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Confidence</p>
                  <p className="text-lg font-bold">
                    {prediction.confidence.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded p-3">
              <p className="text-sm text-slate-300">{prediction.reasoning}</p>
            </div>

            <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
              <span>Timeframe: {prediction.timeframe}</span>
              {prediction.is_active && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                  Active
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
