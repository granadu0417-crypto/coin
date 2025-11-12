import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { arenaApi } from '../services/api';
import { upbitWebSocket, type UpbitTicker } from '../services/upbitWebSocket';
import { formatKRWSimple, formatRelativeTime } from '../utils/format';
import type { TraderBalance, OpenPosition, ClosedTrade } from '../types';

export default function TradingArena() {
  const [selectedCoin, setSelectedCoin] = useState<'btc' | 'eth'>('btc');
  const [realtimePrice, setRealtimePrice] = useState<{
    btc: number | null;
    eth: number | null;
  }>({ btc: null, eth: null });

  // 리더보드 조회
  const { data: leaderboardData } = useQuery({
    queryKey: ['arenaLeaderboard', selectedCoin],
    queryFn: () => arenaApi.getLeaderboard(selectedCoin),
    refetchInterval: 10000, // 10초마다 갱신
  });

  // 열린 포지션 조회
  const { data: positionsData } = useQuery({
    queryKey: ['arenaPositions', selectedCoin],
    queryFn: () => arenaApi.getOpenPositions(selectedCoin),
    refetchInterval: 5000, // 5초마다 갱신
  });

  // 최근 거래 조회
  const { data: tradesData } = useQuery({
    queryKey: ['arenaTrades', selectedCoin],
    queryFn: () => arenaApi.getRecentTrades(selectedCoin, 20),
    refetchInterval: 10000,
  });

  // 실시간 예측 신뢰도 조회
  const { data: predictionsData } = useQuery({
    queryKey: ['livePredictions', selectedCoin],
    queryFn: () => arenaApi.getLivePredictions(selectedCoin),
    refetchInterval: 5000, // 5초마다 갱신
  });

  const leaderboard = (leaderboardData?.leaderboard || []) as TraderBalance[];
  const openPositions = (positionsData?.positions || []) as OpenPosition[];
  const recentTrades = (tradesData?.trades || []) as ClosedTrade[];
  const livePredictions = predictionsData?.predictions || [];

  // 업비트 웹소켓으로 실시간 가격 받아오기
  useEffect(() => {
    const handleBtcTicker = (ticker: UpbitTicker) => {
      setRealtimePrice((prev) => ({ ...prev, btc: ticker.trade_price }));
    };

    const handleEthTicker = (ticker: UpbitTicker) => {
      setRealtimePrice((prev) => ({ ...prev, eth: ticker.trade_price }));
    };

    // BTC, ETH 구독
    upbitWebSocket.subscribe('BTC', handleBtcTicker);
    upbitWebSocket.subscribe('ETH', handleEthTicker);

    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      upbitWebSocket.unsubscribe('BTC', handleBtcTicker);
      upbitWebSocket.unsubscribe('ETH', handleEthTicker);
    };
  }, []);

  // 현재 선택된 코인의 실시간 가격
  const currentPrice = realtimePrice[selectedCoin] ?? predictionsData?.currentPrice ?? 0;

  // 상위 3명
  const top3 = leaderboard.slice(0, 3);

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-400';
    if (profit < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') return { text: '활성', color: 'bg-green-500/20 text-green-400 border-green-500/50' };
    if (status === 'paused') return { text: '일시정지', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' };
    return { text: '중단', color: 'bg-red-500/20 text-red-400 border-red-500/50' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50 shadow-xl">
        <div className="w-full max-w-[1800px] mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-3">
            🎮 AI 트레이더 배틀 아레나
          </h1>
          <p className="text-sm text-slate-300 mt-1">
            10명의 AI 트레이더가 실전 거래로 경쟁합니다 · 레버리지 20배 · 최대 30분 보유
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-[1800px] mx-auto px-6 py-6">
        {/* Coin Selector */}
        <div className="mb-6">
          <div className="flex gap-4 justify-center">
            {[
              { symbol: 'btc', name: 'Bitcoin', emoji: '₿' },
              { symbol: 'eth', name: 'Ethereum', emoji: 'Ξ' }
            ].map((coin) => (
              <button
                key={coin.symbol}
                onClick={() => setSelectedCoin(coin.symbol as 'btc' | 'eth')}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg ${
                  selectedCoin === coin.symbol
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-purple-500/50'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700'
                }`}
              >
                <span className="text-2xl mr-2">{coin.emoji}</span>
                {coin.name}
              </button>
            ))}
          </div>
        </div>

        {/* Live Predictions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🔮 실시간 예측 신뢰도</h2>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
            {livePredictions.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="animate-pulse">데이터를 불러오는 중...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {livePredictions.map((pred: any) => {
                  const confidenceColor =
                    pred.confidence >= 60 ? 'text-green-400' :
                    pred.confidence >= 40 ? 'text-yellow-400' : 'text-red-400';

                  const confidenceBg =
                    pred.confidence >= 60 ? 'bg-green-500/20 border-green-500/50' :
                    pred.confidence >= 40 ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-red-500/20 border-red-500/50';

                  const signalBadge = pred.signal === 'long'
                    ? { text: '↗ LONG', color: 'bg-green-500/30 text-green-300' }
                    : pred.signal === 'short'
                    ? { text: '↘ SHORT', color: 'bg-red-500/30 text-red-300' }
                    : { text: '⊡ NEUTRAL', color: 'bg-slate-500/30 text-slate-300' };

                  return (
                    <div
                      key={pred.expertId}
                      className={`relative rounded-lg border-2 p-4 transition-all ${confidenceBg} ${
                        pred.canEnter ? 'ring-2 ring-blue-400 shadow-lg shadow-blue-500/20' : ''
                      }`}
                    >
                      {pred.canEnter && (
                        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
                          진입가능
                        </div>
                      )}
                      <div className="text-center">
                        <div className="text-3xl mb-2">{pred.expertEmoji}</div>
                        <div className="text-sm font-semibold text-white mb-2">{pred.expertName}</div>
                        <div className={`text-2xl font-bold mb-2 ${confidenceColor}`}>
                          {pred.confidence.toFixed(1)}%
                        </div>
                        <div className={`text-xs font-semibold px-2 py-1 rounded ${signalBadge.color}`}>
                          {signalBadge.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 text-center text-xs text-slate-400">
              {currentPrice > 0 && (
                <span className="font-semibold text-green-400">
                  실시간 현재가: {formatKRWSimple(currentPrice)} ·
                </span>
              )}
              <span>업비트 웹소켓 실시간 연결</span>
            </div>
          </div>
        </div>

        {/* Top 3 Podium */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 text-center">🏆 오늘의 TOP 3 트레이더</h2>
          <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
            {top3.map((trader, index) => {
              const ranks = ['🥇', '🥈', '🥉'];
              const heights = ['h-64', 'h-56', 'h-48'];
              const gradients = [
                'from-yellow-900/50 to-yellow-800/30',
                'from-slate-700/50 to-slate-600/30',
                'from-orange-900/50 to-orange-800/30'
              ];

              return (
                <div
                  key={trader.expertId}
                  className={`bg-gradient-to-br ${gradients[index]} rounded-2xl p-6 border-2 ${
                    index === 0 ? 'border-yellow-500/50' : index === 1 ? 'border-slate-400/50' : 'border-orange-500/50'
                  } ${heights[index]} flex flex-col items-center justify-center shadow-2xl`}
                >
                  <div className="text-5xl mb-3">{ranks[index]}</div>
                  <div className="text-4xl mb-2">{trader.emoji}</div>
                  <div className="text-lg font-bold text-white text-center mb-2">{trader.name}</div>
                  <div className={`text-3xl font-bold ${getProfitColor(trader.todayProfitPercent)}`}>
                    {trader.todayProfitPercent > 0 ? '+' : ''}{trader.todayProfitPercent.toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-400 mt-1">{formatKRWSimple(trader.currentBalance)}</div>
                  <div className="text-xs text-slate-500 mt-2">
                    오늘 {trader.todayWins}승 {trader.todayLosses}패
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Open Positions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">📍 열린 포지션 ({openPositions.length}개)</h2>
          {openPositions.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700">
              <p className="text-slate-400">현재 열린 포지션이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openPositions.map((pos) => (
                <div
                  key={pos.id}
                  className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{pos.expertEmoji}</span>
                      <div>
                        <div className="text-sm font-semibold text-white">{pos.expertName}</div>
                        <div className="text-xs text-slate-500">#{pos.expertId}</div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      pos.position === 'long'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {pos.position.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">진입가</span>
                      <span className="text-white font-mono">{formatKRWSimple(pos.entryPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">현재가</span>
                      <span className="text-white font-mono">{formatKRWSimple(currentPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">실시간 수익률</span>
                      <span className={`font-bold ${
                        (() => {
                          const leverage = 20;
                          const price = currentPrice > 0 ? currentPrice : pos.entryPrice;
                          const profitPercent = pos.position === 'long'
                            ? ((price - pos.entryPrice) / pos.entryPrice) * 100 * leverage
                            : ((pos.entryPrice - price) / pos.entryPrice) * 100 * leverage;
                          return profitPercent >= 0 ? 'text-green-400' : 'text-red-400';
                        })()
                      }`}>
                        {(() => {
                          const leverage = 20;
                          const price = currentPrice > 0 ? currentPrice : pos.entryPrice;
                          const profitPercent = pos.position === 'long'
                            ? ((price - pos.entryPrice) / pos.entryPrice) * 100 * leverage
                            : ((pos.entryPrice - price) / pos.entryPrice) * 100 * leverage;
                          return `${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%`;
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">신뢰도</span>
                      <span className="text-white">{pos.entryConfidence.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">경과 시간</span>
                      <span className="text-white">{formatRelativeTime(pos.entryTime)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Traders Leaderboard */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">📊 전체 리더보드</h2>
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">순위</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">트레이더</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">잔고</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">오늘 수익</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">오늘 승/패</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">승률</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">연속</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-300">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((trader, index) => {
                    const status = getStatusBadge(trader.status);
                    return (
                      <tr
                        key={trader.expertId}
                        className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-white font-bold">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{trader.emoji}</span>
                            <div>
                              <div className="text-sm font-semibold text-white">{trader.name}</div>
                              <div className="text-xs text-slate-500">{trader.strategy}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-white font-bold">{formatKRWSimple(trader.currentBalance)}</div>
                          <div className={`text-xs ${getProfitColor(trader.totalProfitPercent)}`}>
                            {trader.totalProfitPercent > 0 ? '+' : ''}{trader.totalProfitPercent.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`font-bold ${getProfitColor(trader.todayProfitPercent)}`}>
                            {trader.todayProfitPercent > 0 ? '+' : ''}{trader.todayProfitPercent.toFixed(1)}%
                          </div>
                          <div className={`text-xs ${getProfitColor(trader.todayProfitAmount)}`}>
                            {formatKRWSimple(trader.todayProfitAmount)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-green-400 font-semibold">{trader.todayWins}</span>
                          <span className="text-slate-500"> / </span>
                          <span className="text-red-400 font-semibold">{trader.todayLosses}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`font-bold ${
                            trader.winRate >= 70 ? 'text-green-400' :
                            trader.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {trader.winRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-slate-500">
                            {trader.totalTrades}전
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {trader.consecutiveWins > 0 ? (
                            <span className="text-green-400 font-bold">🔥 {trader.consecutiveWins}연승</span>
                          ) : trader.consecutiveLosses > 0 ? (
                            <span className="text-red-400 font-bold">❄️ {trader.consecutiveLosses}연패</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Trades Timeline */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">⏱️ 최근 거래 내역</h2>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="space-y-3">
              {recentTrades.slice(0, 15).map((trade) => (
                <div
                  key={trade.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border ${
                    trade.status === 'closed_win'
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{trade.expertEmoji}</span>
                    <div>
                      <div className="text-sm font-semibold text-white">{trade.expertName}</div>
                      <div className="text-xs text-slate-400">{formatRelativeTime(trade.exitTime)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
                    <div className="text-center">
                      <div className="text-xs text-slate-400">포지션</div>
                      <div className={`text-sm font-bold ${
                        trade.position === 'long' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {trade.position.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">보유시간</div>
                      <div className="text-sm text-white">{trade.holdDurationMinutes}분</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">수익률</div>
                      <div className={`text-lg font-bold ${getProfitColor(trade.leveragedProfitPercent)}`}>
                        {trade.leveragedProfitPercent > 0 ? '+' : ''}{trade.leveragedProfitPercent.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400">청산이유</div>
                      <div className="text-sm text-slate-300">{trade.exitReason}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 py-4 border-t border-slate-800 text-center text-slate-500 text-xs">
        <p>🎮 AI 트레이더 배틀 아레나 · 레버리지 20배 · 최대 30분 보유 · 실시간 자동 거래</p>
      </footer>
    </div>
  );
}
