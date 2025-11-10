// 전역 변수
let priceChart = null;
let currentCoin = 'btc';
let priceData = {
    btc: { history: [], labels: [] },
    eth: { history: [], labels: [] }
};

// ⚙️ Cloudflare Workers API 설정
const WORKERS_API_URL = 'https://crypto-analysis-api.granadu91.workers.dev';
// 로컬 개발: const WORKERS_API_URL = 'http://localhost:8787';

// 🌐 API 호출 함수
async function fetchExpertStats() {
    try {
        const response = await fetch(`${WORKERS_API_URL}/api/ai/experts`);
        if (!response.ok) throw new Error('Failed to fetch expert stats');
        const data = await response.json();
        return data.experts;
    } catch (error) {
        console.error('❌ 전문가 통계 조회 실패:', error);
        return [];
    }
}

async function fetchExpertPredictions(coin, timeframe, limit = 10) {
    try {
        const response = await fetch(`${WORKERS_API_URL}/api/ai/predictions?coin=${coin}&timeframe=${timeframe}&limit=${limit}`);
        if (!response.ok) throw new Error('Failed to fetch predictions');
        const data = await response.json();
        return data.predictions;
    } catch (error) {
        console.error('❌ 예측 조회 실패:', error);
        return [];
    }
}

async function fetchConsensus(coin, timeframe) {
    try {
        const response = await fetch(`${WORKERS_API_URL}/api/ai/consensus?coin=${coin}&timeframe=${timeframe}`);
        if (!response.ok) throw new Error('Failed to fetch consensus');
        const data = await response.json();
        return data.consensus;
    } catch (error) {
        console.error('❌ 컨센서스 조회 실패:', error);
        return null;
    }
}

// 백테스팅 시스템 변수
let signalHistory = []; // 신호 히스토리
let signalStats = {
    total: 0,
    success: 0,
    fail: 0,
    pending: 0,
    successRate: 0
};

// 🤖 10명의 AI 전문가 시스템
let expertProfiles = [
    {
        id: 1,
        name: 'RSI 전문가',
        strategy: 'RSI 과매수/과매도 중심',
        emoji: '📊',
        weights: {
            '5m': {
                rsi: 0.50,
                macd: 0.70,
                bollinger: 0.40,
                funding: 0.60,
                volume: 0.80,
                trend: 0.20,
                fearGreed: 0.10
            },
            '10m': {
                rsi: 0.70,
                macd: 0.65,
                bollinger: 0.50,
                funding: 0.50,
                volume: 0.60,
                trend: 0.40,
                fearGreed: 0.15
            },
            '30m': {
                rsi: 0.85,
                macd: 0.50,
                bollinger: 0.60,
                funding: 0.40,
                volume: 0.50,
                trend: 0.55,
                fearGreed: 0.20
            },
            '1h': {
                rsi: 0.80,
                macd: 0.45,
                bollinger: 0.55,
                funding: 0.30,
                volume: 0.40,
                trend: 0.70,
                fearGreed: 0.25
            }
        }
    },
    {
        id: 2,
        name: 'MACD 전문가',
        strategy: 'MACD 모멘텀 중심',
        emoji: '📈',
        weights: {
            '5m': {
                rsi: 0.40,
                macd: 0.90,
                bollinger: 0.50,
                funding: 0.60,
                volume: 0.85,
                trend: 0.35,
                fearGreed: 0.10
            },
            '10m': {
                rsi: 0.45,
                macd: 0.85,
                bollinger: 0.55,
                funding: 0.50,
                volume: 0.70,
                trend: 0.50,
                fearGreed: 0.15
            },
            '30m': {
                rsi: 0.50,
                macd: 0.75,
                bollinger: 0.60,
                funding: 0.40,
                volume: 0.60,
                trend: 0.65,
                fearGreed: 0.20
            },
            '1h': {
                rsi: 0.50,
                macd: 0.70,
                bollinger: 0.55,
                funding: 0.30,
                volume: 0.50,
                trend: 0.75,
                fearGreed: 0.25
            }
        }
    },
    {
        id: 3,
        name: '볼린저 전문가',
        strategy: '볼린저 밴드 돌파 중심',
        emoji: '🎯',
        weights: {
            '5m': { rsi: 0.45, macd: 0.65, bollinger: 0.85, funding: 0.55, volume: 0.75, trend: 0.25, fearGreed: 0.10 },
            '10m': { rsi: 0.55, macd: 0.60, bollinger: 0.85, funding: 0.45, volume: 0.65, trend: 0.40, fearGreed: 0.15 },
            '30m': { rsi: 0.60, macd: 0.55, bollinger: 0.80, funding: 0.35, volume: 0.55, trend: 0.50, fearGreed: 0.20 },
            '1h': { rsi: 0.60, macd: 0.50, bollinger: 0.75, funding: 0.25, volume: 0.45, trend: 0.60, fearGreed: 0.25 }
        }
    },
    {
        id: 4,
        name: '펀딩 전문가',
        strategy: '선물 펀딩비율 중심',
        emoji: '💰',
        weights: {
            '5m': { rsi: 0.40, macd: 0.60, bollinger: 0.50, funding: 0.90, volume: 0.70, trend: 0.20, fearGreed: 0.10 },
            '10m': { rsi: 0.45, macd: 0.55, bollinger: 0.50, funding: 0.85, volume: 0.60, trend: 0.30, fearGreed: 0.15 },
            '30m': { rsi: 0.50, macd: 0.50, bollinger: 0.50, funding: 0.80, volume: 0.50, trend: 0.40, fearGreed: 0.20 },
            '1h': { rsi: 0.50, macd: 0.45, bollinger: 0.45, funding: 0.75, volume: 0.40, trend: 0.50, fearGreed: 0.25 }
        }
    },
    {
        id: 5,
        name: '거래량 전문가',
        strategy: '거래량 분석 중심',
        emoji: '📊',
        weights: {
            '5m': { rsi: 0.35, macd: 0.75, bollinger: 0.50, funding: 0.60, volume: 0.95, trend: 0.30, fearGreed: 0.10 },
            '10m': { rsi: 0.40, macd: 0.70, bollinger: 0.50, funding: 0.50, volume: 0.85, trend: 0.45, fearGreed: 0.15 },
            '30m': { rsi: 0.45, macd: 0.60, bollinger: 0.50, funding: 0.40, volume: 0.75, trend: 0.60, fearGreed: 0.20 },
            '1h': { rsi: 0.45, macd: 0.55, bollinger: 0.45, funding: 0.30, volume: 0.65, trend: 0.70, fearGreed: 0.25 }
        }
    },
    {
        id: 6,
        name: '균형형 전문가',
        strategy: '모든 지표 균등 분석',
        emoji: '⚖️',
        weights: {
            '5m': { rsi: 0.50, macd: 0.75, bollinger: 0.60, funding: 0.65, volume: 0.80, trend: 0.40, fearGreed: 0.25 },
            '10m': { rsi: 0.55, macd: 0.70, bollinger: 0.65, funding: 0.60, volume: 0.70, trend: 0.55, fearGreed: 0.30 },
            '30m': { rsi: 0.60, macd: 0.65, bollinger: 0.65, funding: 0.55, volume: 0.60, trend: 0.65, fearGreed: 0.35 },
            '1h': { rsi: 0.60, macd: 0.60, bollinger: 0.60, funding: 0.50, volume: 0.55, trend: 0.75, fearGreed: 0.40 }
        }
    },
    {
        id: 7,
        name: '단기 스캘퍼',
        strategy: 'MACD + 볼린저 단기',
        emoji: '⚡',
        weights: {
            '5m': { rsi: 0.45, macd: 0.90, bollinger: 0.85, funding: 0.75, volume: 0.85, trend: 0.20, fearGreed: 0.10 },
            '10m': { rsi: 0.50, macd: 0.85, bollinger: 0.80, funding: 0.65, volume: 0.70, trend: 0.35, fearGreed: 0.15 },
            '30m': { rsi: 0.55, macd: 0.75, bollinger: 0.75, funding: 0.55, volume: 0.60, trend: 0.45, fearGreed: 0.20 },
            '1h': { rsi: 0.55, macd: 0.70, bollinger: 0.70, funding: 0.45, volume: 0.50, trend: 0.55, fearGreed: 0.25 }
        }
    },
    {
        id: 8,
        name: '추세 추종가',
        strategy: '추세 + 거래량 중심',
        emoji: '🚀',
        weights: {
            '5m': { rsi: 0.35, macd: 0.70, bollinger: 0.40, funding: 0.50, volume: 0.85, trend: 0.60, fearGreed: 0.15 },
            '10m': { rsi: 0.40, macd: 0.65, bollinger: 0.45, funding: 0.40, volume: 0.75, trend: 0.75, fearGreed: 0.20 },
            '30m': { rsi: 0.45, macd: 0.60, bollinger: 0.45, funding: 0.30, volume: 0.65, trend: 0.85, fearGreed: 0.25 },
            '1h': { rsi: 0.45, macd: 0.55, bollinger: 0.40, funding: 0.20, volume: 0.60, trend: 0.90, fearGreed: 0.30 }
        }
    },
    {
        id: 9,
        name: '역추세 사냥꾼',
        strategy: '볼린저 + RSI 역추세',
        emoji: '🎣',
        weights: {
            '5m': { rsi: 0.60, macd: 0.55, bollinger: 0.85, funding: 0.50, volume: 0.65, trend: 0.25, fearGreed: 0.15 },
            '10m': { rsi: 0.70, macd: 0.50, bollinger: 0.85, funding: 0.40, volume: 0.55, trend: 0.30, fearGreed: 0.20 },
            '30m': { rsi: 0.80, macd: 0.45, bollinger: 0.80, funding: 0.30, volume: 0.45, trend: 0.35, fearGreed: 0.25 },
            '1h': { rsi: 0.75, macd: 0.40, bollinger: 0.75, funding: 0.20, volume: 0.40, trend: 0.40, fearGreed: 0.30 }
        }
    },
    {
        id: 10,
        name: '펀딩+고래 추적가',
        strategy: '펀딩비율 + 고래움직임',
        emoji: '🐋',
        weights: {
            '5m': { rsi: 0.35, macd: 0.60, bollinger: 0.50, funding: 0.90, volume: 0.85, trend: 0.30, fearGreed: 0.20 },
            '10m': { rsi: 0.40, macd: 0.55, bollinger: 0.50, funding: 0.85, volume: 0.75, trend: 0.40, fearGreed: 0.25 },
            '30m': { rsi: 0.45, macd: 0.50, bollinger: 0.50, funding: 0.80, volume: 0.65, trend: 0.50, fearGreed: 0.30 },
            '1h': { rsi: 0.45, macd: 0.45, bollinger: 0.45, funding: 0.75, volume: 0.60, trend: 0.60, fearGreed: 0.35 }
        }
    }
];

// 전문가별 예측 기록
let expertTestHistory = [];

// 전문가별 통계
let expertStats = {};

// 전문가 통계 초기화
function initExpertStats() {
    expertProfiles.forEach(expert => {
        // 🎯 Phase 2-1: 신뢰도 임계값 초기화
        if (!expert.confidenceThreshold) {
            expert.confidenceThreshold = {
                '5m': 0.55,   // 5분은 55% 이상 신뢰도 필요
                '10m': 0.50,  // 10분은 50% 이상
                '30m': 0.45,  // 30분은 45% 이상
                '1h': 0.40    // 1시간은 40% 이상
            };
        }

        // 🎯 Phase 2-2: 최근 성과 트래킹 (신뢰도 조정용)
        if (!expert.recentPerformance) {
            expert.recentPerformance = {
                '5m': [],  // 최근 10개 결과 (true/false)
                '10m': [],
                '30m': [],
                '1h': []
            };
        }

        expertStats[expert.id] = {
            total: 0,
            success: 0,
            fail: 0,
            pending: 0,
            successRate: 0,
            byTimeframe: {
                '5m': { total: 0, success: 0, fail: 0, pending: 0, rate: 0 },
                '10m': { total: 0, success: 0, fail: 0, pending: 0, rate: 0 },
                '30m': { total: 0, success: 0, fail: 0, pending: 0, rate: 0 },
                '1h': { total: 0, success: 0, fail: 0, pending: 0, rate: 0 }
            },
            byCoin: {
                'btc': { total: 0, success: 0, fail: 0, pending: 0, rate: 0 },
                'eth': { total: 0, success: 0, fail: 0, pending: 0, rate: 0 }
            },
            recentPredictions: [] // 최근 10개 예측
        };
    });
    loadExpertData();
}

// localStorage에서 전문가 데이터 로드
function loadExpertData() {
    try {
        const savedHistory = localStorage.getItem('expertTestHistory');
        const savedStats = localStorage.getItem('expertStats');
        const savedWeights = localStorage.getItem('expertWeights');

        if (savedHistory) {
            expertTestHistory = JSON.parse(savedHistory);
        }
        if (savedStats) {
            const loaded = JSON.parse(savedStats);
            // 기존 구조와 병합
            Object.keys(loaded).forEach(expertId => {
                if (expertStats[expertId]) {
                    expertStats[expertId] = { ...expertStats[expertId], ...loaded[expertId] };
                }
            });
        }
        if (savedWeights) {
            const loaded = JSON.parse(savedWeights);
            // 학습된 가중치 복원
            expertProfiles.forEach(expert => {
                if (loaded[expert.id]) {
                    expert.weights = { ...expert.weights, ...loaded[expert.id] };
                }
            });
        }

        console.log('✅ 전문가 데이터 로드 완료:', {
            historyCount: expertTestHistory.length,
            statsCount: Object.keys(expertStats).length
        });
    } catch (error) {
        console.error('❌ 전문가 데이터 로드 실패:', error);
    }
}

// localStorage에 전문가 데이터 저장
function saveExpertData() {
    try {
        // 최근 1000개만 저장 (용량 관리)
        const historyToSave = expertTestHistory.slice(0, 1000);
        localStorage.setItem('expertTestHistory', JSON.stringify(historyToSave));
        localStorage.setItem('expertStats', JSON.stringify(expertStats));

        // 가중치만 별도 저장
        const weights = {};
        expertProfiles.forEach(expert => {
            weights[expert.id] = expert.weights;
        });
        localStorage.setItem('expertWeights', JSON.stringify(weights));
    } catch (error) {
        console.error('❌ 전문가 데이터 저장 실패:', error);
    }
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 암호화폐 대시보드 시작');
    initChart();
    initCoinSelector();
    fetchPrices();
    fetchFearGreed();
    fetchNews();

    // 이벤트 시스템 시작
    startEventMonitoring();

    // 샘플 이벤트 생성 (데모용)
    createSampleEvents();

    // 이벤트 타임라인 렌더링
    renderEventsList();

    // CoinGecko 데이터 가져오기
    fetchCoinGeckoData();

    // 트렌딩 코인 가져오기
    fetchTrendingCoins();

    // 10초마다 가격 업데이트
    setInterval(fetchPrices, 10000);

    // 1시간마다 공포-탐욕 지수 업데이트
    setInterval(fetchFearGreed, 3600000);

    // 5분마다 뉴스 업데이트
    setInterval(fetchNews, 300000);

    // 30초마다 이벤트 타임라인 업데이트
    setInterval(renderEventsList, 30000);

    // 10분마다 CoinGecko 데이터 업데이트
    setInterval(fetchCoinGeckoData, 600000);

    // 30분마다 트렌딩 코인 업데이트
    setInterval(fetchTrendingCoins, 1800000);

    // 가격 알림 시스템 초기화
    initPriceAlerts();

    // 매매 신호 시스템 초기화
    initTradingSignals();

    // 포지션 계산기 초기화
    initPositionCalculator();

    // 고래 움직임 추적 초기화
    initWhaleTracking();

    // 백테스팅 시스템 초기화
    initBacktestingSystem();

    // 🤖 AI 전문가 시스템 초기화
    initExpertStats();

    // 페이지 탭 시스템 초기화
    initPageTabs();

    // 전문가 성적표 대시보드 초기화
    initStatsDashboard();
});

// Chart.js 초기화
function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '가격 (USDT)',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#334155',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        maxTicksLimit: 8
                    }
                },
                y: {
                    grid: {
                        color: '#334155',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// 코인 선택 버튼
function initCoinSelector() {
    const buttons = document.querySelectorAll('.coin-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCoin = btn.dataset.coin;
            updateChart();
        });
    });
}

