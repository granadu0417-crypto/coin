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
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-xl hover:shadow-2xl transition-shadow">
      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
        🤖 <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">AI 전문가 의견</span>
        <span className="ml-2 px-2 py-0.5 bg-blue-500/20 border border-blue-500/50 rounded text-blue-400 text-xs font-bold">
          {consensus.symbol}
        </span>
      </h3>

      {/* Horizontal Layout */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Left: Consensus Direction */}
        <div
          className={`md:w-1/3 flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${getDirectionColor(
            consensus.consensus_direction
          )}`}
        >
          {getDirectionIcon(consensus.consensus_direction)}
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80">통합 의견</p>
            <p className="text-2xl font-bold">
              {getDirectionText(consensus.consensus_direction)}
            </p>
          </div>
        </div>

        {/* Middle: Confidence Bar */}
        <div className="md:w-1/3 bg-slate-700/50 rounded-xl p-3 border border-slate-600/50 flex flex-col justify-center">
          <p className="text-xs text-slate-400 mb-2">신뢰도</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-600/50 rounded-full h-3 overflow-hidden border border-slate-500">
              <div
                className={`h-full transition-all duration-500 ${
                  consensus.consensus_direction === 'bullish'
                    ? 'bg-gradient-to-r from-green-500 to-green-400'
                    : consensus.consensus_direction === 'bearish'
                    ? 'bg-gradient-to-r from-red-500 to-red-400'
                    : 'bg-gradient-to-r from-slate-400 to-slate-300'
                }`}
                style={{
                  width: `${consensus.consensus_confidence}%`,
                }}
              />
            </div>
            <span className="text-lg font-bold min-w-[3rem] text-right bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {consensus.consensus_confidence.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Right: Vote Distribution (Compact) */}
        <div className="md:w-1/3 grid grid-cols-3 gap-2">
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/50 rounded-lg p-2 text-center hover:from-green-500/30 hover:to-green-600/20 transition-all">
            <p className="text-green-400 text-xl font-bold">
              {consensus.bullish_count}
            </p>
            <p className="text-xs text-slate-300 font-medium">상승</p>
            <p className="text-xs text-slate-400 mt-1">
              {totalVotes > 0
                ? ((consensus.bullish_count / totalVotes) * 100).toFixed(0)
                : 0}%
            </p>
          </div>
          <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/50 rounded-lg p-2 text-center hover:from-red-500/30 hover:to-red-600/20 transition-all">
            <p className="text-red-400 text-xl font-bold">
              {consensus.bearish_count}
            </p>
            <p className="text-xs text-slate-300 font-medium">하락</p>
            <p className="text-xs text-slate-400 mt-1">
              {totalVotes > 0
                ? ((consensus.bearish_count / totalVotes) * 100).toFixed(0)
                : 0}%
            </p>
          </div>
          <div className="bg-gradient-to-br from-slate-500/20 to-slate-600/10 border border-slate-500/50 rounded-lg p-2 text-center hover:from-slate-500/30 hover:to-slate-600/20 transition-all">
            <p className="text-slate-300 text-xl font-bold">
              {consensus.neutral_count}
            </p>
            <p className="text-xs text-slate-300 font-medium">중립</p>
            <p className="text-xs text-slate-400 mt-1">
              {totalVotes > 0
                ? ((consensus.neutral_count / totalVotes) * 100).toFixed(0)
                : 0}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
