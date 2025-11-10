import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import type { Price } from '../types';

interface PriceCardProps {
  price: Price;
  history: Price[];
}

export default function PriceCard({ price, history }: PriceCardProps) {
  // Calculate 24h change
  const oldestPrice = history.length > 0 ? history[history.length - 1] : null;
  const priceChange = oldestPrice
    ? ((price.close - oldestPrice.close) / oldestPrice.close) * 100
    : 0;

  const isPositive = priceChange >= 0;

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-xl hover:shadow-2xl transition-shadow">
      {/* Horizontal Layout - Price and Stats */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left: Main Price */}
        <div className="md:w-1/3 flex flex-col justify-center">
          <div className="flex items-baseline gap-2 mb-2">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ₩{(price.close / 1000).toLocaleString('ko-KR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}K
            </h2>
          </div>
          <p className="text-slate-400 text-sm mb-2">
            {price.symbol} / KRW · {price.exchange}
          </p>
          <div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full w-fit ${
              isPositive
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="font-bold">
              {isPositive ? '+' : ''}
              {priceChange.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Right: Stats Grid (2x2) */}
        <div className="md:w-2/3 grid grid-cols-2 gap-3">
        <div className="bg-slate-700/30 rounded-xl p-3 border border-slate-600/50">
          <p className="text-slate-400 text-xs mb-1">24시간 최고가</p>
          <p className="text-lg font-bold text-green-400">
            ₩{price.high.toLocaleString('ko-KR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
        <div className="bg-slate-700/30 rounded-xl p-3 border border-slate-600/50">
          <p className="text-slate-400 text-xs mb-1">24시간 최저가</p>
          <p className="text-lg font-bold text-red-400">
            ₩{price.low.toLocaleString('ko-KR', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
        <div className="bg-slate-700/30 rounded-xl p-3 border border-slate-600/50">
          <div className="flex items-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-slate-400" />
            <p className="text-slate-400 text-xs">거래량</p>
          </div>
          <p className="text-lg font-bold text-blue-400">
            {price.volume.toFixed(2)} {price.symbol}
          </p>
        </div>
          <div className="bg-slate-700/30 rounded-xl p-3 border border-slate-600/50">
            <p className="text-slate-400 text-xs mb-1">거래소</p>
            <p className="text-lg font-bold text-purple-400 capitalize">{price.exchange}</p>
          </div>
        </div>
      </div>

      {/* Bottom: Last Update */}
      <div className="mt-3 pt-3 border-t border-slate-700/50">
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <span className="text-slate-600">●</span>
          마지막 업데이트: {new Date(
            typeof price.timestamp === 'number'
              ? price.timestamp * 1000
              : price.timestamp
          ).toLocaleString('ko-KR')}
        </p>
      </div>
    </div>
  );
}
