import { MessageSquare, TrendingUp, TrendingDown } from 'lucide-react';

interface InfluencerMention {
  influencer_name: string;
  platform: string;
  content: string;
  content_ko?: string; // Korean translation
  url: string;
  symbols: string;
  sentiment_score: number;
  impact_level: 'high' | 'medium' | 'low';
  published_at: number;
}

interface InfluencerTimelineProps {
  mentions: InfluencerMention[];
}

export default function InfluencerTimeline({ mentions }: InfluencerTimelineProps) {
  const getImpactColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'border-red-500 bg-red-500/10';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500/10';
      default:
        return 'border-slate-500 bg-slate-500/10';
    }
  };

  const getImpactBadge = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.2) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (score < -0.2) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <MessageSquare className="w-4 h-4 text-slate-400" />;
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  if (!mentions || mentions.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-xl h-full flex flex-col">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          💬 유명인 발언
        </h3>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 text-center">
            최근 24시간 이내 유명인 발언이 없습니다
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          💬 유명인 발언
        </h3>
        <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-full">
          {mentions.length}건
        </span>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
        {mentions.map((mention, index) => (
          <div
            key={index}
            className={`border-l-4 ${getImpactColor(
              mention.impact_level
            )} rounded-r-xl p-3 hover:bg-slate-700/30 transition-all cursor-pointer`}
            onClick={() => window.open(mention.url, '_blank')}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">
                  {mention.influencer_name}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${getImpactBadge(
                    mention.impact_level
                  )}`}
                >
                  {mention.impact_level === 'high' ? '높음' :
                   mention.impact_level === 'medium' ? '중간' : '낮음'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {getSentimentIcon(mention.sentiment_score)}
                <span className="text-xs text-slate-400">
                  {formatTimeAgo(mention.published_at)}
                </span>
              </div>
            </div>

            {/* Content */}
            <p className="text-xs text-slate-300 mb-2 line-clamp-2">
              {mention.content_ko || mention.content}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-2">
                {mention.symbols.split(',').map((symbol) => (
                  <span
                    key={symbol}
                    className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded border border-blue-500/30"
                  >
                    {symbol}
                  </span>
                ))}
              </div>
              <span className="text-xs text-slate-500">{mention.platform}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