// 바이낸스 선물 API에서 가격 가져오기
async function fetchPrices() {
    try {
        // 바이낸스 선물 24시간 티커 API
        const btcResponse = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT');
        const ethResponse = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=ETHUSDT');

        const btcData = await btcResponse.json();
        const ethData = await ethResponse.json();

        if (btcData && ethData) {
            // 바이낸스 데이터를 Upbit 형식으로 변환
            const btcFormatted = {
                trade_price: parseFloat(btcData.lastPrice),
                signed_change_price: parseFloat(btcData.priceChange),
                signed_change_rate: parseFloat(btcData.priceChangePercent) / 100,
                high_price: parseFloat(btcData.highPrice),
                low_price: parseFloat(btcData.lowPrice),
                acc_trade_volume_24h: parseFloat(btcData.volume)
            };

            const ethFormatted = {
                trade_price: parseFloat(ethData.lastPrice),
                signed_change_price: parseFloat(ethData.priceChange),
                signed_change_rate: parseFloat(ethData.priceChangePercent) / 100,
                high_price: parseFloat(ethData.highPrice),
                low_price: parseFloat(ethData.lowPrice),
                acc_trade_volume_24h: parseFloat(ethData.volume)
            };

            updatePriceDisplay('btc', btcFormatted);
            updatePriceDisplay('eth', ethFormatted);

            // 차트 데이터 업데이트
            updatePriceHistory('btc', btcFormatted.trade_price);
            updatePriceHistory('eth', ethFormatted.trade_price);

            // 기술적 분석 업데이트
            updateTechnicalAnalysis();

            // 마지막 업데이트 시간
            updateLastUpdateTime();

            // 가격 알림 체크
            checkPriceAlerts();

            // 알림 UI 업데이트 (현재 가격 표시)
            renderAlerts();
        }
    } catch (error) {
        console.error('가격 가져오기 실패:', error);
    }
}

// 가격 표시 업데이트
function updatePriceDisplay(coin, data) {
    const price = data.trade_price;
    const change = data.signed_change_rate * 100;
    const changePrice = data.signed_change_price;
    const high = data.high_price;
    const low = data.low_price;
    const volume = data.acc_trade_volume_24h;

    // USDT 가격 표시 (바이낸스 선물)
    document.getElementById(`${coin}-price`).textContent =
        `$${price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    const changeEl = document.getElementById(`${coin}-change`);
    changeEl.textContent =
        `${change > 0 ? '+' : ''}${change.toFixed(2)}% ($${changePrice > 0 ? '+' : ''}${changePrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})})`;
    changeEl.className = `price-change ${change > 0 ? 'positive' : 'negative'}`;

    document.getElementById(`${coin}-high`).textContent =
        `$${high.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById(`${coin}-low`).textContent =
        `$${low.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    document.getElementById(`${coin}-volume`).textContent =
        `${volume.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${coin.toUpperCase()}`;
}

// 가격 히스토리 업데이트
function updatePriceHistory(coin, price) {
    const now = new Date();
    const timeLabel = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    priceData[coin].history.push(price);
    priceData[coin].labels.push(timeLabel);

    // 최대 60개 데이터 포인트만 유지 (10분)
    if (priceData[coin].history.length > 60) {
        priceData[coin].history.shift();
        priceData[coin].labels.shift();
    }

    updateChart();
}

// 차트 업데이트
function updateChart() {
    if (priceChart) {
        priceChart.data.labels = priceData[currentCoin].labels;
        priceChart.data.datasets[0].data = priceData[currentCoin].history;
        priceChart.data.datasets[0].label = `${currentCoin.toUpperCase()} 가격 (USDT)`;
        priceChart.update('none');
    }
}

// 기술적 분석 계산
function updateTechnicalAnalysis() {
    const btcPrices = priceData.btc.history;
    const ethPrices = priceData.eth.history;
    const analysisEl = document.getElementById('technical-analysis');

    // 기존 CoinGecko 시장 데이터 보존
    const existingMarketStats = analysisEl.querySelector('.market-stats');
    const marketStatsHtml = existingMarketStats ? existingMarketStats.outerHTML : '';

    if (btcPrices.length < 14) {
        analysisEl.innerHTML = '<div class="loading">데이터 수집 중... (최소 14개 데이터 포인트 필요)</div>' + marketStatsHtml;
        return;
    }

    // BTC 분석
    const btcRSI = calculateRSI(btcPrices, 14);
    const btcMA = calculateMA(btcPrices, 5);
    const btcTrend = btcPrices[btcPrices.length - 1] > btcMA ? 'bullish' : 'bearish';

    // ETH 분석
    const ethRSI = ethPrices.length >= 14 ? calculateRSI(ethPrices, 14) : null;
    const ethMA = ethPrices.length >= 5 ? calculateMA(ethPrices, 5) : null;
    const ethTrend = ethPrices.length >= 5 && ethPrices[ethPrices.length - 1] > ethMA ? 'bullish' : 'bearish';

    const html = `
        <div class="indicator">
            <span class="indicator-name">BTC RSI (14)</span>
            <span class="indicator-value ${getRSIClass(btcRSI)}">${btcRSI.toFixed(2)}</span>
        </div>
        <div class="indicator">
            <span class="indicator-name">BTC 추세 (MA5)</span>
            <span class="indicator-value ${btcTrend}">${btcTrend === 'bullish' ? '상승 🚀' : '하락 📉'}</span>
        </div>
        ${ethRSI ? `
        <div class="indicator">
            <span class="indicator-name">ETH RSI (14)</span>
            <span class="indicator-value ${getRSIClass(ethRSI)}">${ethRSI.toFixed(2)}</span>
        </div>
        ` : ''}
        ${ethTrend ? `
        <div class="indicator">
            <span class="indicator-name">ETH 추세 (MA5)</span>
            <span class="indicator-value ${ethTrend}">${ethTrend === 'bullish' ? '상승 🚀' : '하락 📉'}</span>
        </div>
        ` : ''}
        <div class="indicator">
            <span class="indicator-name">시장 심리</span>
            <span class="indicator-value ${getMarketSentiment(btcRSI)}">${getMarketSentimentText(btcRSI)}</span>
        </div>
    `;

    // 기술 지표와 CoinGecko 시장 데이터를 함께 표시
    analysisEl.innerHTML = html + marketStatsHtml;

    // 예측 업데이트
    updatePredictions(btcRSI, btcTrend, ethRSI, ethTrend);
}

// RSI 계산
function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
            gains += change;
        } else {
            losses += Math.abs(change);
        }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
}

// 이동평균 계산
function calculateMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];

    const slice = prices.slice(-period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
}

// 지수 이동평균 계산 (EMA)
function calculateEMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];

    const k = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }

    return ema;
}

// MACD 계산
function calculateMACD(prices) {
    if (prices.length < 26) {
        return { macd: 0, signal: 0, histogram: 0 };
    }

    // MACD Line = EMA(12) - EMA(26)
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;

    // Signal Line = EMA(9) of MACD
    // 간단화: 최근 9개 MACD 값의 평균 사용
    const signalLine = macdLine * 0.5; // 간단한 근사치

    // Histogram = MACD - Signal
    const histogram = macdLine - signalLine;

    return {
        macd: macdLine,
        signal: signalLine,
        histogram: histogram
    };
}

// 볼린저 밴드 계산
function calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) {
        const current = prices[prices.length - 1];
        return {
            upper: current * 1.02,
            middle: current,
            lower: current * 0.98
        };
    }

    const slice = prices.slice(-period);

    // 중간선 (MA)
    const middle = slice.reduce((a, b) => a + b, 0) / period;

    // 표준편차 계산
    const squaredDiffs = slice.map(price => Math.pow(price - middle, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const standardDeviation = Math.sqrt(variance);

    // 상단/하단 밴드
    const upper = middle + (stdDev * standardDeviation);
    const lower = middle - (stdDev * standardDeviation);

    return {
        upper: upper,
        middle: middle,
        lower: lower
    };
}

// RSI 클래스 결정
function getRSIClass(rsi) {
    if (rsi > 70) return 'bearish';
    if (rsi < 30) return 'bullish';
    return 'neutral';
}

// 시장 심리
function getMarketSentiment(rsi) {
    if (rsi > 70) return 'bearish';
    if (rsi < 30) return 'bullish';
    if (rsi > 55) return 'bullish';
    if (rsi < 45) return 'bearish';
    return 'neutral';
}

function getMarketSentimentText(rsi) {
    if (rsi > 70) return '과매수 ⚠️';
    if (rsi < 30) return '과매도 💚';
    if (rsi > 55) return '긍정적 😊';
    if (rsi < 45) return '부정적 😟';
    return '중립 😐';
}

// 예측 업데이트
function updatePredictions(btcRSI, btcTrend, ethRSI, ethTrend) {
    const btcDirection = btcRSI < 30 ? 'bullish' : btcRSI > 70 ? 'bearish' : btcTrend;
    const btcConfidence = Math.abs(btcRSI - 50) / 50 * 100;
    const btcReasoning = generateReasoning(btcRSI, btcTrend, 'BTC');

    let html = `
        <div class="prediction-item">
            <div class="prediction-header">
                <span class="prediction-symbol">BTC</span>
                <span class="prediction-direction ${btcDirection}">
                    ${btcDirection === 'bullish' ? '상승 예상 📈' : '하락 예상 📉'}
                </span>
            </div>
            <div class="prediction-confidence">신뢰도: ${btcConfidence.toFixed(0)}%</div>
            <div class="prediction-reasoning">${btcReasoning}</div>
        </div>
    `;

    if (ethRSI && ethTrend) {
        const ethDirection = ethRSI < 30 ? 'bullish' : ethRSI > 70 ? 'bearish' : ethTrend;
        const ethConfidence = Math.abs(ethRSI - 50) / 50 * 100;
        const ethReasoning = generateReasoning(ethRSI, ethTrend, 'ETH');

        html += `
            <div class="prediction-item">
                <div class="prediction-header">
                    <span class="prediction-symbol">ETH</span>
                    <span class="prediction-direction ${ethDirection}">
                        ${ethDirection === 'bullish' ? '상승 예상 📈' : '하락 예상 📉'}
                    </span>
                </div>
                <div class="prediction-confidence">신뢰도: ${ethConfidence.toFixed(0)}%</div>
                <div class="prediction-reasoning">${ethReasoning}</div>
            </div>
        `;
    }

    document.getElementById('predictions').innerHTML = html;
}

// 분석 이유 생성
function generateReasoning(rsi, trend, coin) {
    const reasons = [];

    if (rsi < 30) {
        reasons.push('RSI가 과매도 구간(30 이하)으로 반등 가능성');
    } else if (rsi > 70) {
        reasons.push('RSI가 과매수 구간(70 이상)으로 조정 가능성');
    } else if (rsi > 50) {
        reasons.push('RSI가 50 이상으로 긍정적 모멘텀');
    } else {
        reasons.push('RSI가 50 이하로 부정적 모멘텀');
    }

    if (trend === 'bullish') {
        reasons.push('5일 이동평균선 상향 돌파');
    } else {
        reasons.push('5일 이동평균선 하향 이탈');
    }

    return reasons.join(', ');
}

// 공포-탐욕 지수 가져오기
async function fetchFearGreed() {
    try {
        const response = await fetch('https://api.alternative.me/fng/?limit=10');
        const data = await response.json();

        if (data && data.data && data.data.length > 0) {
            const current = data.data[0];
            const value = parseInt(current.value);
            const classification = current.value_classification;

            // 지수 표시
            document.getElementById('fear-greed-value').textContent = value;
            document.getElementById('fear-greed-text').textContent = classification;

            // 색상 설정
            const valueEl = document.getElementById('fear-greed-value');
            if (value < 25) {
                valueEl.className = 'fear-greed-value extreme-fear';
            } else if (value < 45) {
                valueEl.className = 'fear-greed-value fear';
            } else if (value < 55) {
                valueEl.className = 'fear-greed-value neutral';
            } else if (value < 75) {
                valueEl.className = 'fear-greed-value greed';
            } else {
                valueEl.className = 'fear-greed-value extreme-greed';
            }

            // 히스토리 표시
            const historyHtml = data.data.slice(0, 7).map((item, index) => {
                const date = new Date(item.timestamp * 1000);
                const dateStr = index === 0 ? '오늘' :
                               index === 1 ? '어제' :
                               `${date.getMonth() + 1}/${date.getDate()}`;
                return `
                    <div class="fear-greed-history-item">
                        <span class="date">${dateStr}</span>
                        <span class="value ${getFearGreedClass(parseInt(item.value))}">${item.value}</span>
                    </div>
                `;
            }).join('');

            document.getElementById('fear-greed-history').innerHTML = historyHtml;

            // 이벤트 기록 - 현재 BTC 가격과 함께 저장
            const currentPrice = await getCurrentBTCPrice();
            if (currentPrice) {
                checkFearGreedChange(value, classification, currentPrice);
            }

            console.log('공포-탐욕 지수:', current);
        }
    } catch (error) {
        console.error('공포-탐욕 지수 가져오기 실패:', error);
        document.getElementById('fear-greed-value').textContent = '--';
        document.getElementById('fear-greed-text').textContent = '데이터 없음';
    }
}

function getFearGreedClass(value) {
    if (value < 25) return 'extreme-fear';
    if (value < 45) return 'fear';
    if (value < 55) return 'neutral';
    if (value < 75) return 'greed';
    return 'extreme-greed';
}

// 영어 텍스트를 한국어로 번역
async function translateToKorean(text) {
    try {
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ko`);
        const data = await response.json();

        if (data && data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
        return text; // 번역 실패 시 원문 반환
    } catch (error) {
        console.error('번역 실패:', error);
        return text; // 에러 시 원문 반환
    }
}

// 뉴스 가져오기 (자동 번역)
async function fetchNews() {
    try {
        // CryptoCompare 암호화폐 전문 뉴스 사용
        const response = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
        const data = await response.json();

        if (data && data.Data && data.Data.length > 0) {
            // 로딩 표시
            document.getElementById('news-list').innerHTML = '<div class="loading">뉴스 번역 중...</div>';

            // 뉴스 번역 및 표시
            const newsItems = data.Data.slice(0, 10);
            let newsHtml = '';

            for (let i = 0; i < newsItems.length; i++) {
                const news = newsItems[i];

                // 제목 번역
                const translatedTitle = await translateToKorean(news.title);

                const publishedDate = new Date(news.published_on * 1000);
                const now = new Date();
                const diffHours = Math.floor((now - publishedDate) / (1000 * 60 * 60));

                const timeText = diffHours < 1 ? '방금 전' :
                                diffHours < 24 ? `${diffHours}시간 전` :
                                `${Math.floor(diffHours / 24)}일 전`;

                newsHtml += `
                    <div class="news-item" onclick="window.open('${news.url}', '_blank')">
                        <div class="news-title">${translatedTitle}</div>
                        <div class="news-meta">
                            <span>📰 ${news.source}</span>
                            <span>⏰ ${timeText}</span>
                        </div>
                    </div>
                `;

                // 하나씩 번역할 때마다 UI 업데이트 (실시간 느낌)
                document.getElementById('news-list').innerHTML = newsHtml;
            }

            console.log('✅ 암호화폐 뉴스 번역 완료:', newsItems.length);
        }
    } catch (error) {
        console.error('❌ 뉴스 가져오기 실패:', error);

        // 백업: 영어 뉴스라도 보여주기
        try {
            const backupResponse = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN');
            const backupData = await backupResponse.json();

            if (backupData && backupData.Data && backupData.Data.length > 0) {
                const newsHtml = backupData.Data.slice(0, 10).map(news => {
                    const publishedDate = new Date(news.published_on * 1000);
                    const now = new Date();
                    const diffHours = Math.floor((now - publishedDate) / (1000 * 60 * 60));

                    const timeText = diffHours < 1 ? '방금 전' :
                                    diffHours < 24 ? `${diffHours}시간 전` :
                                    `${Math.floor(diffHours / 24)}일 전`;

                    return `
                        <div class="news-item" onclick="window.open('${news.url}', '_blank')">
                            <div class="news-title">${news.title} 🌐</div>
                            <div class="news-meta">
                                <span>${news.source}</span>
                                <span>${timeText}</span>
                            </div>
                        </div>
                    `;
                }).join('');

                document.getElementById('news-list').innerHTML = newsHtml;
                console.log('⚠️ 백업 뉴스(영어) 로딩됨');
            }
        } catch (backupError) {
            document.getElementById('news-list').innerHTML =
                '<div class="no-data">뉴스를 불러오는데 실패했습니다.</div>';
        }
    }
}

// 마지막 업데이트 시간
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR');
    document.getElementById('lastUpdate').textContent = timeString;
}

// ==================== 이벤트 타임라인 시스템 ====================

// 이벤트 목록 렌더링
function renderEventsList() {
    const events = getActiveEvents();

    if (events.length === 0) {
        document.getElementById('events-list').innerHTML = `
            <div class="empty-state">
                <p>📊 아직 기록된 이벤트가 없습니다</p>
                <p style="font-size: 0.9rem; color: #94a3b8; margin-top: 8px;">
                    공포-탐욕 지수가 극단적인 값(25 이하 또는 75 이상)에 도달하면<br>
                    자동으로 이벤트가 기록되고 타임라인 분석이 시작됩니다.
                </p>
            </div>
        `;
        return;
    }

    // 최신순으로 정렬
    events.sort((a, b) => b.timestamp - a.timestamp);

    const eventsHtml = events.map(event => {
        return createEventCard(event);
    }).join('');

    document.getElementById('events-list').innerHTML = eventsHtml;
}

