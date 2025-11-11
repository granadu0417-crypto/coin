import { useState, useEffect } from 'react';
import { arenaApi } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ClosedTrade } from '../types';

// UTC 시간을 한국 시간(KST)으로 변환하는 유틸리티 함수
const formatToKST = (utcTimeStr: string, format: 'full' | 'short' = 'full') => {
  // UTC 시간 문자열에 'Z'를 추가하여 UTC임을 명시
  const date = new Date(utcTimeStr.endsWith('Z') ? utcTimeStr : `${utcTimeStr}Z`);

  if (format === 'short') {
    return date.toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'short',
      day: 'numeric',
      hour: '2-digit'
    });
  }

  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function History() {
  const [coin, setCoin] = useState<'btc' | 'eth'>('btc');
  const [selectedExpert, setSelectedExpert] = useState<number | undefined>(undefined);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [allTrades, setAllTrades] = useState<ClosedTrade[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'model'>('daily');

  // 날짜 범위 상태 (기본값: 최근 7일)
  const getDefaultDates = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultDates());
  const [tempDateRange, setTempDateRange] = useState(getDefaultDates()); // 임시 날짜 상태

  // 조회하기 버튼 핸들러
  const handleSearch = () => {
    setDateRange(tempDateRange);
  };

  // 최근 7일 버튼 핸들러
  const handleResetToLast7Days = () => {
    const defaultDates = getDefaultDates();
    setTempDateRange(defaultDates);
    setDateRange(defaultDates);
  };

  // 성과 데이터 가져오기
  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const data = await arenaApi.getPerformance(coin, selectedExpert, dateRange.start, dateRange.end);

        // 누적 잔고 차트용 데이터 변환
        const chartData: any = {};

        data.data.forEach((item: any) => {
          const date = formatToKST(item.timestamp, 'short');

          if (!chartData[date]) {
            chartData[date] = { date };
          }

          chartData[date][`${item.expertName}`] = item.balance;
        });

        setPerformanceData(Object.values(chartData));
      } catch (error) {
        console.error('Failed to fetch performance:', error);
      }
    };

    fetchPerformance();
  }, [coin, selectedExpert, dateRange]);

  // 일별 통계 가져오기
  useEffect(() => {
    const fetchDailyStats = async () => {
      try {
        const data = await arenaApi.getDailyStats(coin, dateRange.start, dateRange.end);
        setDailyStats(data.stats);
      } catch (error) {
        console.error('Failed to fetch daily stats:', error);
      }
    };

    fetchDailyStats();
  }, [coin, dateRange]);

  // 전체 거래 내역 가져오기
  useEffect(() => {
    const fetchAllTrades = async () => {
      setLoading(true);
      try {
        const data = await arenaApi.getAllTrades(coin, selectedExpert, currentPage, 50, dateRange.start, dateRange.end);
        setAllTrades(data.trades);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error('Failed to fetch all trades:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTrades();
  }, [coin, selectedExpert, currentPage, dateRange]);

  // 전문가 목록 (필터용)
  const experts = [
    { id: 1, name: 'RSI 전문가', emoji: '📊' },
    { id: 2, name: 'MACD 전문가', emoji: '📈' },
    { id: 3, name: '볼린저 전문가', emoji: '🎯' },
    { id: 4, name: '펀딩 전문가', emoji: '💰' },
    { id: 5, name: '거래량 전문가', emoji: '📊' },
    { id: 6, name: '균형형 전문가', emoji: '⚖️' },
    { id: 7, name: '단기 스캘퍼', emoji: '⚡' },
    { id: 8, name: '추세 추종가', emoji: '🚀' },
    { id: 9, name: '역추세 사냥꾼', emoji: '🎣' },
    { id: 10, name: '펀딩+고래 추적가', emoji: '🐋' },
  ];

  const expertColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
  ];

  // 모델별 집계 데이터 계산
  const modelStats = experts.map(expert => {
    const expertStats = dailyStats.filter(stat => stat.expertName === expert.name);

    if (expertStats.length === 0) {
      return {
        expertId: expert.id,
        expertName: expert.name,
        expertEmoji: expert.emoji,
        totalTrades: 0,
        totalWins: 0,
        totalLosses: 0,
        winRate: 0,
        avgProfit: 0,
        totalProfitAmount: 0,
        bestDay: null,
        worstDay: null,
        dailyData: []
      };
    }

    const totalTrades = expertStats.reduce((sum, stat) => sum + stat.trades, 0);
    const totalWins = expertStats.reduce((sum, stat) => sum + stat.wins, 0);
    const totalLosses = expertStats.reduce((sum, stat) => sum + stat.losses, 0);
    const totalProfitAmount = expertStats.reduce((sum, stat) => sum + stat.totalProfit, 0);
    const avgProfit = expertStats.reduce((sum, stat) => sum + stat.avgProfitPercent, 0) / expertStats.length;

    // 최고/최악의 날 찾기
    const sortedByProfit = [...expertStats].sort((a, b) => b.totalProfit - a.totalProfit);
    const bestDay = sortedByProfit[0];
    const worstDay = sortedByProfit[sortedByProfit.length - 1];

    return {
      expertId: expert.id,
      expertName: expert.name,
      expertEmoji: expert.emoji,
      totalTrades,
      totalWins,
      totalLosses,
      winRate: totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0,
      avgProfit,
      totalProfitAmount,
      bestDay,
      worstDay,
      dailyData: expertStats
    };
  }).filter(stat => stat.totalTrades > 0); // 거래가 없는 모델은 제외

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">📈 트레이딩 히스토리</h1>
            <p className="text-slate-400">누적 성과와 거래 내역을 확인하세요</p>
          </div>

          {/* 필터 */}
          <div className="flex gap-3">
            {/* 코인 선택 */}
            <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg">
              <button
                onClick={() => setCoin('btc')}
                className={`px-4 py-2 rounded-md font-semibold transition-all ${
                  coin === 'btc'
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ₿ BTC
              </button>
              <button
                onClick={() => setCoin('eth')}
                className={`px-4 py-2 rounded-md font-semibold transition-all ${
                  coin === 'eth'
                    ? 'bg-blue-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ξ ETH
              </button>
            </div>

            {/* 전문가 필터 */}
            <select
              value={selectedExpert || ''}
              onChange={(e) => setSelectedExpert(e.target.value ? parseInt(e.target.value) : undefined)}
              className="bg-slate-800/50 text-white px-4 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="">전체 트레이더</option>
              {experts.map(expert => (
                <option key={expert.id} value={expert.id}>
                  {expert.emoji} {expert.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 누적 잔고 차트 */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">💰 누적 잔고 추이</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(1)}K`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#cbd5e1' }}
                formatter={(value: any) => [`$${value.toFixed(2)}`, '잔고']}
              />
              <Legend />
              {experts.map((expert, index) => (
                <Line
                  key={expert.id}
                  type="monotone"
                  dataKey={expert.name}
                  stroke={expertColors[index]}
                  strokeWidth={selectedExpert === expert.id ? 3 : 1}
                  dot={false}
                  opacity={selectedExpert === expert.id || !selectedExpert ? 1 : 0.2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 일별 통계 */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">📊 성과 분석</h2>

              {/* 탭 버튼 */}
              <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('daily')}
                  className={`px-4 py-2 rounded-md font-semibold transition-all text-sm ${
                    activeTab === 'daily'
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📅 일별 상세
                </button>
                <button
                  onClick={() => setActiveTab('model')}
                  className={`px-4 py-2 rounded-md font-semibold transition-all text-sm ${
                    activeTab === 'model'
                      ? 'bg-purple-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🎯 모델별 분석
                </button>
              </div>
            </div>

            {/* 날짜 범위 선택 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-slate-400 text-sm">시작일</label>
                <input
                  type="date"
                  value={tempDateRange.start}
                  onChange={(e) => setTempDateRange({ ...tempDateRange, start: e.target.value })}
                  className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <span className="text-slate-500">~</span>

              <div className="flex items-center gap-2">
                <label className="text-slate-400 text-sm">종료일</label>
                <input
                  type="date"
                  value={tempDateRange.end}
                  onChange={(e) => setTempDateRange({ ...tempDateRange, end: e.target.value })}
                  className="bg-slate-800 text-white px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-medium"
              >
                조회하기
              </button>

              <button
                onClick={handleResetToLast7Days}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
              >
                최근 7일
              </button>
            </div>
          </div>

          {/* 일별 상세 탭 - DATE-FIRST VIEW */}
          {activeTab === 'daily' && (
            <div className="space-y-6">
              {(() => {
                // Group stats by date
                const statsByDate: { [key: string]: typeof dailyStats } = {};
                dailyStats.forEach(stat => {
                  if (!statsByDate[stat.date]) {
                    statsByDate[stat.date] = [];
                  }
                  statsByDate[stat.date].push(stat);
                });

                // Sort dates in descending order (most recent first)
                const sortedDates = Object.keys(statsByDate).sort((a, b) => b.localeCompare(a));

                return sortedDates.map(date => {
                  const dateStats = statsByDate[date];

                  // Create full model list with ALL 10 models (including those with no trades)
                  const allModelsForDate = experts.map(expert => {
                    const stat = dateStats.find(s => s.expertName === expert.name);
                    return stat ? stat : {
                      expertName: expert.name,
                      expertEmoji: expert.emoji,
                      date: date,
                      trades: 0,
                      wins: 0,
                      losses: 0,
                      totalProfit: 0,
                      avgProfitPercent: 0,
                      bestTradePercent: 0,
                      worstTradePercent: 0
                    };
                  });

                  // Sort models by profit for this date
                  const rankedStats = [...allModelsForDate].sort((a, b) => b.totalProfit - a.totalProfit);
                  const totalTrades = dateStats.reduce((sum, s) => sum + s.trades, 0);
                  const totalProfit = dateStats.reduce((sum, s) => sum + s.totalProfit, 0);
                  const bestModel = rankedStats.find(s => s.trades > 0) || rankedStats[0];

                  return (
                    <div key={date} className="bg-slate-800/30 rounded-xl p-6 border border-slate-700">
                      {/* Date Header with Summary */}
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-600">
                        <div>
                          <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                            📅 {new Date(date.endsWith('Z') ? date : `${date}Z`).toLocaleDateString('ko-KR', {
                              timeZone: 'Asia/Seoul',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </h3>
                          <p className="text-slate-400 text-sm mt-1">
                            총 {totalTrades}건 거래 • 전체 수익: <span className={totalProfit >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                              {totalProfit >= 0 ? '+' : ''}${(totalProfit / 1000).toFixed(1)}K
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-500">최고 모델</div>
                          <div className="text-lg font-bold text-yellow-400">
                            {bestModel.expertEmoji} {bestModel.expertName}
                          </div>
                        </div>
                      </div>

                      {/* Models Performance Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px]">
                          <thead>
                            <tr className="text-left text-slate-400 text-sm border-b border-slate-600">
                              <th className="pb-3 w-8"></th>
                              <th className="pb-3">모델</th>
                              <th className="pb-3 text-center">거래</th>
                              <th className="pb-3 text-center">승/패</th>
                              <th className="pb-3 text-center">승률</th>
                              <th className="pb-3 text-right">총 수익</th>
                              <th className="pb-3 text-right">평균 수익률</th>
                              <th className="pb-3 text-right">최고 거래</th>
                              <th className="pb-3 text-right">최악 거래</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rankedStats.map((stat, index) => {
                              const hasData = stat.trades > 0;
                              return (
                                <tr key={stat.expertName} className={`border-b border-slate-700/30 hover:bg-slate-700/20 ${!hasData ? 'opacity-40' : ''}`}>
                                  <td className="py-3">
                                    {hasData && index < 3 && (
                                      <span className="text-xl">
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xl">{stat.expertEmoji}</span>
                                      <span className="text-white font-medium">{stat.expertName}</span>
                                      {!hasData && (
                                        <span className="ml-2 px-2 py-0.5 bg-slate-600/50 text-slate-400 text-xs rounded">거래없음</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 text-center text-slate-200 font-bold text-lg">
                                    {hasData ? stat.trades : '-'}
                                  </td>
                                  <td className="py-3 text-center text-base">
                                    {hasData ? (
                                      <>
                                        <span className="text-green-400 font-bold">{stat.wins}</span>
                                        <span className="text-slate-600 mx-1">/</span>
                                        <span className="text-red-400 font-bold">{stat.losses}</span>
                                      </>
                                    ) : (
                                      <span className="text-slate-500">-</span>
                                    )}
                                  </td>
                                  <td className="py-3 text-center">
                                    {hasData ? (
                                      <span className={`px-2 py-1 rounded-lg font-bold text-sm ${
                                        (stat.wins / stat.trades * 100) >= 60 ? 'bg-green-500/30 text-green-300' :
                                        (stat.wins / stat.trades * 100) >= 50 ? 'bg-yellow-500/30 text-yellow-300' :
                                        'bg-red-500/30 text-red-300'
                                      }`}>
                                        {((stat.wins / stat.trades) * 100).toFixed(0)}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">-</span>
                                    )}
                                  </td>
                                  <td className={`py-3 text-right font-bold text-lg ${
                                    hasData ? (stat.totalProfit >= 0 ? 'text-green-400' : 'text-red-400') : 'text-slate-500'
                                  }`}>
                                    {hasData ? `${stat.totalProfit >= 0 ? '+' : ''}$${(stat.totalProfit / 1000).toFixed(1)}K` : '-'}
                                  </td>
                                  <td className={`py-3 text-right font-semibold ${
                                    hasData ? (stat.avgProfitPercent >= 0 ? 'text-green-400' : 'text-red-400') : 'text-slate-500'
                                  }`}>
                                    {hasData ? `${stat.avgProfitPercent >= 0 ? '+' : ''}${stat.avgProfitPercent.toFixed(2)}%` : '-'}
                                  </td>
                                  <td className={`py-3 text-right font-semibold ${hasData ? 'text-green-400' : 'text-slate-500'}`}>
                                    {hasData ? `+${stat.bestTradePercent.toFixed(2)}%` : '-'}
                                  </td>
                                  <td className={`py-3 text-right font-semibold ${hasData ? 'text-red-400' : 'text-slate-500'}`}>
                                    {hasData ? `${stat.worstTradePercent.toFixed(2)}%` : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                });
              })()}

              {dailyStats.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  선택한 기간에 거래 내역이 없습니다
                </div>
              )}
            </div>
          )}

          {/* 모델별 분석 탭 */}
          {activeTab === 'model' && (
            <div className="space-y-6">
              {/* 모델별 요약 테이블 */}
              <div className="overflow-x-auto bg-slate-800/30 rounded-lg p-6">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="text-left text-slate-300 border-b-2 border-slate-600">
                      <th className="pb-4 text-base font-bold">모델</th>
                      <th className="pb-4 text-center text-base font-bold">거래수</th>
                      <th className="pb-4 text-center text-base font-bold">승률</th>
                      <th className="pb-4 text-right text-base font-bold">💰 총 수익금</th>
                      <th className="pb-4 text-center text-base font-bold">승/패</th>
                      <th className="pb-4 text-right text-sm">최고의 날</th>
                      <th className="pb-4 text-right text-sm">최악의 날</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelStats.sort((a, b) => b.totalProfitAmount - a.totalProfitAmount).map((model, index) => (
                      <tr key={model.expertId} className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${index < 3 ? 'bg-blue-900/10' : ''}`}>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <span className="text-yellow-400 font-bold text-sm">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                              </span>
                            )}
                            <span className="text-2xl">{model.expertEmoji}</span>
                            <span className="text-white font-semibold text-base">{model.expertName}</span>
                          </div>
                        </td>
                        <td className="py-4 text-center text-slate-200 font-bold text-lg">
                          {model.totalTrades}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`px-3 py-1.5 rounded-lg font-bold text-base ${
                            model.winRate >= 60 ? 'bg-green-500/30 border border-green-400 text-green-300' :
                            model.winRate >= 50 ? 'bg-yellow-500/30 border border-yellow-400 text-yellow-300' :
                            'bg-red-500/30 border border-red-400 text-red-300'
                          }`}>
                            {model.winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className={`py-4 text-right font-black text-2xl ${
                          model.totalProfitAmount >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {model.totalProfitAmount >= 0 ? '+' : ''}${(model.totalProfitAmount / 1000000).toFixed(2)}M
                        </td>
                        <td className="py-4 text-center text-base">
                          <span className="text-green-400 font-bold">{model.totalWins}</span>
                          <span className="text-slate-600 mx-1">/</span>
                          <span className="text-red-400 font-bold">{model.totalLosses}</span>
                        </td>
                        <td className="py-4 text-right">
                          {model.bestDay && (
                            <div>
                              <div className="text-green-400 font-bold text-base">
                                +${(model.bestDay.totalProfit / 1000).toFixed(1)}K
                              </div>
                              <div className="text-slate-500 text-xs mt-0.5">
                                {new Date(model.bestDay.date.endsWith('Z') ? model.bestDay.date : `${model.bestDay.date}Z`).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' })}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {model.worstDay && (
                            <div>
                              <div className="text-red-400 font-bold text-base">
                                ${(model.worstDay.totalProfit / 1000).toFixed(1)}K
                              </div>
                              <div className="text-slate-500 text-xs mt-0.5">
                                {new Date(model.worstDay.date.endsWith('Z') ? model.worstDay.date : `${model.worstDay.date}Z`).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' })}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 일별 수익금 히트맵 */}
              <div className="bg-slate-800/30 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-6">💰 일별 수익금 한눈에 보기</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-slate-300">
                        <th className="pb-4 text-left sticky left-0 bg-slate-800/30 text-base font-bold">모델</th>
                        {Array.from(new Set(dailyStats.map(s => s.date))).sort().map(date => (
                          <th key={date} className="pb-4 text-center px-3 min-w-[100px] text-base font-semibold">
                            {new Date(date.endsWith('Z') ? date : `${date}Z`).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {modelStats.map(model => (
                        <tr key={model.expertId} className="border-t border-slate-700/50">
                          <td className="py-3 sticky left-0 bg-slate-800/30">
                            <span className="text-xl mr-2">{model.expertEmoji}</span>
                            <span className="text-white text-sm font-medium">{model.expertName}</span>
                          </td>
                          {Array.from(new Set(dailyStats.map(s => s.date))).sort().map(date => {
                            const dayStat = model.dailyData.find(d => d.date === date);
                            if (!dayStat) {
                              return (
                                <td key={date} className="py-3 px-3 text-center">
                                  <div className="bg-slate-700/30 rounded-lg px-3 py-2 text-slate-500 text-sm">-</div>
                                </td>
                              );
                            }
                            const profit = dayStat.totalProfit;
                            const profitK = profit / 1000;
                            const bgColor = profit > 1000000 ? 'bg-green-500/50 border-2 border-green-400 text-green-200' :
                                           profit > 0 ? 'bg-green-500/30 border border-green-500/50 text-green-300' :
                                           profit > -1000000 ? 'bg-red-500/30 border border-red-500/50 text-red-300' :
                                           'bg-red-500/50 border-2 border-red-400 text-red-200';
                            return (
                              <td key={date} className="py-3 px-3 text-center">
                                <div className={`rounded-lg px-3 py-2 font-bold ${bgColor}`}>
                                  <div className="text-base">
                                    {profit >= 0 ? '+' : ''}{profitK >= 1000 || profitK <= -1000 ? `$${(profitK / 1000).toFixed(1)}M` : `$${profitK.toFixed(0)}K`}
                                  </div>
                                  <div className="text-xs opacity-75 mt-0.5">
                                    {dayStat.avgProfitPercent >= 0 ? '+' : ''}{dayStat.avgProfitPercent.toFixed(1)}%
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 flex items-center gap-6 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500/50 border-2 border-green-400 rounded"></div>
                    <span className="font-medium">&gt;$1M 대박</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500/30 border border-green-500/50 rounded"></div>
                    <span>수익</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-500/30 border border-red-500/50 rounded"></div>
                    <span>손실</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-500/50 border-2 border-red-400 rounded"></div>
                    <span className="font-medium">&gt;$1M 손실</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 전체 거래 내역 */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">📋 전체 거래 내역</h2>

          {loading ? (
            <div className="text-center py-12 text-slate-400">로딩 중...</div>
          ) : allTrades.length === 0 ? (
            <div className="text-center py-12 text-slate-400">거래 내역이 없습니다</div>
          ) : (
            <>
              {/* 날짜별 거래 내역 */}
              {(() => {
                // 날짜별로 그룹화 (KST 날짜 기준)
                const tradesByDate: { [key: string]: typeof allTrades } = {};
                allTrades.forEach(trade => {
                  // UTC 시간을 KST로 변환하여 날짜 추출
                  const exitDate = new Date(trade.exitTime.endsWith('Z') ? trade.exitTime : `${trade.exitTime}Z`);
                  // KST 날짜 문자열 생성 (년월일만)
                  const dateKey = exitDate.toLocaleDateString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  if (!tradesByDate[dateKey]) {
                    tradesByDate[dateKey] = [];
                  }
                  tradesByDate[dateKey].push(trade);
                });

                return Object.entries(tradesByDate).map(([date, trades]) => (
                  <div key={date} className="mb-6 last:mb-0">
                    {/* 날짜 헤더 */}
                    <div className="bg-slate-800/50 px-4 py-2 rounded-lg mb-3 border border-slate-700">
                      <h3 className="text-lg font-semibold text-blue-400">📅 {date}</h3>
                      <p className="text-sm text-slate-400 mt-1">총 {trades.length}건의 거래</p>
                    </div>

                    {/* 해당 날짜의 거래 테이블 */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm min-w-[1000px]">
                        <thead>
                          <tr className="text-left text-slate-400 border-b border-slate-700">
                            <th className="pb-3">트레이더</th>
                            <th className="pb-3 text-center">포지션</th>
                            <th className="pb-3">진입</th>
                            <th className="pb-3">청산</th>
                            <th className="pb-3 text-right">진입가</th>
                            <th className="pb-3 text-right">청산가</th>
                            <th className="pb-3 text-center">보유시간</th>
                            <th className="pb-3 text-right">수익률</th>
                            <th className="pb-3 text-right">수익금</th>
                            <th className="pb-3">청산사유</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trades.map((trade) => (
                            <tr key={trade.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                              <td className="py-3">
                                <span className="text-lg mr-2">{trade.expertEmoji}</span>
                                <span className="text-white">{trade.expertName}</span>
                              </td>
                              <td className="py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  trade.position === 'long'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {trade.position === 'long' ? '↗ LONG' : '↘ SHORT'}
                                </span>
                              </td>
                              <td className="py-3 text-slate-300">
                                {formatToKST(trade.entryTime)}
                              </td>
                              <td className="py-3 text-slate-300">
                                {formatToKST(trade.exitTime)}
                              </td>
                              <td className="py-3 text-right text-slate-300">
                                ${trade.entryPrice.toFixed(2)}
                              </td>
                              <td className="py-3 text-right text-slate-300">
                                ${trade.exitPrice.toFixed(2)}
                              </td>
                              <td className="py-3 text-center text-slate-300">
                                {trade.holdDurationMinutes}분
                              </td>
                              <td className={`py-3 text-right font-bold ${
                                trade.leveragedProfitPercent >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {trade.leveragedProfitPercent >= 0 ? '+' : ''}
                                {trade.leveragedProfitPercent.toFixed(2)}%
                              </td>
                              <td className={`py-3 text-right font-semibold ${
                                trade.profitAmount >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {trade.profitAmount >= 0 ? '+' : ''}
                                ${trade.profitAmount.toFixed(2)}
                              </td>
                              <td className="py-3 text-slate-400 text-xs">
                                {trade.exitReason}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ));
              })()}

              {/* 페이지네이션 */}
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
                >
                  이전
                </button>
                <span className="text-slate-300">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700"
                >
                  다음
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
