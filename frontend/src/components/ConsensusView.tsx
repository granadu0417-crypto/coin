import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Consensus } from '../types';

interface ConsensusViewProps {
  consensus: Consensus;
}

export default function ConsensusView({ consensus }: ConsensusViewProps) {
  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return <TrendingUp className="w-6 h-6" />;
      case 'bearish':
        return <TrendingDown className="w-6 h-6" />;
      default:
        return <Minus className="w-6 h-6" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'bullish':
        return 'text-green-400 bg-green-500/20 border-green-500';
      case 'bearish':
        return 'text-red-400 bg-red-500/20 border-red-500';
      default:
        return 'text-slate-400 bg-slate-500/20 border-slate-500';
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

  const totalVotes =
    consensus.bullish_count + consensus.bearish_count + consensus.neutral_count;

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <h3 className="text-xl font-bold mb-4">🤖 AI 전문가 의견</h3>

      <div className="flex items-center gap-4 mb-6">
        <div
          className={`flex items-center gap-3 px-6 py-4 rounded-lg border-2 ${getDirectionColor(
            consensus.consensus_direction
          )}`}
        >
          {getDirectionIcon(consensus.consensus_direction)}
          <div>
            <p className="text-sm uppercase tracking-wide">통합 의견</p>
            <p className="text-2xl font-bold">
              {getDirectionText(consensus.consensus_direction)}
            </p>
          </div>
        </div>

        <div className="flex-1 bg-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400 mb-2">신뢰도</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-600 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  consensus.consensus_direction === 'bullish'
                    ? 'bg-green-500'
                    : consensus.consensus_direction === 'bearish'
                    ? 'bg-red-500'
                    : 'bg-slate-400'
                }`}
                style={{
                  width: `${consensus.consensus_confidence}%`,
                }}
              />
            </div>
            <span className="text-lg font-bold min-w-[3rem] text-right">
              {consensus.consensus_confidence.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Vote Distribution */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
          <p className="text-green-400 text-2xl font-bold">
            {consensus.bullish_count}
          </p>
          <p className="text-sm text-slate-400 mt-1">상승</p>
          <p className="text-xs text-slate-500 mt-1">
            {totalVotes > 0
              ? ((consensus.bullish_count / totalVotes) * 100).toFixed(0)
              : 0}
            %
          </p>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
          <p className="text-red-400 text-2xl font-bold">
            {consensus.bearish_count}
          </p>
          <p className="text-sm text-slate-400 mt-1">하락</p>
          <p className="text-xs text-slate-500 mt-1">
            {totalVotes > 0
              ? ((consensus.bearish_count / totalVotes) * 100).toFixed(0)
              : 0}
            %
          </p>
        </div>
        <div className="bg-slate-500/10 border border-slate-500/30 rounded-lg p-4 text-center">
          <p className="text-slate-400 text-2xl font-bold">
            {consensus.neutral_count}
          </p>
          <p className="text-sm text-slate-400 mt-1">중립</p>
          <p className="text-xs text-slate-500 mt-1">
            {totalVotes > 0
              ? ((consensus.neutral_count / totalVotes) * 100).toFixed(0)
              : 0}
            %
          </p>
        </div>
      </div>
    </div>
  );
}