// 이벤트 카드 생성
function createEventCard(event) {
    const eventDate = new Date(event.timestamp * 1000);
    const now = new Date();
    const hoursSince = (now - eventDate) / (1000 * 60 * 60);

    const timeText = hoursSince < 1 ? '방금 전' :
                    hoursSince < 24 ? `${Math.floor(hoursSince)}시간 전` :
                    `${Math.floor(hoursSince / 24)}일 전`;

    const statusIcon = event.status === 'completed' ? '✅' : '🔄';
    const statusText = event.status === 'completed' ? '분석 완료' : '진행 중';

    return `
        <div class="event-card" id="event-${event.id}">
            <div class="event-card-header">
                <div class="event-title">
                    <span class="event-icon">${getEventIcon(event.type)}</span>
                    <span>${event.title}</span>
                </div>
                <div class="event-status">
                    <span class="status-badge ${event.status}">${statusIcon} ${statusText}</span>
                    <span class="event-time">${timeText}</span>
                </div>
            </div>
            <div class="event-description">${event.description}</div>
            <div class="event-timeline-wrapper">
                ${renderEventTimeline(event.id)}
            </div>
        </div>
    `;
}

// 이벤트 타입별 아이콘
function getEventIcon(type) {
    const icons = {
        'fear_greed': '😨',
        'news': '📰',
        'whale': '🐋',
        'liquidation': '⚡'
    };
    return icons[type] || '📊';
}

// CoinGecko API로 BTC/ETH 상세 정보 가져오기
async function fetchCoinGeckoData() {
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=krw&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true'
        );

        if (!response.ok) throw new Error('CoinGecko API 오류');

        const data = await response.json();

        // 기술적 분석 섹션에 추가 정보 표시
        updateCoinGeckoInfo(data);

        // 글로벌 데이터도 가져오기
        fetchGlobalData();

    } catch (error) {
        console.error('CoinGecko 데이터 가져오기 실패:', error);
    }
}

// 글로벌 시장 데이터 가져오기 (BTC 도미넌스 등)
async function fetchGlobalData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/global');

        if (!response.ok) throw new Error('글로벌 데이터 API 오류');

        const data = await response.json();
        const globalData = data.data;

        // 시장 전망 섹션 업데이트
        updateMarketOverview(globalData);

    } catch (error) {
        console.error('글로벌 데이터 가져오기 실패:', error);
    }
}

// CoinGecko 정보를 기술적 분석 섹션에 추가
function updateCoinGeckoInfo(data) {
    const bitcoin = data.bitcoin;
    const ethereum = data.ethereum;

    const btcMarketCap = (bitcoin.krw_market_cap / 1e12).toFixed(2);
    const ethMarketCap = (ethereum.krw_market_cap / 1e12).toFixed(2);
    const btcVolume = (bitcoin.krw_24h_vol / 1e12).toFixed(2);
    const ethVolume = (ethereum.krw_24h_vol / 1e12).toFixed(2);

    // 기존 기술적 분석 정보에 추가
    const analysisEl = document.getElementById('technical-analysis');
    const currentHtml = analysisEl.innerHTML;

    // 이미 시장 데이터가 있으면 추가하지 않음
    if (!currentHtml.includes('market-stats')) {
        const additionalInfo = `
            <div class="market-stats" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #334155;">
                <h4 style="color: #60a5fa; font-size: 0.9rem; margin-bottom: 12px;">📊 BTC/ETH 시장 데이터</h4>
                <div class="indicator">
                    <span class="indicator-name">BTC 시가총액</span>
                    <span class="indicator-value">₩${btcMarketCap}조</span>
                </div>
                <div class="indicator">
                    <span class="indicator-name">BTC 24h 거래량</span>
                    <span class="indicator-value">₩${btcVolume}조</span>
                </div>
                <div class="indicator">
                    <span class="indicator-name">ETH 시가총액</span>
                    <span class="indicator-value">₩${ethMarketCap}조</span>
                </div>
                <div class="indicator">
                    <span class="indicator-name">ETH 24h 거래량</span>
                    <span class="indicator-value">₩${ethVolume}조</span>
                </div>
            </div>
        `;

        analysisEl.innerHTML = currentHtml + additionalInfo;
    }
}

// 시장 전망에 글로벌 데이터 추가
function updateMarketOverview(globalData) {
    const btcDominance = globalData.market_cap_percentage.btc.toFixed(1);
    const ethDominance = globalData.market_cap_percentage.eth.toFixed(1);
    const totalMarketCap = (globalData.total_market_cap.usd / 1e12).toFixed(2);
    const marketChange = globalData.market_cap_change_percentage_24h_usd.toFixed(2);

    const predictionsEl = document.getElementById('predictions');
    const currentHtml = predictionsEl.innerHTML;

    // 글로벌 정보가 없으면 추가
    if (!currentHtml.includes('market-overview')) {
        const globalInfo = `
            <div class="market-overview" style="margin-top: 20px; padding: 16px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px;">
                <h4 style="color: #60a5fa; font-size: 0.9rem; margin-bottom: 12px;">🌐 글로벌 시장 현황</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 0.85rem;">
                    <div>
                        <div style="color: #94a3b8; margin-bottom: 4px;">전체 시가총액</div>
                        <div style="color: #e2e8f0; font-weight: 600;">$${totalMarketCap}T</div>
                    </div>
                    <div>
                        <div style="color: #94a3b8; margin-bottom: 4px;">24h 변화율</div>
                        <div style="color: ${marketChange >= 0 ? '#22c55e' : '#ef4444'}; font-weight: 600;">
                            ${marketChange >= 0 ? '+' : ''}${marketChange}%
                        </div>
                    </div>
                    <div>
                        <div style="color: #94a3b8; margin-bottom: 4px;">BTC 도미넌스</div>
                        <div style="color: #e2e8f0; font-weight: 600;">${btcDominance}%</div>
                    </div>
                    <div>
                        <div style="color: #94a3b8; margin-bottom: 4px;">ETH 도미넌스</div>
                        <div style="color: #e2e8f0; font-weight: 600;">${ethDominance}%</div>
                    </div>
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(59, 130, 246, 0.2); color: #cbd5e1; font-size: 0.8rem;">
                    💡 BTC 도미넌스가 높을수록 비트코인이 시장을 주도하고 있다는 의미입니다.
                </div>
            </div>
        `;

        predictionsEl.innerHTML = currentHtml + globalInfo;
    }
}

// 샘플 이벤트 생성 (데모용)
function createSampleEvents() {
    // 이미 샘플이 있으면 생성하지 않음
    const existingEvents = getEvents();
    if (existingEvents.length > 0) {
        console.log('기존 이벤트가 있어 샘플 생성을 건너뜁니다.');
        return;
    }

    console.log('📝 샘플 이벤트 생성 중...');

    const now = Date.now();
    const currentPrice = 55000000; // 샘플 가격

    // 샘플 1: 7일 전 극단적 공포 (성공 케이스)
    const sample1 = {
        id: `fear_greed_sample_1`,
        type: 'fear_greed',
        title: '공포-탐욕 지수 22',
        description: 'Extreme Fear',
        value: 22,
        timestamp: Math.floor((now - 7 * 24 * 60 * 60 * 1000) / 1000),
        price_at_event: 52000000,
        timeline: [
            {
                type: '1h',
                timestamp: Math.floor((now - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000) / 1000),
                price: 52520000,
                change_percent: 1.0,
                change_amount: 520000,
                success: true
            },
            {
                type: '24h',
                timestamp: Math.floor((now - 6 * 24 * 60 * 60 * 1000) / 1000),
                price: 54080000,
                change_percent: 4.0,
                change_amount: 2080000,
                success: true
            },
            {
                type: '7d',
                timestamp: Math.floor(now / 1000),
                price: 55640000,
                change_percent: 7.0,
                change_amount: 3640000,
                success: true
            }
        ],
        status: 'completed'
    };

    // 샘플 2: 3일 전 극단적 탐욕 (실패 케이스)
    const sample2 = {
        id: `fear_greed_sample_2`,
        type: 'fear_greed',
        title: '공포-탐욕 지수 78',
        description: 'Extreme Greed',
        value: 78,
        timestamp: Math.floor((now - 3 * 24 * 60 * 60 * 1000) / 1000),
        price_at_event: 58000000,
        timeline: [
            {
                type: '1h',
                timestamp: Math.floor((now - 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000) / 1000),
                price: 57420000,
                change_percent: -1.0,
                change_amount: -580000,
                success: false
            },
            {
                type: '24h',
                timestamp: Math.floor((now - 2 * 24 * 60 * 60 * 1000) / 1000),
                price: 55680000,
                change_percent: -4.0,
                change_amount: -2320000,
                success: false
            },
            {
                type: '7d',
                timestamp: Math.floor(now / 1000),
                price: 54500000,
                change_percent: -6.0,
                change_amount: -3500000,
                success: false
            }
        ],
        status: 'completed'
    };

    // 샘플 3: 1일 전 공포 (진행 중)
    const sample3 = {
        id: `fear_greed_sample_3`,
        type: 'fear_greed',
        title: '공포-탐욕 지수 28',
        description: 'Fear',
        value: 28,
        timestamp: Math.floor((now - 25 * 60 * 60 * 1000) / 1000),
        price_at_event: 54500000,
        timeline: [
            {
                type: '1h',
                timestamp: Math.floor((now - 24 * 60 * 60 * 1000) / 1000),
                price: 54818000,
                change_percent: 0.58,
                change_amount: 318000,
                success: true
            },
            {
                type: '24h',
                timestamp: Math.floor(now / 1000),
                price: 55545000,
                change_percent: 1.92,
                change_amount: 1045000,
                success: true
            }
        ],
        status: 'active'
    };

    saveEvent(sample1);
    saveEvent(sample2);
    saveEvent(sample3);

    console.log('✅ 샘플 이벤트 3개 생성 완료');
}

// 트렌딩 코인 가져오기 (CoinGecko API)
async function fetchTrendingCoins() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/search/trending');

        if (!response.ok) throw new Error('트렌딩 API 오류');

        const data = await response.json();
        const trendingCoins = data.coins.slice(0, 7); // 상위 7개만

        updateTrendingDisplay(trendingCoins);

    } catch (error) {
        console.error('트렌딩 코인 가져오기 실패:', error);
        document.getElementById('trending-list').innerHTML =
            '<div class="error">트렌딩 데이터를 불러올 수 없습니다.</div>';
    }
}

// 트렌딩 코인 UI 업데이트
function updateTrendingDisplay(coins) {
    const trendingList = document.getElementById('trending-list');

    const html = coins.map((item, index) => {
        const coin = item.item;
        const rank = index + 1;
        const marketCapRank = coin.market_cap_rank || 'N/A';

        return `
            <div class="trending-item">
                <div class="trending-rank">#${rank}</div>
                <div class="trending-info">
                    <div class="trending-name">
                        <span class="coin-symbol">${coin.symbol}</span>
                        <span class="coin-full-name">${coin.name}</span>
                    </div>
                    <div class="trending-stats">
                        <span class="market-rank">시총 순위: ${marketCapRank}</span>
                    </div>
                </div>
                <div class="trending-icon">🔥</div>
            </div>
        `;
    }).join('');

    trendingList.innerHTML = html;
}

// ==================== 가격 알림 시스템 ====================

const ALERTS_STORAGE_KEY = 'crypto_price_alerts';

// 가격 알림 시스템 초기화
function initPriceAlerts() {
    // 🔕 브라우저 알림 권한 요청 비활성화 (사용자 요청)
    // if ('Notification' in window && Notification.permission === 'default') {
    //     Notification.requestPermission().then(permission => {
    //         if (permission === 'granted') {
    //             console.log('✅ 브라우저 알림 권한 허용됨');
    //         } else {
    //             console.log('❌ 브라우저 알림 권한 거부됨');
    //         }
    //     });
    // }

    // 저장된 알림 불러오기 및 표시
    renderAlerts();

    // 알림 추가 버튼 이벤트
    const addBtn = document.getElementById('add-alert-btn');
    if (addBtn) {
        addBtn.addEventListener('click', addAlert);
    }

    // Enter 키로도 알림 추가
    const priceInput = document.getElementById('alert-price');
    if (priceInput) {
        priceInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addAlert();
            }
        });
    }

    console.log('✅ 가격 알림 시스템 초기화 완료');
}

// 저장된 알림 가져오기
function getAlerts() {
    const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
}

// 알림 저장
function saveAlerts(alerts) {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

// 알림 추가
function addAlert() {
    const coinSelect = document.getElementById('alert-coin');
    const priceInput = document.getElementById('alert-price');

    const coin = coinSelect.value;
    const targetPrice = parseFloat(priceInput.value);

    // 유효성 검사
    if (!targetPrice || targetPrice <= 0) {
        alert('올바른 가격을 입력해주세요.');
        return;
    }

    // 새 알림 생성
    const newAlert = {
        id: `alert_${Date.now()}`,
        coin: coin,
        targetPrice: targetPrice,
        createdAt: Date.now(),
        triggered: false
    };

    // 저장
    const alerts = getAlerts();
    alerts.push(newAlert);
    saveAlerts(alerts);

    // UI 업데이트
    renderAlerts();

    // 입력 필드 초기화
    priceInput.value = '';

    console.log('✅ 알림 추가됨:', newAlert);
}

// 알림 삭제
function deleteAlert(alertId) {
    let alerts = getAlerts();
    alerts = alerts.filter(a => a.id !== alertId);
    saveAlerts(alerts);
    renderAlerts();
    console.log('🗑️ 알림 삭제됨:', alertId);
}

// 알림 리스트 렌더링
function renderAlerts() {
    const alerts = getAlerts();
    const alertsList = document.getElementById('alerts-list');

    if (alerts.length === 0) {
        alertsList.innerHTML = '<div class="no-alerts">설정된 알림이 없습니다.</div>';
        return;
    }

    // 현재 가격 가져오기 (priceData에서)
    const currentPrices = {
        btc: priceData.btc.history[priceData.btc.history.length - 1] || 0,
        eth: priceData.eth.history[priceData.eth.history.length - 1] || 0
    };

    const html = alerts.map(alert => {
        const currentPrice = currentPrices[alert.coin] || 0;
        const coinName = alert.coin === 'btc' ? 'BTC' : 'ETH';
        const difference = ((currentPrice - alert.targetPrice) / alert.targetPrice * 100).toFixed(2);
        const isAbove = currentPrice >= alert.targetPrice;

        return `
            <div class="alert-item">
                <div class="alert-info">
                    <span class="alert-coin-badge">${coinName}</span>
                    <div>
                        <div class="alert-target">목표: ₩${alert.targetPrice.toLocaleString()}</div>
                        <div class="alert-current">
                            현재: ₩${currentPrice.toLocaleString()}
                            <span style="color: ${isAbove ? '#22c55e' : '#ef4444'}; margin-left: 8px;">
                                ${isAbove ? '▲' : '▼'} ${Math.abs(difference)}%
                            </span>
                        </div>
                    </div>
                </div>
                <button class="alert-delete-btn" onclick="deleteAlert('${alert.id}')">
                    삭제
                </button>
            </div>
        `;
    }).join('');

    alertsList.innerHTML = html;
}

// 가격 체크 및 알림 발송
function checkPriceAlerts() {
    const alerts = getAlerts();
    const currentPrices = {
        btc: priceData.btc.history[priceData.btc.history.length - 1] || 0,
        eth: priceData.eth.history[priceData.eth.history.length - 1] || 0
    };

    let triggeredAlerts = [];

    alerts.forEach(alert => {
        // 이미 발동된 알림은 건너뛰기
        if (alert.triggered) return;

        const currentPrice = currentPrices[alert.coin];
        if (!currentPrice) return;

        const coinName = alert.coin === 'btc' ? 'Bitcoin (BTC)' : 'Ethereum (ETH)';

        // 목표 가격 도달 확인
        if (currentPrice >= alert.targetPrice) {
            alert.triggered = true;
            triggeredAlerts.push(alert.id);

            // 브라우저 알림 발송
            sendNotification(
                `🔔 ${coinName} 가격 알림`,
                `목표 가격에 도달했습니다!\n현재 가격: ₩${currentPrice.toLocaleString()}\n목표 가격: ₩${alert.targetPrice.toLocaleString()}`
            );

            console.log('🔔 알림 발동:', alert);
        }
    });

    // 발동된 알림이 있으면 저장 및 UI 업데이트
    if (triggeredAlerts.length > 0) {
        saveAlerts(alerts);
        renderAlerts();
    }
}

// 브라우저 알림 발송
function sendNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notification = new Notification(title, {
                body: body,
                icon: '🪙',
                badge: '🔔',
                tag: 'crypto-alert',
                requireInteraction: true
            });

            // 알림 클릭 시 창 포커스
            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            // 5초 후 자동 닫기
            setTimeout(() => notification.close(), 5000);

        } catch (error) {
            console.error('알림 발송 실패:', error);
        }
    } else {
        // 알림 권한이 없으면 콘솔에만 출력
        console.log('📢 알림:', title, body);
    }
}

// ==================== 매매 신호 시스템 ====================

let currentSignals = {
    fearGreed: null,
    rsi: null,
    trend: null,
    volume: null,
    news: null
};

