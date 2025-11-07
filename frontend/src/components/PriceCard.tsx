import { TrendingUp, TrendingDown } from 'lucide-react';
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
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-3xl font-bold">
            ${price.close.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {price.symbol} / USDT
          </p>
        </div>
        <div
          className={`flex items-center gap-1 px-3 py-1 rounded-full ${
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
          <span className="font-medium">
            {isPositive ? '+' : ''}
            {priceChange.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-slate-400 text-sm">24h High</p>
          <p className="text-lg font-semibold">
            ${price.high.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">24h Low</p>
          <p className="text-lg font-semibold">
            ${price.low.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Volume</p>
          <p className="text-lg font-semibold">
            {(price.volume / 1000000).toFixed(2)}M
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Exchange</p>
          <p className="text-lg font-semibold capitalize">{price.exchange}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">
          Last updated: {new Date(price.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
