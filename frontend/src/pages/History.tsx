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

// UTC 시간을 UTC 타임존 그대로 표시하는 유틸리티 함수
const formatToUTC = (utcTimeStr: string, format: 'full' | 'short' = 'full') => {
  // UTC 시간 문자열에 'Z'를 추가하여 UTC임을 명시
  const date = new Date(utcTimeStr.endsWith('Z') ? utcTimeStr : `${utcTimeStr}Z`);

  if (format === 'short') {
    return date.toLocaleDateString('ko-KR', {
      timeZone: 'UTC',
      month: 'short',
      day: 'numeric',
      hour: '2-digit'
    });
  }

  return date.toLocaleString('ko-KR', {
    timeZone: 'UTC',
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
        const data = await arenaApi.getPerformance(coin, selectedExpert);

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
  }, [coin, selectedExpert]);

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
            <h2 className="text-xl font-bold text-white">📅 일별 성과 통계</h2>

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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                  <th className="pb-3">날짜</th>
                  <th className="pb-3">트레이더</th>
                  <th className="pb-3 text-center">거래</th>
                  <th className="pb-3 text-center">승</th>
                  <th className="pb-3 text-center">패</th>
                  <th className="pb-3 text-right">총 수익</th>
                  <th className="pb-3 text-right">평균 수익률</th>
                  <th className="pb-3 text-right">최고</th>
                  <th className="pb-3 text-right">최악</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((stat, index) => (
                  <tr key={index} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="py-3 text-slate-300">
                      {new Date(stat.date.endsWith('Z') ? stat.date : `${stat.date}Z`).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    </td>
                    <td className="py-3">
                      <span className="text-lg mr-2">{stat.expertEmoji}</span>
                      <span className="text-white font-medium">{stat.expertName}</span>
                    </td>
                    <td className="py-3 text-center text-slate-300">{stat.trades}</td>
                    <td className="py-3 text-center text-green-400">{stat.wins}</td>
                    <td className="py-3 text-center text-red-400">{stat.losses}</td>
                    <td className={`py-3 text-right font-semibold ${
                      stat.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${stat.totalProfit.toFixed(2)}
                    </td>
                    <td className={`py-3 text-right ${
                      stat.avgProfitPercent >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {stat.avgProfitPercent.toFixed(2)}%
                    </td>
                    <td className="py-3 text-right text-green-400">
                      +{stat.bestTradePercent.toFixed(2)}%
                    </td>
                    <td className="py-3 text-right text-red-400">
                      {stat.worstTradePercent.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