// 현재 선택된 코인 (기본값: BTC)
let selectedSignalCoin = 'btc';

// 바이낸스 펀딩 비율 데이터
let fundingRates = {
    btc: null,
    eth: null
};

// 매매 신호 시스템 초기화
function initTradingSignals() {
    // 코인 선택 버튼 이벤트 리스너
    const signalCoinBtns = document.querySelectorAll('.signal-coin-btn');
    signalCoinBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 모든 버튼에서 active 클래스 제거
            signalCoinBtns.forEach(b => b.classList.remove('active'));
            // 클릭된 버튼에 active 클래스 추가
            this.classList.add('active');
            // 선택된 코인 업데이트
            selectedSignalCoin = this.dataset.coin;
            // 즉시 신호 재분석
            analyzeTradingSignals();
        });
    });

    // 펀딩 비율 가져오기
    fetchFundingRates();

    // 초기 분석
    analyzeTradingSignals();

    // 10초마다 신호 업데이트
    setInterval(analyzeTradingSignals, 10000);

    // 1분마다 펀딩 비율 업데이트
    setInterval(fetchFundingRates, 60000);

    console.log('✅ 매매 신호 시스템 초기화 완료');
}

// 바이낸스 펀딩 비율 가져오기
async function fetchFundingRates() {
    try {
        // BTC 펀딩 비율
        const btcResponse = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT');
        const btcData = await btcResponse.json();

        // ETH 펀딩 비율
        const ethResponse = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=ETHUSDT');
        const ethData = await ethResponse.json();

        if (btcData && btcData.lastFundingRate) {
            fundingRates.btc = parseFloat(btcData.lastFundingRate);
            console.log('📊 BTC 펀딩 비율:', (fundingRates.btc * 100).toFixed(4) + '%');
        }

        if (ethData && ethData.lastFundingRate) {
            fundingRates.eth = parseFloat(ethData.lastFundingRate);
            console.log('📊 ETH 펀딩 비율:', (fundingRates.eth * 100).toFixed(4) + '%');
        }
    } catch (error) {
        console.error('❌ 펀딩 비율 가져오기 실패:', error);
    }
}

// 종합 매매 신호 분석
function analyzeTradingSignals() {
    // 개별 지표 분석
    const signals = analyzeIndividualSignals();

    // 최종 신호 계산
    const finalSignal = calculateFinalSignal(signals);

    // 시간대별 예측
    const timePredictions = calculateTimePredictions(signals);

    // UI 업데이트
    updateTradingSignalsUI(finalSignal, signals, timePredictions);
}

// 개별 지표 분석
function analyzeIndividualSignals() {
    // 선택된 코인의 가격 데이터 가져오기
    const coinPrices = priceData[selectedSignalCoin].history;
    const signals = {};

    // 1. 공포-탐욕 지수 분석
    const fearGreedEl = document.getElementById('fear-greed-value');
    if (fearGreedEl && fearGreedEl.textContent !== '--') {
        const fearGreedValue = parseInt(fearGreedEl.textContent);
        if (fearGreedValue < 25) {
            signals.fearGreed = {
                signal: 'long',
                reason: `극단적 공포 (${fearGreedValue}) - 과매도 구간, 반등 가능성`,
                strength: Math.min((25 - fearGreedValue) / 25 * 100, 100)
            };
        } else if (fearGreedValue > 75) {
            signals.fearGreed = {
                signal: 'short',
                reason: `극단적 탐욕 (${fearGreedValue}) - 과매수 구간, 조정 가능성`,
                strength: Math.min((fearGreedValue - 75) / 25 * 100, 100)
            };
        } else if (fearGreedValue < 45) {
            signals.fearGreed = {
                signal: 'long',
                reason: `공포 (${fearGreedValue}) - 매수 기회`,
                strength: (45 - fearGreedValue) / 20 * 60
            };
        } else if (fearGreedValue > 55) {
            signals.fearGreed = {
                signal: 'short',
                reason: `탐욕 (${fearGreedValue}) - 매도 고려`,
                strength: (fearGreedValue - 55) / 20 * 60
            };
        } else {
            signals.fearGreed = {
                signal: 'neutral',
                reason: `중립 (${fearGreedValue}) - 관망`,
                strength: 50
            };
        }
    }

    // 2. RSI 분석
    if (coinPrices.length >= 14) {
        const coinRSI = calculateRSI(coinPrices, 14);
        if (coinRSI < 30) {
            signals.rsi = {
                signal: 'long',
                reason: `RSI 과매도 (${coinRSI.toFixed(1)}) - 강한 매수 신호`,
                strength: Math.min((30 - coinRSI) / 30 * 100, 100)
            };
        } else if (coinRSI > 70) {
            signals.rsi = {
                signal: 'short',
                reason: `RSI 과매수 (${coinRSI.toFixed(1)}) - 강한 매도 신호`,
                strength: Math.min((coinRSI - 70) / 30 * 100, 100)
            };
        } else if (coinRSI < 45) {
            signals.rsi = {
                signal: 'long',
                reason: `RSI 약세 (${coinRSI.toFixed(1)}) - 매수 고려`,
                strength: (45 - coinRSI) / 15 * 60
            };
        } else if (coinRSI > 55) {
            signals.rsi = {
                signal: 'short',
                reason: `RSI 강세 (${coinRSI.toFixed(1)}) - 매도 고려`,
                strength: (coinRSI - 55) / 15 * 60
            };
        } else {
            signals.rsi = {
                signal: 'neutral',
                reason: `RSI 중립 (${coinRSI.toFixed(1)}) - 관망`,
                strength: 50
            };
        }
    }

    // 3. 추세 (이동평균) 분석
    if (coinPrices.length >= 5) {
        const coinMA = calculateMA(coinPrices, 5);
        const currentPrice = coinPrices[coinPrices.length - 1];
        const priceDiff = ((currentPrice - coinMA) / coinMA) * 100;

        if (currentPrice > coinMA) {
            signals.trend = {
                signal: 'long',
                reason: `상승 추세 (+${priceDiff.toFixed(2)}%) - MA5 위`,
                strength: Math.min(Math.abs(priceDiff) * 10, 100)
            };
        } else {
            signals.trend = {
                signal: 'short',
                reason: `하락 추세 (${priceDiff.toFixed(2)}%) - MA5 아래`,
                strength: Math.min(Math.abs(priceDiff) * 10, 100)
            };
        }
    }

    // 4. 거래량 분석
    if (coinPrices.length >= 10) {
        const recentVolumes = coinPrices.slice(-5);
        const oldVolumes = coinPrices.slice(-10, -5);
        const recentAvg = recentVolumes.reduce((a, b) => a + b, 0) / 5;
        const oldAvg = oldVolumes.reduce((a, b) => a + b, 0) / 5;
        const volumeChange = ((recentAvg - oldAvg) / oldAvg) * 100;

        if (volumeChange > 20) {
            signals.volume = {
                signal: 'long',
                reason: `거래량 급증 (+${volumeChange.toFixed(1)}%) - 상승 모멘텀`,
                strength: Math.min(volumeChange * 2, 100)
            };
        } else if (volumeChange < -20) {
            signals.volume = {
                signal: 'short',
                reason: `거래량 급감 (${volumeChange.toFixed(1)}%) - 하락 우려`,
                strength: Math.min(Math.abs(volumeChange) * 2, 100)
            };
        } else {
            signals.volume = {
                signal: 'neutral',
                reason: `거래량 보통 (${volumeChange.toFixed(1)}%) - 안정`,
                strength: 50
            };
        }
    }

    // 5. MACD 분석
    if (coinPrices.length >= 26) {
        const macd = calculateMACD(coinPrices);

        if (macd.histogram > 0 && Math.abs(macd.histogram) > 100) {
            // MACD가 Signal보다 위 → 강한 상승
            signals.macd = {
                signal: 'long',
                reason: `MACD 골든크로스 (${macd.histogram.toFixed(0)}) - 상승 모멘텀`,
                strength: Math.min(Math.abs(macd.histogram) / 500 * 100, 100)
            };
        } else if (macd.histogram < 0 && Math.abs(macd.histogram) > 100) {
            // MACD가 Signal보다 아래 → 강한 하락
            signals.macd = {
                signal: 'short',
                reason: `MACD 데드크로스 (${macd.histogram.toFixed(0)}) - 하락 모멘텀`,
                strength: Math.min(Math.abs(macd.histogram) / 500 * 100, 100)
            };
        } else if (macd.histogram > 0) {
            signals.macd = {
                signal: 'long',
                reason: `약한 상승 (${macd.histogram.toFixed(0)}) - 매수 고려`,
                strength: 40 + Math.abs(macd.histogram) / 100
            };
        } else if (macd.histogram < 0) {
            signals.macd = {
                signal: 'short',
                reason: `약한 하락 (${macd.histogram.toFixed(0)}) - 매도 고려`,
                strength: 40 + Math.abs(macd.histogram) / 100
            };
        } else {
            signals.macd = {
                signal: 'neutral',
                reason: `중립 (0) - 방향성 불명확`,
                strength: 50
            };
        }
    }

    // 6. 볼린저 밴드 분석
    if (coinPrices.length >= 20) {
        const bb = calculateBollingerBands(coinPrices, 20, 2);
        const currentPrice = coinPrices[coinPrices.length - 1];

        // 밴드 폭 대비 가격 위치 (%)
        const bandWidth = bb.upper - bb.lower;
        const pricePosition = (currentPrice - bb.lower) / bandWidth * 100;

        if (currentPrice <= bb.lower) {
            // 하단 밴드 터치 → 과매도 → 매수
            signals.bollinger = {
                signal: 'long',
                reason: `하단 밴드 터치 (${pricePosition.toFixed(1)}%) - 과매도, 반등 기대`,
                strength: Math.min((50 - pricePosition) * 2, 100)
            };
        } else if (currentPrice >= bb.upper) {
            // 상단 밴드 터치 → 과매수 → 매도
            signals.bollinger = {
                signal: 'short',
                reason: `상단 밴드 터치 (${pricePosition.toFixed(1)}%) - 과매수, 조정 예상`,
                strength: Math.min((pricePosition - 50) * 2, 100)
            };
        } else if (pricePosition < 30) {
            // 하단 근접
            signals.bollinger = {
                signal: 'long',
                reason: `하단 밴드 근접 (${pricePosition.toFixed(1)}%) - 매수 기회`,
                strength: 50 + (30 - pricePosition)
            };
        } else if (pricePosition > 70) {
            // 상단 근접
            signals.bollinger = {
                signal: 'short',
                reason: `상단 밴드 근접 (${pricePosition.toFixed(1)}%) - 매도 고려`,
                strength: 50 + (pricePosition - 70)
            };
        } else {
            // 중간 영역
            signals.bollinger = {
                signal: 'neutral',
                reason: `중간 영역 (${pricePosition.toFixed(1)}%) - 안정`,
                strength: 50
            };
        }
    }

    // 7. 펀딩 비율 분석 (바이낸스 선물)
    const fundingRate = fundingRates[selectedSignalCoin];
    if (fundingRate !== null) {
        const fundingPercent = fundingRate * 100; // 0.0001 → 0.01%

        if (fundingRate > 0.0001) {
            // 펀딩 비율이 높은 양수 → 롱 과열 → 숏 기회
            signals.funding = {
                signal: 'short',
                reason: `롱 과열 (펀딩 ${fundingPercent.toFixed(3)}%) - 숏 포지션 유리`,
                strength: Math.min(Math.abs(fundingRate) * 500000, 100)
            };
        } else if (fundingRate < -0.0001) {
            // 펀딩 비율이 낮은 음수 → 숏 과열 → 롱 기회
            signals.funding = {
                signal: 'long',
                reason: `숏 과열 (펀딩 ${fundingPercent.toFixed(3)}%) - 롱 포지션 유리`,
                strength: Math.min(Math.abs(fundingRate) * 500000, 100)
            };
        } else if (fundingRate > 0) {
            // 약한 양수 → 약한 롱 편향
            signals.funding = {
                signal: 'short',
                reason: `약한 롱 편향 (펀딩 ${fundingPercent.toFixed(3)}%) - 관망 또는 숏 고려`,
                strength: 40 + Math.abs(fundingRate) * 100000
            };
        } else if (fundingRate < 0) {
            // 약한 음수 → 약한 숏 편향
            signals.funding = {
                signal: 'long',
                reason: `약한 숏 편향 (펀딩 ${fundingPercent.toFixed(3)}%) - 관망 또는 롱 고려`,
                strength: 40 + Math.abs(fundingRate) * 100000
            };
        } else {
            // 정확히 0
            signals.funding = {
                signal: 'neutral',
                reason: `균형 (펀딩 0.000%) - 롱/숏 균형`,
                strength: 50
            };
        }
    }

    return signals;
}

// 최종 신호 계산
function calculateFinalSignal(signals) {
    let longCount = 0;
    let shortCount = 0;
    let neutralCount = 0;
    let totalStrength = 0;
    let signalCount = 0;

    Object.values(signals).forEach(signal => {
        if (signal.signal === 'long') {
            longCount++;
            totalStrength += signal.strength;
        } else if (signal.signal === 'short') {
            shortCount++;
            totalStrength += signal.strength;
        } else {
            neutralCount++;
        }
        signalCount++;
    });

    let finalSignal, finalText, finalIcon;
    const avgStrength = signalCount > 0 ? totalStrength / signalCount : 0;

    if (longCount > shortCount && longCount > neutralCount) {
        if (longCount >= signalCount * 0.7) {
            finalSignal = 'long';
            finalText = '강력한 롱 (Long) 신호 🚀';
        } else {
            finalSignal = 'long';
            finalText = '롱 (Long) 신호 📈';
        }
        finalIcon = '📈';
    } else if (shortCount > longCount && shortCount > neutralCount) {
        if (shortCount >= signalCount * 0.7) {
            finalSignal = 'short';
            finalText = '강력한 숏 (Short) 신호 📉';
        } else {
            finalSignal = 'short';
            finalText = '숏 (Short) 신호 📉';
        }
        finalIcon = '📉';
    } else {
        finalSignal = 'neutral';
        finalText = '중립 - 관망 추천 😐';
        finalIcon = '😐';
    }

    return {
        signal: finalSignal,
        text: finalText,
        icon: finalIcon,
        confidence: Math.round(avgStrength),
        longCount,
        shortCount,
        neutralCount,
        totalSignals: signalCount
    };
}

// 시간대별 예측
function calculateTimePredictions(signals) {
    const predictions = {
        '5m': { signal: 'neutral', confidence: 0 },
        '10m': { signal: 'neutral', confidence: 0 },
        '30m': { signal: 'neutral', confidence: 0 },
        '1h': { signal: 'neutral', confidence: 0 },
        '3h': { signal: 'neutral', confidence: 0 },
        '12h': { signal: 'neutral', confidence: 0 },
        '24h': { signal: 'neutral', confidence: 0 },
        '7d': { signal: 'neutral', confidence: 0 },
        '30d': { signal: 'neutral', confidence: 0 }
    };

    // 초단기 (5분): MACD + 볼린저 밴드 + 펀딩 비율 중심
    if (signals.macd && signals.bollinger) {
        const ultraShortSignals = [signals.macd, signals.bollinger];
        if (signals.funding) ultraShortSignals.push(signals.funding);
        const avgSignal = calculateAverageSignal(ultraShortSignals);
        predictions['5m'] = {
            signal: avgSignal.signal,
            confidence: Math.round(avgSignal.confidence * 0.9) // 매우 단기라 신뢰도 높음
        };
    }

    // 초단기 (10분): MACD + 볼린저 밴드 + RSI
    if (signals.macd && signals.bollinger && signals.rsi) {
        const veryShortSignals = [signals.macd, signals.bollinger, signals.rsi];
        if (signals.funding) veryShortSignals.push(signals.funding);
        const avgSignal = calculateAverageSignal(veryShortSignals);
        predictions['10m'] = {
            signal: avgSignal.signal,
            confidence: Math.round(avgSignal.confidence * 0.85)
        };
    }

    // 단기 (30분): RSI + MACD + 거래량 + 볼린저 밴드
    if (signals.rsi && signals.macd && signals.volume) {
        const shortSignals = [signals.rsi, signals.macd, signals.volume];
        if (signals.bollinger) shortSignals.push(signals.bollinger);
        const avgSignal = calculateAverageSignal(shortSignals);
        predictions['30m'] = {
            signal: avgSignal.signal,
            confidence: Math.round(avgSignal.confidence * 0.8)
        };
    }

    // 단기 (1시간): RSI + 추세 + 거래량 중심
    if (signals.rsi && signals.trend && signals.volume) {
        const hourSignals = [signals.rsi, signals.trend, signals.volume];
        if (signals.macd) hourSignals.push(signals.macd);
        const avgSignal = calculateAverageSignal(hourSignals);
        predictions['1h'] = {
            signal: avgSignal.signal,
            confidence: Math.round(avgSignal.confidence * 0.75)
        };
    }

    // 중단기 (3시간): RSI + 추세 + MACD
    if (signals.rsi && signals.trend) {
        const midShortSignals = [signals.rsi, signals.trend];
        if (signals.macd) midShortSignals.push(signals.macd);
        const avgSignal = calculateAverageSignal(midShortSignals);
        predictions['3h'] = {
            signal: avgSignal.signal,
            confidence: Math.round(avgSignal.confidence * 0.7)
        };
    }

    // 중기 (12시간): RSI + 추세 + 공포탐욕
    if (signals.rsi && signals.trend && signals.fearGreed) {
        const midSignals = [signals.rsi, signals.trend, signals.fearGreed];
        const avgSignal = calculateAverageSignal(midSignals);
        predictions['12h'] = {
            signal: avgSignal.signal,
            confidence: Math.round(avgSignal.confidence * 0.65)
        };
    }

    // 장기 (24시간): 모든 지표 통합
    const allSignals = Object.values(signals);
    const daySignal = calculateAverageSignal(allSignals);
    predictions['24h'] = {
        signal: daySignal.signal,
        confidence: Math.round(daySignal.confidence * 0.6)
    };

    // 장기 (7일, 30일): 공포탐욕 + 추세 중심
    if (signals.fearGreed && signals.trend) {
        const longTermSignal = calculateAverageSignal([signals.fearGreed, signals.trend]);
        predictions['7d'] = {
            signal: longTermSignal.signal,
            confidence: Math.round(longTermSignal.confidence * 0.5)
        };
        predictions['30d'] = {
            signal: longTermSignal.signal,
            confidence: Math.round(longTermSignal.confidence * 0.35)
        };
    }

    return predictions;
}

// 평균 신호 계산
function calculateAverageSignal(signals) {
    let longStrength = 0;
    let shortStrength = 0;
    let count = 0;

    signals.forEach(signal => {
        if (signal.signal === 'long') {
            longStrength += signal.strength;
            count++;
        } else if (signal.signal === 'short') {
            shortStrength += signal.strength;
            count++;
        }
    });

    if (longStrength > shortStrength) {
        return {
            signal: 'long',
            confidence: Math.round(longStrength / count)
        };
    } else if (shortStrength > longStrength) {
        return {
            signal: 'short',
            confidence: Math.round(shortStrength / count)
        };
    } else {
        return {
            signal: 'neutral',
            confidence: 50
        };
    }
}

// UI 업데이트
function updateTradingSignalsUI(finalSignal, signals, timePredictions) {
    // 코인 표시 이름
    const coinDisplayName = selectedSignalCoin === 'btc' ? 'BTC' : 'ETH';

    // 1. 최종 신호 업데이트
    const finalSignalEl = document.getElementById('final-signal');
    finalSignalEl.innerHTML = `
        <div class="signal-header">
            <div class="signal-title ${finalSignal.signal}">
                <span>${finalSignal.icon}</span>
                <span>${finalSignal.text} (${coinDisplayName})</span>
            </div>
            <div class="signal-confidence">신뢰도: ${finalSignal.confidence}%</div>
        </div>
        <div class="signal-description">
            ${generateSignalDescription(finalSignal)}
        </div>
        <div class="signal-breakdown">
            <div class="breakdown-item">
                <div class="breakdown-label">롱 신호</div>
                <div class="breakdown-value long">${finalSignal.longCount}개</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">숏 신호</div>
                <div class="breakdown-value short">${finalSignal.shortCount}개</div>
            </div>
            <div class="breakdown-item">
                <div class="breakdown-label">중립</div>
                <div class="breakdown-value neutral">${finalSignal.neutralCount}개</div>
            </div>
        </div>
    `;

    // 2. 개별 지표 신호 업데이트
    const individualSignalsTitle = document.querySelector('#individual-signals h4');
    if (individualSignalsTitle) {
        individualSignalsTitle.innerHTML = `📈 개별 지표 분석 (${coinDisplayName})`;
    }

    const signalsGridEl = document.querySelector('#individual-signals .signals-grid');
    const signalsHtml = Object.entries(signals).map(([key, signal]) => {
        const signalNames = {
            fearGreed: '공포-탐욕 지수',
            rsi: 'RSI (14)',
            trend: '추세 (MA5)',
            volume: '거래량',
            macd: 'MACD',
            bollinger: '볼린저 밴드',
            funding: '펀딩 비율 ⭐',
            news: '뉴스 감정'
        };

        return `
            <div class="signal-item">
                <div class="signal-item-header">
                    <div class="signal-item-name">${signalNames[key]}</div>
                    <div class="signal-item-badge ${signal.signal}">
                        ${signal.signal === 'long' ? '롱 📈' : signal.signal === 'short' ? '숏 📉' : '중립 😐'}
                    </div>
                </div>
                <div class="signal-item-reason">${signal.reason}</div>
            </div>
        `;
    }).join('');
    signalsGridEl.innerHTML = signalsHtml;

    // 3. 시간대별 예측 업데이트
    const timePredictionsTitle = document.querySelector('#time-predictions h4');
    if (timePredictionsTitle) {
        timePredictionsTitle.innerHTML = `⏰ 시간대별 예측 (${coinDisplayName})`;
    }

    const timeGridEl = document.querySelector('#time-predictions .time-grid');
    const timeLabels = {
        '5m': '5분',
        '10m': '10분',
        '30m': '30분',
        '1h': '1시간',
        '3h': '3시간',
        '12h': '12시간',
        '24h': '24시간',
        '7d': '7일',
        '30d': '30일'
    };

    const timeHtml = Object.entries(timePredictions).map(([timeKey, prediction]) => {
        return `
            <div class="time-item">
                <div class="time-item-label">${timeLabels[timeKey]}</div>
                <div class="time-item-prediction ${prediction.signal}">
                    ${prediction.signal === 'long' ? '롱 📈' : prediction.signal === 'short' ? '숏 📉' : '중립 😐'}
                </div>
                <div class="time-item-confidence">신뢰도: ${prediction.confidence}%</div>
            </div>
        `;
    }).join('');
    timeGridEl.innerHTML = timeHtml;

    // 🤖 전문가 예측 생성 및 표시
    updateExpertPredictionsUI(signals);

    // 4. 신호 기록 (롱/숏인 경우만, 중립은 제외)
    if (finalSignal.signal !== 'neutral') {
        const currentPrice = priceData[selectedSignalCoin].history[priceData[selectedSignalCoin].history.length - 1];
        if (currentPrice) {
            // 이전 신호와 다를 때만 기록 (중복 방지)
            const lastSignal = signalHistory[0];
            const shouldRecord = !lastSignal ||
                                 lastSignal.coin !== selectedSignalCoin ||
                                 lastSignal.signal !== finalSignal.signal ||
                                 (new Date() - lastSignal.timestamp) > 3600000; // 1시간 이상 경과

            if (shouldRecord) {
                recordSignal(selectedSignalCoin, finalSignal.signal, currentPrice, finalSignal);
            }
        }
    }
}

// 신호 설명 생성
function generateSignalDescription(finalSignal) {
    if (finalSignal.signal === 'long') {
        return `
            <strong>롱 포지션 진입 권장</strong><br>
            현재 ${finalSignal.totalSignals}개 지표 중 ${finalSignal.longCount}개가 상승 신호를 보이고 있습니다.
            레버리지 20배 기준으로 진입 시, 손절가와 목표가를 반드시 설정하세요.
        `;
    } else if (finalSignal.signal === 'short') {
        return `
            <strong>숏 포지션 진입 권장</strong><br>
            현재 ${finalSignal.totalSignals}개 지표 중 ${finalSignal.shortCount}개가 하락 신호를 보이고 있습니다.
            레버리지 20배 기준으로 진입 시, 손절가와 목표가를 반드시 설정하세요.
        `;
    } else {
        return `
            <strong>관망 권장</strong><br>
            현재 신호가 명확하지 않습니다. 더 확실한 신호가 나올 때까지 기다리는 것을 추천합니다.
        `;
    }
}

// ==================== 포지션 계산기 ====================

function initPositionCalculator() {
    const calcBtn = document.getElementById('calc-btn');
    if (calcBtn) {
        calcBtn.addEventListener('click', calculatePosition);
    }

    // 코인 선택 시 현재가 자동 입력
    const coinSelect = document.getElementById('calc-coin');
    if (coinSelect) {
        coinSelect.addEventListener('change', autoFillEntryPrice);
    }

    console.log('✅ 포지션 계산기 초기화 완료');
}

// 진입가 자동 입력
function autoFillEntryPrice() {
    const coin = document.getElementById('calc-coin').value;
    const entryInput = document.getElementById('calc-entry');

    const currentPrice = priceData[coin].history[priceData[coin].history.length - 1];
    if (currentPrice) {
        entryInput.value = currentPrice.toFixed(2); // USDT는 소수점 2자리
    }
}

// 포지션 계산
function calculatePosition() {
    const coin = document.getElementById('calc-coin').value;
    const direction = document.getElementById('calc-direction').value;
    const amount = parseFloat(document.getElementById('calc-amount').value);
    let entryPrice = parseFloat(document.getElementById('calc-entry').value);

    // 유효성 검사
    if (!amount || amount <= 0) {
        alert('투자 금액을 입력해주세요.');
        return;
    }

    // 진입가 미입력 시 현재가 사용
    if (!entryPrice) {
        entryPrice = priceData[coin].history[priceData[coin].history.length - 1];
        document.getElementById('calc-entry').value = entryPrice.toFixed(2);
    }

    const LEVERAGE = 20; // 레버리지 20배 고정

    // 포지션 크기 (레버리지 적용)
    const positionSize = amount * LEVERAGE;

    // 청산가 계산 (레버리지 20배 = 5% 역방향 이동 시 청산)
    let liquidationPrice;
    if (direction === 'long') {
        liquidationPrice = entryPrice * 0.95; // -5% 하락 시 청산
    } else {
        liquidationPrice = entryPrice * 1.05; // +5% 상승 시 청산
    }

    // 추천 손절가 (2% 손실)
    let stopLoss;
    if (direction === 'long') {
        stopLoss = entryPrice * 0.99; // -1% 하락
    } else {
        stopLoss = entryPrice * 1.01; // +1% 상승
    }

    // 추천 익절가 (4% 수익, 리스크 대비 리워드 2:1)
    let takeProfit;
    if (direction === 'long') {
        takeProfit = entryPrice * 1.02; // +2% 상승
    } else {
        takeProfit = entryPrice * 0.98; // -2% 하락
    }

    // 손절 시 손실액 (레버리지 적용)
    const stopLossAmount = amount * 0.2; // 투자금의 20% 손실 (1% * 20배)

    // 익절 시 수익액 (레버리지 적용)
    const takeProfitAmount = amount * 0.4; // 투자금의 40% 수익 (2% * 20배)

    // UI 업데이트
    displayCalculationResults({
        coin: coin.toUpperCase(),
        direction,
        amount,
        entryPrice,
        positionSize,
        liquidationPrice,
        stopLoss,
        takeProfit,
        stopLossAmount,
        takeProfitAmount
    });
}

// 계산 결과 표시
function displayCalculationResults(result) {
    const resultsEl = document.getElementById('calc-results');

    const directionText = result.direction === 'long' ? '롱 (Long)' : '숏 (Short)';
    const directionClass = result.direction === 'long' ? 'success' : 'danger';

    resultsEl.innerHTML = `
        <div class="results-grid">
            <div class="result-item">
                <div class="result-label">포지션 정보</div>
                <div class="result-value ${directionClass}">${result.coin} ${directionText}</div>
            </div>
            <div class="result-item">
                <div class="result-label">진입 가격</div>
                <div class="result-value">$${result.entryPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="result-item">
                <div class="result-label">포지션 크기 (20배)</div>
                <div class="result-value">$${result.positionSize.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="result-item">
                <div class="result-label">🎯 추천 익절가 (2%)</div>
                <div class="result-value success">$${result.takeProfit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="result-item">
                <div class="result-label">예상 수익</div>
                <div class="result-value success">+$${result.takeProfitAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="result-item">
                <div class="result-label">🛡️ 추천 손절가 (1%)</div>
                <div class="result-value warning">$${result.stopLoss.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="result-item">
                <div class="result-label">예상 손실</div>
                <div class="result-value warning">-$${result.stopLossAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="result-item">
                <div class="result-label">⚠️ 청산가 (5%)</div>
                <div class="result-value danger">$${result.liquidationPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            <div class="result-item">
                <div class="result-label">청산 시 손실</div>
                <div class="result-value danger">-$${result.amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} (전액)</div>
            </div>
        </div>

        <div class="risk-warning">
            <strong>⚠️ 리스크 관리 필수사항</strong>
            • 레버리지 20배는 고위험입니다. 가격이 5% 역방향 이동 시 청산됩니다.<br>
            • 손절가 설정은 필수입니다. 추천 손절가: $${result.stopLoss.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<br>
            • 익절가 설정도 필수입니다. 추천 익절가: $${result.takeProfit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}<br>
            • 투자 원금을 초과하는 손실이 발생할 수 있으니 신중하게 거래하세요.
        </div>
    `;
}

// ==================== 고래 움직임 추적 시스템 ====================

let whaleTransactions = [];
let previousVolumes = { btc: 0, eth: 0 };
let lastWhaleCheck = null;
let totalWhaleDetected = 0;

// Whale Alert API 설정
const WHALE_ALERT_API_KEY = 'demo'; // 실제 사용 시 API 키 필요: https://whale-alert.io/
const WHALE_MIN_VALUE = 500000; // 최소 거래 금액 (USD) - 50만 달러 이상

// 고래 움직임 시스템 초기화
function initWhaleTracking() {
    // 초기 체크
    fetchWhaleAlertTransactions();

    // 1분마다 Whale Alert API 호출
    setInterval(fetchWhaleAlertTransactions, 60000);

    console.log('✅ 고래 움직임 추적 시스템 초기화 완료 (Whale Alert API 연동)');
}

// Whale Alert API에서 실제 고래 거래 데이터 가져오기
async function fetchWhaleAlertTransactions() {
    try {
        // 최근 10분간의 거래 조회
        const now = Math.floor(Date.now() / 1000);
        const start = now - 600; // 10분 전

        const url = `https://api.whale-alert.io/v1/transactions?api_key=${WHALE_ALERT_API_KEY}&min_value=${WHALE_MIN_VALUE}&start=${start}&currency=usd`;

        const response = await fetch(url);
        const data = await response.json();

        if (data && data.transactions && data.transactions.length > 0) {
            console.log('🐋 Whale Alert 데이터:', data.transactions.length + '건');

            // BTC와 ETH 거래만 필터링
            const relevantTransactions = data.transactions.filter(tx =>
                (tx.symbol === 'btc' || tx.symbol === 'eth') &&
                tx.amount_usd >= WHALE_MIN_VALUE
            );

            // 각 거래를 우리 형식으로 변환
            relevantTransactions.forEach(tx => {
                const whaleTransaction = {
                    id: tx.id || tx.hash,
                    coin: tx.symbol,
                    coinName: tx.symbol === 'btc' ? 'Bitcoin' : 'Ethereum',
                    type: determineTransactionType(tx),
                    typeText: getTransactionTypeText(tx),
                    amount: tx.amount_usd,
                    amountCoin: tx.amount,
                    from: formatAddress(tx.from),
                    to: formatAddress(tx.to),
                    fromOwner: tx.from?.owner || '알 수 없음',
                    toOwner: tx.to?.owner || '알 수 없음',
                    timestamp: new Date(tx.timestamp * 1000),
                    hash: tx.hash
                };

                // 중복 체크 (같은 hash가 이미 있으면 추가 안 함)
                const exists = whaleTransactions.some(t => t.id === whaleTransaction.id);
                if (!exists) {
                    whaleTransactions.unshift(whaleTransaction);
                    totalWhaleDetected++;
                    console.log('🐋 새로운 고래 거래:', whaleTransaction);
                }
            });

            // 최대 50개만 유지
            if (whaleTransactions.length > 50) {
                whaleTransactions = whaleTransactions.slice(0, 50);
            }
        }

        // 마지막 체크 시간 업데이트
        lastWhaleCheck = new Date();

        // UI 업데이트
        updateWhaleUI();

    } catch (error) {
        console.error('❌ Whale Alert API 호출 실패:', error);

        // API 실패 시 시뮬레이션으로 대체
        detectWhaleMovementsSimulation();
    }
}

// 거래 타입 판단
function determineTransactionType(tx) {
    const fromType = tx.from?.owner_type || '';
    const toType = tx.to?.owner_type || '';

    // 거래소 → 개인 지갑 = 출금 (매수 시그널)
    if (fromType === 'exchange' && toType !== 'exchange') {
        return 'buy';
    }
    // 개인 지갑 → 거래소 = 입금 (매도 시그널)
    if (fromType !== 'exchange' && toType === 'exchange') {
        return 'sell';
    }
    // 거래소 간 이동
    if (fromType === 'exchange' && toType === 'exchange') {
        return 'transfer';
    }
    // 기타
    return 'unknown';
}

// 거래 타입 텍스트
function getTransactionTypeText(tx) {
    const type = determineTransactionType(tx);
    switch (type) {
        case 'buy':
            return '거래소 출금 (매수 시그널)';
        case 'sell':
            return '거래소 입금 (매도 시그널)';
        case 'transfer':
            return '거래소 간 이동';
        default:
            return '대량 전송';
    }
}

// 주소 포맷팅
function formatAddress(addressObj) {
    if (!addressObj || !addressObj.address) return '알 수 없음';
    const addr = addressObj.address;
    return addr.length > 10 ? addr.substring(0, 6) + '...' + addr.substring(addr.length - 4) : addr;
}

// 시뮬레이션 (API 실패 시 백업)
function detectWhaleMovementsSimulation() {
    // BTC 고래 거래 감지
    if (priceData.btc.history.length >= 10) {
        detectWhaleForCoin('btc');
    }

    // ETH 고래 거래 감지
    if (priceData.eth.history.length >= 10) {
        detectWhaleForCoin('eth');
    }

    // 마지막 체크 시간 업데이트
    lastWhaleCheck = new Date();

    // UI 업데이트
    updateWhaleUI();
}

// 특정 코인의 고래 거래 감지
function detectWhaleForCoin(coin) {
    const coinName = coin === 'btc' ? 'Bitcoin' : 'Ethereum';
    const prices = priceData[coin].history;

    if (prices.length < 10) return;

    // 최근 거래량과 평균 거래량 계산
    const recentVolumes = prices.slice(-5);
    const olderVolumes = prices.slice(-10, -5);

    const recentAvg = recentVolumes.reduce((a, b) => a + b, 0) / 5;
    const olderAvg = olderVolumes.reduce((a, b) => a + b, 0) / 5;

    // 현재 가격
    const currentPrice = prices[prices.length - 1];
    const previousPrice = previousVolumes[coin] || currentPrice;

    // 고래 거래 감지 (거래량이 평균의 3배 이상)
    if (recentAvg > olderAvg * WHALE_THRESHOLD) {
        const volumeIncrease = ((recentAvg - olderAvg) / olderAvg) * 100;
        const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

        // 거래 방향 판단 (가격 상승 = 매수, 하락 = 매도)
        const type = priceChange > 0 ? 'buy' : 'sell';
        const typeText = type === 'buy' ? '대량 매수' : '대량 매도';

        // 추정 거래 금액 (현재가 기준)
        const estimatedAmount = currentPrice * (recentAvg - olderAvg);

        // 고래 거래 추가
        const whaleTransaction = {
            id: Date.now(),
            coin: coin,
            coinName: coinName,
            type: type,
            typeText: typeText,
            amount: estimatedAmount,
            price: currentPrice,
            volumeIncrease: volumeIncrease,
            priceChange: priceChange,
            timestamp: new Date()
        };

        // 거래 목록에 추가 (최대 20개 유지)
        whaleTransactions.unshift(whaleTransaction);
        if (whaleTransactions.length > 20) {
            whaleTransactions.pop();
        }

        // 총 감지 횟수 증가
        totalWhaleDetected++;

        console.log('🐋 고래 거래 감지:', whaleTransaction);
    }

    // 이전 볼륨 저장
    previousVolumes[coin] = currentPrice;
}

// 고래 거래 UI 업데이트
function updateWhaleUI() {
    const whaleList = document.getElementById('whale-list');

    if (!whaleList) return;

    if (whaleTransactions.length === 0) {
        const lastCheckText = lastWhaleCheck ? getTimeAgo(lastWhaleCheck) : '아직 체크 안함';
        whaleList.innerHTML = `
            <div class="whale-monitoring-status">
                <div class="monitoring-icon">🔍</div>
                <div class="monitoring-text">
                    <div class="monitoring-title">🐋 Whale Alert 실시간 모니터링</div>
                    <div class="monitoring-info">
                        <span>📊 마지막 체크: ${lastCheckText}</span>
                        <span>🐋 총 감지: ${totalWhaleDetected}건</span>
                        <span>⏱️ 1분마다 자동 업데이트</span>
                    </div>
                    <div class="monitoring-note">
                        💰 최소 거래 금액: $${(WHALE_MIN_VALUE / 1000).toFixed(0)}K (${(WHALE_MIN_VALUE / 100000000).toFixed(1)}억원)<br>
                        🎯 BTC, ETH 대규모 거래만 표시 (Whale Alert API 연동)
                    </div>
                </div>
            </div>
        `;
        return;
    }

    let html = '';

    whaleTransactions.forEach(whale => {
        const timeAgo = getTimeAgo(whale.timestamp);
        const typeClass = whale.type === 'buy' ? 'success' : whale.type === 'sell' ? 'danger' : 'neutral';
        const typeIcon = whale.type === 'buy' ? '📈' : whale.type === 'sell' ? '📉' : '🔄';

        // Whale Alert 데이터인 경우 (from/to 정보가 있음)
        if (whale.from && whale.to) {
            html += `
                <div class="whale-item ${typeClass}">
                    <div class="whale-header">
                        <span class="whale-type ${typeClass}">${typeIcon} ${whale.typeText}</span>
                        <span class="whale-amount">$${formatLargeNumber(whale.amount)}</span>
                    </div>
                    <div class="whale-details">
                        <span class="whale-coin">📊 ${whale.coinName} (${whale.amountCoin ? whale.amountCoin.toFixed(2) : '0'} ${whale.coin.toUpperCase()})</span>
                        <span class="whale-time">⏰ ${timeAgo}</span>
                    </div>
                    <div class="whale-route">
                        <div class="route-item">
                            <span class="route-label">보낸 곳:</span>
                            <span class="route-value">${whale.fromOwner} (${whale.from})</span>
                        </div>
                        <div class="route-arrow">→</div>
                        <div class="route-item">
                            <span class="route-label">받는 곳:</span>
                            <span class="route-value">${whale.toOwner} (${whale.to})</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // 시뮬레이션 데이터인 경우
            html += `
                <div class="whale-item ${typeClass}">
                    <div class="whale-header">
                        <span class="whale-type ${typeClass}">${whale.typeText}</span>
                        <span class="whale-amount">$${formatLargeNumber(whale.amount)}</span>
                    </div>
                    <div class="whale-details">
                        <span class="whale-coin">📊 ${whale.coinName}</span>
                        <span>💰 $${whale.price ? whale.price.toFixed(2) : '0'}</span>
                        ${whale.priceChange !== undefined ? `
                        <span class="${whale.priceChange >= 0 ? 'positive' : 'negative'}">
                            ${whale.priceChange >= 0 ? '▲' : '▼'} ${Math.abs(whale.priceChange).toFixed(2)}%
                        </span>
                        ` : ''}
                        <span class="whale-time">⏰ ${timeAgo}</span>
                    </div>
                </div>
            `;
        }
    });

    whaleList.innerHTML = html;
}

// 큰 숫자를 읽기 쉽게 포맷 (억, 조 단위)
function formatLargeNumber(num) {
    if (num >= 1000000000000) {
        return (num / 1000000000000).toFixed(1) + '조';
    } else if (num >= 100000000) {
        return (num / 100000000).toFixed(1) + '억';
    } else if (num >= 10000) {
        return (num / 10000).toFixed(1) + '만';
    } else {
        return Math.round(num).toLocaleString();
    }
}

// 시간 경과 표시
function getTimeAgo(timestamp) {
    const now = new Date();
    const diff = Math.floor((now - timestamp) / 1000); // 초 단위

    if (diff < 60) {
        return `${diff}초 전`;
    } else if (diff < 3600) {
        return `${Math.floor(diff / 60)}분 전`;
    } else if (diff < 86400) {
        return `${Math.floor(diff / 3600)}시간 전`;
    } else {
        return `${Math.floor(diff / 86400)}일 전`;
    }
}

// ==================== 백테스팅 & 성공률 추적 시스템 ====================

// 백테스팅 시스템 초기화
function initBacktestingSystem() {
    // localStorage에서 신호 히스토리 불러오기
    loadSignalHistory();

    // 30초마다 진행 중인 신호 결과 확인
    setInterval(checkPendingSignals, 30000);

    // 통계 UI 업데이트
    updateStatsUI();

    console.log('✅ 백테스팅 시스템 초기화 완료');
}

// localStorage에서 신호 히스토리 불러오기
function loadSignalHistory() {
    const saved = localStorage.getItem('signalHistory');
    if (saved) {
        try {
            signalHistory = JSON.parse(saved);
            // 타임스탬프를 Date 객체로 변환
            signalHistory = signalHistory.map(signal => ({
                ...signal,
                timestamp: new Date(signal.timestamp),
                checkTime: signal.checkTime ? new Date(signal.checkTime) : null
            }));
            calculateStats();
            console.log('📊 저장된 신호 히스토리 불러옴:', signalHistory.length + '건');
        } catch (error) {
            console.error('신호 히스토리 불러오기 실패:', error);
            signalHistory = [];
        }
    }
}

// localStorage에 신호 히스토리 저장
function saveSignalHistory() {
    try {
        localStorage.setItem('signalHistory', JSON.stringify(signalHistory));
    } catch (error) {
        console.error('신호 히스토리 저장 실패:', error);
    }
}

// 새 신호 기록
function recordSignal(coin, signal, entryPrice, finalSignal) {
    const newSignal = {
        id: Date.now(),
        coin: coin,
        signal: signal, // 'long' or 'short'
        entryPrice: entryPrice,
        timestamp: new Date(),
        status: 'pending', // 'pending', 'success', 'fail'
        checkTime: null,
        exitPrice: null,
        profit: null,
        profitPercent: null,
        finalSignal: finalSignal // 최종 종합 신호 정보
    };

    signalHistory.unshift(newSignal);

    // 최대 100개만 유지
    if (signalHistory.length > 100) {
        signalHistory = signalHistory.slice(0, 100);
    }

    calculateStats();
    saveSignalHistory();
    updateStatsUI();

    console.log('📝 새 신호 기록:', newSignal);
}

// 진행 중인 신호 결과 확인 (1시간 후)
function checkPendingSignals() {
    const now = new Date();
    let updated = false;

    signalHistory.forEach(signal => {
        if (signal.status === 'pending') {
            // 1시간 경과 확인
            const elapsed = (now - signal.timestamp) / 1000 / 60; // 분 단위

            if (elapsed >= 60) { // 1시간 = 60분
                // 현재 가격 가져오기
                const currentPrice = priceData[signal.coin].history[priceData[signal.coin].history.length - 1];

                if (currentPrice) {
                    // 수익률 계산
                    let profitPercent;
                    if (signal.signal === 'long') {
                        profitPercent = ((currentPrice - signal.entryPrice) / signal.entryPrice) * 100;
                    } else { // short
                        profitPercent = ((signal.entryPrice - currentPrice) / signal.entryPrice) * 100;
                    }

                    // 성공/실패 판단 (±2% 기준)
                    const isSuccess = profitPercent >= 2; // 2% 이상 수익 = 성공

                    signal.status = isSuccess ? 'success' : 'fail';
                    signal.exitPrice = currentPrice;
                    signal.profitPercent = profitPercent;
                    signal.checkTime = now;

                    updated = true;

                    console.log(`✅ 신호 결과 확인: ${signal.coin.toUpperCase()} ${signal.signal} - ${isSuccess ? '성공' : '실패'} (${profitPercent.toFixed(2)}%)`);
                }
            }
        }
    });

    if (updated) {
        calculateStats();
        saveSignalHistory();
        updateStatsUI();
    }
}

// 통계 계산
function calculateStats() {
    signalStats.total = signalHistory.length;
    signalStats.success = signalHistory.filter(s => s.status === 'success').length;
    signalStats.fail = signalHistory.filter(s => s.status === 'fail').length;
    signalStats.pending = signalHistory.filter(s => s.status === 'pending').length;

    if (signalStats.success + signalStats.fail > 0) {
        signalStats.successRate = (signalStats.success / (signalStats.success + signalStats.fail)) * 100;
    } else {
        signalStats.successRate = 0;
    }
}

// 통계 UI 업데이트
function updateStatsUI() {
    // 성공률 표시
    const statsEl = document.getElementById('signal-stats');
    if (!statsEl) return;

    const successRateClass = signalStats.successRate >= 60 ? 'success' : signalStats.successRate >= 40 ? 'warning' : 'danger';

    statsEl.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">총 신호</div>
                <div class="stat-value">${signalStats.total}건</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">성공</div>
                <div class="stat-value success">${signalStats.success}건</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">실패</div>
                <div class="stat-value danger">${signalStats.fail}건</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">대기</div>
                <div class="stat-value warning">${signalStats.pending}건</div>
            </div>
            <div class="stat-item highlight">
                <div class="stat-label">성공률</div>
                <div class="stat-value ${successRateClass}">${signalStats.successRate.toFixed(1)}%</div>
            </div>
        </div>
        <div class="stats-note">
            📊 1시간 후 가격 기준 / 🎯 2% 이상 수익 = 성공
        </div>
    `;
}

// ========================================
// 🤖 AI 전문가 예측 시스템
// ========================================

/**
 * 개별 전문가의 예측 생성
 * @param {number} expertId - 전문가 ID (1~10)
 * @param {string} coin - 'btc' or 'eth'
 * @param {string} timeframe - '5m', '10m', '30m', '1h'
 * @param {object} signals - 현재 지표 신호들
 * @returns {object} 예측 결과
 */
function predictByExpert(expertId, coin, timeframe, signals) {
    const expert = expertProfiles.find(e => e.id === expertId);
    if (!expert) return null;

    // 🎯 시간대별 가중치 사용
    const baseWeights = expert.weights[timeframe];
    if (!baseWeights) {
        console.error(`⚠️ 전문가 #${expertId}: 시간대 ${timeframe}의 가중치가 없습니다.`);
        return null;
    }

    // 🎯 Phase 2-3: 실시간 지표 중요도 계산 및 가중치 동적 조정
    const indicatorImportance = calculateIndicatorImportance(expertId, timeframe);
    const weights = { ...baseWeights }; // 복사본 생성

    if (indicatorImportance) {
        // 지표 중요도를 반영해서 가중치 임시 조정
        Object.keys(weights).forEach(indicator => {
            const importance = indicatorImportance[indicator];
            if (importance !== undefined) {
                // 중요도가 높으면 (>0.65) 가중치 증가, 낮으면 (<0.35) 감소
                if (importance > 0.65) {
                    weights[indicator] *= 1.15; // +15%
                } else if (importance < 0.35) {
                    weights[indicator] *= 0.85; // -15%
                }
            }
        });
    }

    let longScore = 0;
    let shortScore = 0;
    let totalWeight = 0;

    // 📊 각 지표별 기여도 기록 (Phase 1-2: 지표별 기여도 계산)
    const indicatorContributions = {};

    // 각 지표의 신호를 가중치에 따라 점수화
    Object.keys(signals).forEach(signalKey => {
        const signal = signals[signalKey];
        if (!signal || !weights[signalKey]) return;

        const weight = weights[signalKey];
        const strength = signal.strength || 50;

        // 지표별 기여도 기록
        indicatorContributions[signalKey] = {
            signal: signal.signal,       // 'long' or 'short' or 'neutral'
            strength: strength,           // 0-100
            weight: weight,               // 0.05-1.0
            contribution: 0               // 실제 점수 기여도
        };

        if (signal.signal === 'long') {
            const contrib = strength * weight;
            longScore += contrib;
            indicatorContributions[signalKey].contribution = contrib;
        } else if (signal.signal === 'short') {
            const contrib = strength * weight;
            shortScore += contrib;
            indicatorContributions[signalKey].contribution = -contrib; // 음수로 표시
        }

        totalWeight += weight * 100;
    });

    // 최종 신호 결정
    let finalSignal = 'neutral';
    let confidence = 0;

    if (longScore > shortScore) {
        finalSignal = 'long';
        confidence = Math.min(Math.round((longScore / (totalWeight || 1)) * 100), 100);
    } else if (shortScore > longScore) {
        finalSignal = 'short';
        confidence = Math.min(Math.round((shortScore / (totalWeight || 1)) * 100), 100);
    } else {
        finalSignal = 'neutral';
        confidence = 50;
    }

    // 🎯 Phase 2-1: 동적 신뢰도 임계값 체크
    const threshold = expert.confidenceThreshold?.[timeframe] || 0.40;
    const confidenceDecimal = confidence / 100;

    if (confidenceDecimal < threshold) {
        // 임계값 미만이면 예측 안함 (null 반환)
        console.log(`⚠️ 전문가 #${expertId} (${timeframe}): 신뢰도 ${confidence}% < 임계값 ${(threshold*100).toFixed(0)}% → 예측 거부`);
        return null;
    }

    return {
        expertId: expertId,
        expertName: expert.name,
        expertEmoji: expert.emoji,
        coin: coin,
        timeframe: timeframe,
        signal: finalSignal,
        confidence: confidence,
        longScore: Math.round(longScore),
        shortScore: Math.round(shortScore),
        strategy: expert.strategy,
        timestamp: new Date(),
        indicatorContributions: indicatorContributions // 🎯 Phase 1-2: 지표별 기여도 추가!
    };
}

/**
 * 10명의 전문가 모두 예측
 * @param {string} coin - 'btc' or 'eth'
 * @param {string} timeframe - '5m', '10m', '30m', '1h'
 * @param {object} signals - 현재 지표 신호들
 * @returns {array} 10명의 예측 배열
 */
function getAllExpertPredictions(coin, timeframe, signals) {
    const predictions = [];

    expertProfiles.forEach(expert => {
        const prediction = predictByExpert(expert.id, coin, timeframe, signals);
        if (prediction) {
            predictions.push(prediction);
        }
    });

    return predictions;
}

/**
 * 전문가 예측 기록 및 저장
 * @param {object} prediction - 예측 객체
 * @param {number} entryPrice - 진입 가격
 */
function recordExpertPrediction(prediction, entryPrice) {
    if (prediction.signal === 'neutral') return; // 중립은 기록 안 함

    const testRecord = {
        id: `test_${Date.now()}_${prediction.expertId}`,
        expertId: prediction.expertId,
        expertName: prediction.expertName,
        coin: prediction.coin,
        timeframe: prediction.timeframe,
        signal: prediction.signal,
        confidence: prediction.confidence,
        entryPrice: entryPrice,
        timestamp: prediction.timestamp,

        // 결과 (나중에 채워짐)
        status: 'pending',
        checkTime: null,
        exitPrice: null,
        actualChange: null,
        profit: null,
        profitPercent: null
    };

    expertTestHistory.unshift(testRecord);

    // 통계 업데이트
    if (!expertStats[prediction.expertId]) {
        expertStats[prediction.expertId] = {
            total: 0,
            success: 0,
            fail: 0,
            pending: 0,
            successRate: 0,
            byTimeframe: {},
            byCoin: {},
            recentPredictions: []
        };
    }

    expertStats[prediction.expertId].total++;
    expertStats[prediction.expertId].pending++;

    if (!expertStats[prediction.expertId].byTimeframe[prediction.timeframe]) {
        expertStats[prediction.expertId].byTimeframe[prediction.timeframe] = {
            total: 0, success: 0, fail: 0, pending: 0, rate: 0
        };
    }
    expertStats[prediction.expertId].byTimeframe[prediction.timeframe].total++;
    expertStats[prediction.expertId].byTimeframe[prediction.timeframe].pending++;

    if (!expertStats[prediction.expertId].byCoin[prediction.coin]) {
        expertStats[prediction.expertId].byCoin[prediction.coin] = {
            total: 0, success: 0, fail: 0, pending: 0, rate: 0
        };
    }
    expertStats[prediction.expertId].byCoin[prediction.coin].total++;
    expertStats[prediction.expertId].byCoin[prediction.coin].pending++;

    // 최근 예측 추가
    expertStats[prediction.expertId].recentPredictions.unshift(testRecord);
    if (expertStats[prediction.expertId].recentPredictions.length > 10) {
        expertStats[prediction.expertId].recentPredictions =
            expertStats[prediction.expertId].recentPredictions.slice(0, 10);
    }

    saveExpertData();
}

/**
 * 시간 경과 후 전문가 예측 결과 확인
 */
function checkExpertPredictions() {
    const now = new Date();
    let updated = false;

    expertTestHistory.forEach(test => {
        if (test.status !== 'pending') return;

        const elapsed = (now - new Date(test.timestamp)) / 1000 / 60; // 분 단위
        const timeframeMinutes = {
            '5m': 5,
            '10m': 10,
            '30m': 30,
            '1h': 60
        };

        const requiredMinutes = timeframeMinutes[test.timeframe] || 60;

        if (elapsed >= requiredMinutes) {
            // 현재 가격 확인
            const currentPrice = priceData[test.coin].history[priceData[test.coin].history.length - 1];

            if (currentPrice) {
                let profitPercent;
                if (test.signal === 'long') {
                    profitPercent = ((currentPrice - test.entryPrice) / test.entryPrice) * 100;
                } else {
                    profitPercent = ((test.entryPrice - currentPrice) / test.entryPrice) * 100;
                }

                const isSuccess = profitPercent >= 1; // 1% 이상 수익 = 성공
                test.status = isSuccess ? 'success' : 'fail';
                test.exitPrice = currentPrice;
                test.actualChange = ((currentPrice - test.entryPrice) / test.entryPrice) * 100;
                test.profitPercent = profitPercent;
                test.checkTime = now;

                // 학습 수행
                learnFromResult(test.expertId, test.id, isSuccess, test);

                updated = true;
            }
        }
    });

    if (updated) {
        calculateExpertStats();
        saveExpertData();

        // 페이지 2가 활성화되어 있으면 성적표 자동 업데이트
        const page2 = document.getElementById('page-2');
        if (page2 && page2.classList.contains('active')) {
            renderStatsDashboard();
        }
    }
}

/**
 * 🎯 Phase 1-3: 동적 학습률 계산 (수익률에 비례)
 * @param {number} profitPercent - 수익률 (%)
 * @param {number} baseRate - 기본 학습률 (기본값: 0.05)
 * @returns {number} 조정된 학습률
 */
function calculateDynamicLearningRate(profitPercent, baseRate = 0.05) {
    const absProfitPercent = Math.abs(profitPercent);

    let multiplier = 1.0;

    if (absProfitPercent >= 1.0) {
        // 수익률이 클수록 학습률 증가 (로그 스케일)
        // 1% → 1.0x (5% 학습률)
        // 2% → 1.4x (7% 학습률)
        // 5% → 2.0x (10% 학습률)
        // 10% → 2.6x (13% 학습률)
        multiplier = 1 + Math.log(absProfitPercent) / Math.log(2);
    } else {
        // 1% 미만은 약하게 학습 (0.5x = 2.5% 학습률)
        multiplier = 0.5;
    }

    // 최종 학습률 계산
    const adjustedRate = baseRate * multiplier;

    // 상한선: 0.15 (15% - 너무 급격한 변화 방지)
    return Math.min(adjustedRate, 0.15);
}

/**
 * 🧠 Phase 1-4: 결과로부터 학습 (지표별 개별 학습)
 * @param {number} expertId - 전문가 ID
 * @param {string} testId - 테스트 ID
 * @param {boolean} isSuccess - 성공 여부
 * @param {object} test - 테스트 기록
 */
function learnFromResult(expertId, testId, isSuccess, test) {
    const expert = expertProfiles.find(e => e.id === expertId);
    if (!expert) return;

    const timeframe = test.timeframe;
    const profitPercent = test.profitPercent || 0;

    // 시간대별 가중치가 없으면 스킵
    if (!expert.weights[timeframe]) {
        console.error(`⚠️ 전문가 #${expertId}: 시간대 ${timeframe}의 가중치가 없습니다.`);
        return;
    }

    // 🎯 Phase 1-3: 동적 학습률 계산 (수익률에 비례)
    const learningRate = calculateDynamicLearningRate(profitPercent);

    // 📊 Phase 1-2: 지표별 기여도를 활용한 개별 학습
    const indicatorContributions = test.indicatorContributions || {};
    const finalSignal = test.signal; // 'long' or 'short'

    console.log(`🎓 전문가 #${expertId} 학습 시작:`, {
        result: isSuccess ? '성공 ✅' : '실패 ❌',
        coin: test.coin,
        timeframe: timeframe,
        profit: profitPercent.toFixed(2) + '%',
        learningRate: (learningRate * 100).toFixed(1) + '%'
    });

    // 각 지표별로 개별 학습
    Object.keys(indicatorContributions).forEach(indicator => {
        const contrib = indicatorContributions[indicator];
        const indicatorSignal = contrib.signal;

        // 현재 가중치
        const currentWeight = expert.weights[timeframe][indicator];

        // 이 지표가 최종 신호와 같은 방향이었나?
        const agreedWithFinal = (indicatorSignal === finalSignal);

        let newWeight = currentWeight;

        if (isSuccess) {
            // ✅ 성공: 최종 신호와 일치한 지표 → 가중치 증가
            if (agreedWithFinal) {
                newWeight = currentWeight * (1 + learningRate);
            } else {
                // 최종 신호와 반대였던 지표 → 가중치 약하게 감소
                newWeight = currentWeight * (1 - learningRate * 0.6);
            }
        } else {
            // ❌ 실패: 최종 신호와 일치한 지표 → 가중치 감소
            if (agreedWithFinal) {
                newWeight = currentWeight * (1 - learningRate);
            } else {
                // 최종 신호와 반대였던 지표 → 가중치 약하게 증가 (역으로 보상)
                newWeight = currentWeight * (1 + learningRate * 0.6);
            }
        }

        // 범위 제한: 0.05 ~ 1.0
        newWeight = Math.max(0.05, Math.min(1.0, newWeight));
        expert.weights[timeframe][indicator] = parseFloat(newWeight.toFixed(3));
    });

    // 🎯 Phase 2-2: 최근 성과 트래킹 (최근 10개 기록)
    if (!expert.recentPerformance[timeframe]) {
        expert.recentPerformance[timeframe] = [];
    }
    expert.recentPerformance[timeframe].push(isSuccess);
    if (expert.recentPerformance[timeframe].length > 10) {
        expert.recentPerformance[timeframe].shift(); // 오래된 것 제거
    }

    // 🎯 Phase 2-1: 신뢰도 임계값 동적 조정
    adjustConfidenceThreshold(expert, timeframe, test);

    console.log(`✅ 전문가 #${expertId} 학습 완료!`, {
        adjustedWeights: expert.weights[timeframe],
        confidenceThreshold: (expert.confidenceThreshold[timeframe] * 100).toFixed(0) + '%'
    });

    saveExpertData();
}

/**
 * 🎯 Phase 2-1: 신뢰도 임계값 동적 조정
 * @param {object} expert - 전문가 객체
 * @param {string} timeframe - 시간대
 * @param {object} test - 테스트 기록
 */
function adjustConfidenceThreshold(expert, timeframe, test) {
    const confidence = test.confidence || 50;
    const confidenceDecimal = confidence / 100;
    const currentThreshold = expert.confidenceThreshold[timeframe];

    // 최근 10개 예측의 성공률
    const recent = expert.recentPerformance[timeframe] || [];
    if (recent.length < 5) return; // 데이터 충분히 쌓일 때까지 대기

    const recentSuccessRate = recent.filter(r => r).length / recent.length;

    // 조정 로직
    if (recentSuccessRate < 0.4) {
        // 최근 성공률 낮음 (40% 미만) → 임계값 올림 (더 까다롭게)
        expert.confidenceThreshold[timeframe] = Math.min(currentThreshold + 0.02, 0.75);
        console.log(`📈 전문가 #${expert.id} (${timeframe}): 성공률 낮음 (${(recentSuccessRate*100).toFixed(0)}%) → 임계값 상승: ${(currentThreshold*100).toFixed(0)}% → ${(expert.confidenceThreshold[timeframe]*100).toFixed(0)}%`);
    } else if (recentSuccessRate > 0.7) {
        // 최근 성공률 높음 (70% 이상) → 임계값 내림 (더 많이 예측)
        expert.confidenceThreshold[timeframe] = Math.max(currentThreshold - 0.01, 0.35);
        console.log(`📉 전문가 #${expert.id} (${timeframe}): 성공률 높음 (${(recentSuccessRate*100).toFixed(0)}%) → 임계값 하락: ${(currentThreshold*100).toFixed(0)}% → ${(expert.confidenceThreshold[timeframe]*100).toFixed(0)}%`);
    }

    // 범위 제한: 0.35 ~ 0.75
    expert.confidenceThreshold[timeframe] = Math.max(0.35, Math.min(0.75, expert.confidenceThreshold[timeframe]));
}

/**
 * 🎯 Phase 2-3: 실시간 지표 중요도 계산
 * @param {number} expertId - 전문가 ID
 * @param {string} timeframe - 시간대
 * @param {number} lookback - 최근 N개 예측 분석 (기본: 30)
 * @returns {object} 지표별 예측력 (0-1 점수)
 */
function calculateIndicatorImportance(expertId, timeframe, lookback = 30) {
    // 해당 전문가의 최근 예측만 필터링
    const recentTests = expertTestHistory
        .filter(t =>
            t.expertId === expertId &&
            t.timeframe === timeframe &&
            (t.status === 'success' || t.status === 'fail') &&
            t.indicatorContributions
        )
        .slice(-lookback);

    if (recentTests.length < 10) {
        return null; // 데이터 부족
    }

    const importance = {};
    const indicators = ['rsi', 'macd', 'bollinger', 'funding', 'volume', 'trend', 'fearGreed'];

    indicators.forEach(indicator => {
        // 이 지표가 "강한 신호" (기여도 상위)를 보인 예측들
        const strongSignalTests = recentTests.filter(test => {
            const contrib = test.indicatorContributions?.[indicator];
            if (!contrib) return false;

            // 절대값 기준 기여도가 높은지 (상위 30%)
            const absContrib = Math.abs(contrib.contribution || 0);
            const allContribs = Object.values(test.indicatorContributions).map(c => Math.abs(c.contribution || 0));
            const threshold = allContribs.sort((a, b) => b - a)[Math.floor(allContribs.length * 0.3)];

            return absContrib >= threshold;
        });

        if (strongSignalTests.length > 0) {
            // 강한 신호 냈을 때의 성공률
            const successCount = strongSignalTests.filter(t => t.status === 'success').length;
            importance[indicator] = successCount / strongSignalTests.length;
        } else {
            importance[indicator] = 0.5; // 기본값
        }
    });

    return importance;
}

/**
 * 전문가 통계 재계산
 */
function calculateExpertStats() {
    expertProfiles.forEach(expert => {
        const expertId = expert.id;

        if (!expertStats[expertId]) return;

        // 전체 통계
        const allTests = expertTestHistory.filter(t => t.expertId === expertId);
        const successTests = allTests.filter(t => t.status === 'success');
        const failTests = allTests.filter(t => t.status === 'fail');
        const pendingTests = allTests.filter(t => t.status === 'pending');

        expertStats[expertId].total = allTests.length;
        expertStats[expertId].success = successTests.length;
        expertStats[expertId].fail = failTests.length;
        expertStats[expertId].pending = pendingTests.length;

        const completedTests = successTests.length + failTests.length;
        expertStats[expertId].successRate = completedTests > 0
            ? (successTests.length / completedTests) * 100
            : 0;

        // 시간대별 통계
        Object.keys(expertStats[expertId].byTimeframe).forEach(timeframe => {
            const tests = allTests.filter(t => t.timeframe === timeframe);
            const success = tests.filter(t => t.status === 'success').length;
            const fail = tests.filter(t => t.status === 'fail').length;
            const pending = tests.filter(t => t.status === 'pending').length;
            const completed = success + fail;

            expertStats[expertId].byTimeframe[timeframe] = {
                total: tests.length,
                success: success,
                fail: fail,
                pending: pending,
                rate: completed > 0 ? (success / completed) * 100 : 0
            };
        });

        // 코인별 통계
        Object.keys(expertStats[expertId].byCoin).forEach(coin => {
            const tests = allTests.filter(t => t.coin === coin);
            const success = tests.filter(t => t.status === 'success').length;
            const fail = tests.filter(t => t.status === 'fail').length;
            const pending = tests.filter(t => t.status === 'pending').length;
            const completed = success + fail;

            expertStats[expertId].byCoin[coin] = {
                total: tests.length,
                success: success,
                fail: fail,
                pending: pending,
                rate: completed > 0 ? (success / completed) * 100 : 0
            };
        });
    });
}

// 전문가 예측을 위한 선택된 시간대
let selectedExpertTimeframe = '5m'; // 기본값: 5분

/**
 * 전문가 예측 UI 업데이트
 * @param {object} signals - 현재 지표 신호들
 */
function updateExpertPredictionsUI(signals) {
    const coin = selectedSignalCoin;
    const timeframe = selectedExpertTimeframe;
    const currentPrice = priceData[coin].history[priceData[coin].history.length - 1];

    if (!currentPrice) return;

    // 10명의 전문가 예측 생성
    const expertPredictions = getAllExpertPredictions(coin, timeframe, signals);

    // 예측 기록 (중복 방지: 마지막 기록과 비교)
    expertPredictions.forEach(prediction => {
        const lastRecord = expertTestHistory.find(t =>
            t.expertId === prediction.expertId &&
            t.coin === coin &&
            t.timeframe === timeframe &&
            t.status === 'pending'
        );

        // 3분 이내의 중복 예측 방지
        const shouldRecord = !lastRecord ||
            ((new Date() - new Date(lastRecord.timestamp)) / 1000 > 180);

        if (shouldRecord) {
            recordExpertPrediction(prediction, currentPrice);
        }
    });

    // UI 렌더링
    renderExpertPredictionsUI(expertPredictions);
}

/**
 * 전문가 예측 UI 렌더링
 * @param {array} predictions - 전문가 예측 배열
 */
function renderExpertPredictionsUI(predictions) {
    const containerEl = document.getElementById('expert-predictions');
    if (!containerEl) return;

    // 시간대 선택기
    const timeframeSelector = `
        <div class="expert-timeframe-selector">
            <button class="timeframe-btn ${selectedExpertTimeframe === '5m' ? 'active' : ''}" data-timeframe="5m">5분</button>
            <button class="timeframe-btn ${selectedExpertTimeframe === '10m' ? 'active' : ''}" data-timeframe="10m">10분</button>
            <button class="timeframe-btn ${selectedExpertTimeframe === '30m' ? 'active' : ''}" data-timeframe="30m">30분</button>
            <button class="timeframe-btn ${selectedExpertTimeframe === '1h' ? 'active' : ''}" data-timeframe="1h">1시간</button>
        </div>
    `;

    // 통계 요약
    const longCount = predictions.filter(p => p.signal === 'long').length;
    const shortCount = predictions.filter(p => p.signal === 'short').length;
    const neutralCount = predictions.filter(p => p.signal === 'neutral').length;

    const summary = `
        <div class="expert-summary">
            <div class="summary-item long">
                <div class="summary-label">롱 추천</div>
                <div class="summary-value">${longCount}명</div>
            </div>
            <div class="summary-item short">
                <div class="summary-label">숏 추천</div>
                <div class="summary-value">${shortCount}명</div>
            </div>
            <div class="summary-item neutral">
                <div class="summary-label">중립</div>
                <div class="summary-value">${neutralCount}명</div>
            </div>
        </div>
    `;

    // 전문가 카드들
    const expertCards = predictions.map(pred => {
        const stats = expertStats[pred.expertId];
        const successRate = stats?.successRate || 0;

        return `
            <div class="expert-card ${pred.signal}">
                <div class="expert-header">
                    <div class="expert-id">
                        ${pred.expertEmoji} 전문가 #${pred.expertId}
                    </div>
                    <div class="expert-success-rate">
                        성공률: ${successRate.toFixed(1)}%
                    </div>
                </div>
                <div class="expert-name">${pred.expertName}</div>
                <div class="expert-strategy">${pred.strategy}</div>
                <div class="expert-prediction">
                    <div class="prediction-signal ${pred.signal}">
                        ${pred.signal === 'long' ? '📈 롱' : pred.signal === 'short' ? '📉 숏' : '😐 중립'}
                    </div>
                    <div class="prediction-confidence">신뢰도 ${pred.confidence}%</div>
                </div>
                <div class="expert-scores">
                    <div class="score-item">
                        <span>롱 점수:</span> <span class="long">${pred.longScore}</span>
                    </div>
                    <div class="score-item">
                        <span>숏 점수:</span> <span class="short">${pred.shortScore}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    containerEl.innerHTML = `
        ${timeframeSelector}
        ${summary}
        <div class="expert-grid">
            ${expertCards}
        </div>
    `;

    // 시간대 선택 이벤트 리스너
    const timeframeBtns = containerEl.querySelectorAll('.timeframe-btn');
    timeframeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedExpertTimeframe = btn.dataset.timeframe;
            // 신호 재생성
            const signals = generateAllSignals(selectedSignalCoin);
            const timePredictions = calculateTimePredictions(signals.rawSignals);
            const finalSignal = signals.finalSignal;
            updateExpertPredictionsUI(signals.rawSignals);
        });
    });
}

// 30초마다 전문가 예측 결과 확인
setInterval(checkExpertPredictions, 30000);

// ========================================
// 📄 페이지 탭 시스템
// ========================================

function initPageTabs() {
    const pageTabs = document.querySelectorAll('.page-tab');
    const pageContents = document.querySelectorAll('.page-content');

    pageTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const pageId = tab.dataset.page;

            // 모든 탭과 페이지 비활성화
            pageTabs.forEach(t => t.classList.remove('active'));
            pageContents.forEach(p => p.classList.remove('active'));

            // 선택한 탭과 페이지 활성화
            tab.classList.add('active');
            document.getElementById(pageId).classList.add('active');

            // 페이지 2 (전문가 성적표)로 전환 시 데이터 렌더링
            if (pageId === 'page-2') {
                renderStatsDashboard();
            }
        });
    });
}

// ========================================
// 📊 전문가 성적표 대시보드
// ========================================

let statsFilters = {
    period: 'all', // today, week, month, all
    coin: 'all',   // all, btc, eth
    timeframe: 'all' // all, 5m, 10m, 30m, 1h
};

function initStatsDashboard() {
    // 필터 이벤트 리스너
    document.getElementById('stats-period-filter')?.addEventListener('change', (e) => {
        statsFilters.period = e.target.value;
        renderStatsDashboard();
    });

    document.getElementById('stats-coin-filter')?.addEventListener('change', (e) => {
        statsFilters.coin = e.target.value;
        renderStatsDashboard();
    });

    document.getElementById('stats-timeframe-filter')?.addEventListener('change', (e) => {
        statsFilters.timeframe = e.target.value;
        renderStatsDashboard();
    });
}

async function renderStatsDashboard() {
    // 필터링된 데이터 가져오기
    const filteredData = getFilteredExpertData();

    // 각 테이블 렌더링
    renderExpertRanking(filteredData);
    renderTimeframeStats(filteredData);
    renderExpertTimeframeHeatmap(filteredData);
    renderDailyStats(filteredData);
    renderCoinStats(filteredData);

    // 🌐 서버 기반 AI 통계 (24/7 학습 중)
    await renderServerAIStats();
}

// 🌐 서버 기반 AI 전문가 통계 (Cloudflare Workers)
async function renderServerAIStats() {
    const container = document.getElementById('expert-ranking-table');
    if (!container) return;

    try {
        const experts = await fetchExpertStats();
        if (experts.length === 0) {
            console.log('서버 통계 없음 (아직 학습 데이터가 부족함)');
            return;
        }

        // 서버 통계 섹션 추가
        const serverStatsHTML = `
            <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px;">
                <h3 style="color: white; margin-bottom: 15px;">🌐 서버 기반 AI 전문가 (24/7 자동 학습 중)</h3>
                <table style="background: white;">
                    <thead>
                        <tr>
                            <th>전문가</th>
                            <th>5분</th>
                            <th>10분</th>
                            <th>30분</th>
                            <th>1시간</th>
                            <th>평균</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${experts.map(expert => {
                            const stats = expert.stats;
                            const timeframes = ['5m', '10m', '30m', '1h'];
                            const rates = timeframes.map(tf => stats[tf]?.successRate || 0);
                            const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;

                            return `
                                <tr>
                                    <td>
                                        <div class="expert-info">
                                            <span>${expert.emoji}</span>
                                            <span>${expert.name}</span>
                                        </div>
                                    </td>
                                    ${timeframes.map(tf => {
                                        const stat = stats[tf];
                                        if (!stat || stat.totalPredictions === 0) {
                                            return `<td style="color: #94a3b8;">-</td>`;
                                        }
                                        const rate = stat.successRate;
                                        const color = rate >= 60 ? '#22c55e' : rate >= 40 ? '#f59e0b' : '#ef4444';
                                        return `
                                            <td>
                                                <div style="font-weight: 600; color: ${color};">${rate.toFixed(1)}%</div>
                                                <div style="font-size: 0.8em; color: #64748b;">${stat.successCount}/${stat.successCount + stat.failCount}</div>
                                            </td>
                                        `;
                                    }).join('')}
                                    <td style="font-weight: 700; color: ${avgRate >= 60 ? '#22c55e' : avgRate >= 40 ? '#f59e0b' : '#ef4444'};">
                                        ${avgRate.toFixed(1)}%
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 10px; color: rgba(255,255,255,0.9); font-size: 0.9em; text-align: center;">
                    ⏰ 매 1분마다 자동 예측 생성 및 검증 | 🧠 실시간 가중치 학습 중 | ☁️ 브라우저를 닫아도 24/7 학습
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforebegin', serverStatsHTML);
    } catch (error) {
        console.error('서버 통계 렌더링 실패:', error);
    }
}

function getFilteredExpertData() {
    let filtered = [...expertTestHistory];

    // 기간 필터
    if (statsFilters.period !== 'all') {
        const now = new Date();
        const startDate = new Date();

        if (statsFilters.period === 'today') {
            startDate.setHours(0, 0, 0, 0);
        } else if (statsFilters.period === 'week') {
            startDate.setDate(now.getDate() - 7);
        } else if (statsFilters.period === 'month') {
            startDate.setMonth(now.getMonth() - 1);
        }

        filtered = filtered.filter(t => new Date(t.timestamp) >= startDate);
    }

    // 코인 필터
    if (statsFilters.coin !== 'all') {
        filtered = filtered.filter(t => t.coin === statsFilters.coin);
    }

    // 시간대 필터
    if (statsFilters.timeframe !== 'all') {
        filtered = filtered.filter(t => t.timeframe === statsFilters.timeframe);
    }

    return filtered;
}

// 전문가 랭킹 테이블
function renderExpertRanking(data) {
    const container = document.getElementById('expert-ranking-table');
    if (!container) return;

    // 전문가별 통계 집계
    const expertRankings = expertProfiles.map(expert => {
        const expertTests = data.filter(t => t.expertId === expert.id);
        const completed = expertTests.filter(t => t.status === 'success' || t.status === 'fail');
        const success = expertTests.filter(t => t.status === 'success');
        const successRate = completed.length > 0 ? (success.length / completed.length) * 100 : 0;

        return {
            id: expert.id,
            emoji: expert.emoji,
            name: expert.name,
            strategy: expert.strategy,
            total: expertTests.length,
            success: success.length,
            fail: completed.length - success.length,
            pending: expertTests.filter(t => t.status === 'pending').length,
            successRate: successRate
        };
    }).sort((a, b) => b.successRate - a.successRate);

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>순위</th>
                    <th>전문가</th>
                    <th>전략</th>
                    <th>총 예측</th>
                    <th>성공</th>
                    <th>실패</th>
                    <th>대기</th>
                    <th>성공률</th>
                </tr>
            </thead>
            <tbody>
                ${expertRankings.map((expert, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`;
                    const rateClass = expert.successRate >= 60 ? 'success-rate-high' : expert.successRate >= 40 ? 'success-rate-medium' : 'success-rate-low';

                    return `
                        <tr>
                            <td><span class="rank-medal">${medal}</span></td>
                            <td>
                                <div class="expert-info">
                                    <span>${expert.emoji}</span>
                                    <span>${expert.name}</span>
                                </div>
                            </td>
                            <td>${expert.strategy}</td>
                            <td>${expert.total}건</td>
                            <td style="color: #22c55e;">${expert.success}건</td>
                            <td style="color: #ef4444;">${expert.fail}건</td>
                            <td style="color: #fbbf24;">${expert.pending}건</td>
                            <td class="success-rate-cell ${rateClass}">${expert.successRate.toFixed(1)}%</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

// 시간대별 통계
function renderTimeframeStats(data) {
    const container = document.getElementById('timeframe-stats-table');
    if (!container) return;

    const timeframes = ['5m', '10m', '30m', '1h'];
    const timeframeStats = timeframes.map(tf => {
        const tests = data.filter(t => t.timeframe === tf);
        const completed = tests.filter(t => t.status === 'success' || t.status === 'fail');
        const success = tests.filter(t => t.status === 'success');
        const successRate = completed.length > 0 ? (success.length / completed.length) * 100 : 0;

        return {
            timeframe: tf,
            label: { '5m': '5분', '10m': '10분', '30m': '30분', '1h': '1시간' }[tf],
            total: tests.length,
            success: success.length,
            fail: completed.length - success.length,
            pending: tests.filter(t => t.status === 'pending').length,
            successRate: successRate
        };
    });

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>시간대</th>
                    <th>총 예측</th>
                    <th>성공</th>
                    <th>실패</th>
                    <th>대기</th>
                    <th>성공률</th>
                </tr>
            </thead>
            <tbody>
                ${timeframeStats.map(tf => `
                    <tr>
                        <td><strong>${tf.label}</strong></td>
                        <td>${tf.total}건</td>
                        <td style="color: #22c55e;">${tf.success}건</td>
                        <td style="color: #ef4444;">${tf.fail}건</td>
                        <td style="color: #fbbf24;">${tf.pending}건</td>
                        <td style="font-weight: 700; color: ${tf.successRate >= 60 ? '#22c55e' : tf.successRate >= 40 ? '#fbbf24' : '#ef4444'};">${tf.successRate.toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

// 전문가×시간대 히트맵
function renderExpertTimeframeHeatmap(data) {
    const container = document.getElementById('expert-timeframe-heatmap');
    if (!container) return;

    const timeframes = ['5m', '10m', '30m', '1h'];
    const timeframeLabels = { '5m': '5분', '10m': '10분', '30m': '30분', '1h': '1시간' };

    const heatmapData = expertProfiles.map(expert => {
        const row = { expertId: expert.id, emoji: expert.emoji, name: expert.name };

        timeframes.forEach(tf => {
            const tests = data.filter(t => t.expertId === expert.id && t.timeframe === tf);
            const completed = tests.filter(t => t.status === 'success' || t.status === 'fail');
            const success = tests.filter(t => t.status === 'success');
            const successRate = completed.length > 0 ? (success.length / completed.length) * 100 : null;

            row[tf] = successRate;
        });

        return row;
    });

    const tableHTML = `
        <table class="heatmap-table">
            <thead>
                <tr>
                    <th>전문가</th>
                    ${timeframes.map(tf => `<th>${timeframeLabels[tf]}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${heatmapData.map(row => `
                    <tr>
                        <td style="text-align: left; font-weight: 600;">
                            ${row.emoji} ${row.name}
                        </td>
                        ${timeframes.map(tf => {
                            const rate = row[tf];
                            let cellClass = 'heatmap-cell-none';
                            if (rate !== null) {
                                cellClass = rate >= 60 ? 'heatmap-cell-high' : rate >= 40 ? 'heatmap-cell-medium' : 'heatmap-cell-low';
                            }
                            return `<td class="${cellClass}">${rate !== null ? rate.toFixed(1) + '%' : '-'}</td>`;
                        }).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

// 날짜별 통계
function renderDailyStats(data) {
    const container = document.getElementById('daily-stats-table');
    if (!container) return;

    // 날짜별 그룹화
    const dailyMap = {};
    data.forEach(test => {
        const date = new Date(test.timestamp).toLocaleDateString('ko-KR');
        if (!dailyMap[date]) {
            dailyMap[date] = { total: 0, success: 0, fail: 0, pending: 0 };
        }
        dailyMap[date].total++;
        if (test.status === 'success') dailyMap[date].success++;
        else if (test.status === 'fail') dailyMap[date].fail++;
        else dailyMap[date].pending++;
    });

    const dailyStats = Object.entries(dailyMap).map(([date, stats]) => ({
        date,
        ...stats,
        successRate: (stats.success + stats.fail) > 0 ? (stats.success / (stats.success + stats.fail)) * 100 : 0
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>날짜</th>
                    <th>총 예측</th>
                    <th>성공</th>
                    <th>실패</th>
                    <th>대기</th>
                    <th>성공률</th>
                </tr>
            </thead>
            <tbody>
                ${dailyStats.map(day => `
                    <tr>
                        <td><strong>${day.date}</strong></td>
                        <td>${day.total}건</td>
                        <td style="color: #22c55e;">${day.success}건</td>
                        <td style="color: #ef4444;">${day.fail}건</td>
                        <td style="color: #fbbf24;">${day.pending}건</td>
                        <td style="font-weight: 700; color: ${day.successRate >= 60 ? '#22c55e' : day.successRate >= 40 ? '#fbbf24' : '#ef4444'};">${day.successRate.toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

// 코인별 통계
function renderCoinStats(data) {
    const container = document.getElementById('coin-stats-table');
    if (!container) return;

    const coins = ['btc', 'eth'];
    const coinLabels = { 'btc': 'Bitcoin (BTC)', 'eth': 'Ethereum (ETH)' };

    const coinStats = coins.map(coin => {
        const tests = data.filter(t => t.coin === coin);
        const completed = tests.filter(t => t.status === 'success' || t.status === 'fail');
        const success = tests.filter(t => t.status === 'success');
        const successRate = completed.length > 0 ? (success.length / completed.length) * 100 : 0;

        return {
            coin,
            label: coinLabels[coin],
            total: tests.length,
            success: success.length,
            fail: completed.length - success.length,
            pending: tests.filter(t => t.status === 'pending').length,
            successRate
        };
    });

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>코인</th>
                    <th>총 예측</th>
                    <th>성공</th>
                    <th>실패</th>
                    <th>대기</th>
                    <th>성공률</th>
                </tr>
            </thead>
            <tbody>
                ${coinStats.map(coin => `
                    <tr>
                        <td><strong>${coin.label}</strong></td>
                        <td>${coin.total}건</td>
                        <td style="color: #22c55e;">${coin.success}건</td>
                        <td style="color: #ef4444;">${coin.fail}건</td>
                        <td style="color: #fbbf24;">${coin.pending}건</td>
                        <td style="font-weight: 700; color: ${coin.successRate >= 60 ? '#22c55e' : coin.successRate >= 40 ? '#fbbf24' : '#ef4444'};">${coin.successRate.toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

console.log('✅ 앱 초기화 완료');
