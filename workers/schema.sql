-- AI 전문가 학습 시스템 D1 데이터베이스 스키마
-- Cloudflare Workers D1 (SQLite)

-- 1. 전문가 가중치 테이블
CREATE TABLE IF NOT EXISTS expert_weights (
    expert_id INTEGER NOT NULL,
    timeframe TEXT NOT NULL,
    weights TEXT NOT NULL,  -- JSON: { rsi: 0.50, macd: 0.70, ... }
    confidence_threshold REAL DEFAULT 0.50,
    recent_performance TEXT,  -- JSON: [true, false, true, ...]
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (expert_id, timeframe)
);

-- 2. 예측 기록 테이블
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expert_id INTEGER NOT NULL,
    coin TEXT NOT NULL,  -- 'btc' or 'eth'
    timeframe TEXT NOT NULL,  -- '5m', '10m', '30m', '1h'
    signal TEXT NOT NULL,  -- 'long', 'short', 'neutral'
    confidence REAL NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL,
    status TEXT DEFAULT 'pending',  -- 'pending', 'success', 'fail'
    profit_percent REAL,
    indicator_contributions TEXT,  -- JSON: { rsi: {signal, contribution}, ... }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_at TIMESTAMP
);

-- 3. 전문가 통계 테이블
CREATE TABLE IF NOT EXISTS expert_stats (
    expert_id INTEGER NOT NULL,
    timeframe TEXT NOT NULL,
    total_predictions INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    fail_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (expert_id, timeframe)
);

-- 4. 전문가 프로필 테이블 (10명의 전문가 메타데이터)
CREATE TABLE IF NOT EXISTS expert_profiles (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    strategy TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_expert ON predictions(expert_id, timeframe);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_pending ON predictions(status, created_at) WHERE status = 'pending';

-- 10명의 전문가 초기 데이터 삽입
INSERT OR IGNORE INTO expert_profiles (id, name, strategy, emoji) VALUES
(1, 'RSI 전문가', 'RSI 과매수/과매도 중심', '📊'),
(2, 'MACD 전문가', 'MACD 모멘텀 중심', '📈'),
(3, '볼린저 전문가', '볼린저 밴드 돌파 중심', '🎯'),
(4, '펀딩 전문가', '선물 펀딩비율 중심', '💰'),
(5, '거래량 전문가', '거래량 분석 중심', '📊'),
(6, '균형형 전문가', '모든 지표 균등 분석', '⚖️'),
(7, '단기 스캘퍼', 'MACD + 볼린저 단기', '⚡'),
(8, '추세 추종가', '추세 + 거래량 중심', '🚀'),
(9, '역추세 사냥꾼', '볼린저 + RSI 역추세', '🎣'),
(10, '펀딩+고래 추적가', '펀딩비율 + 고래움직임', '🐋');

-- 전문가별 초기 가중치 삽입 (Phase 1 값 그대로)
-- Expert #1: RSI 전문가
INSERT OR IGNORE INTO expert_weights (expert_id, timeframe, weights, confidence_threshold) VALUES
(1, '5m', '{"rsi":0.50,"macd":0.70,"bollinger":0.40,"funding":0.60,"volume":0.80,"trend":0.20,"fearGreed":0.10}', 0.55),
(1, '10m', '{"rsi":0.70,"macd":0.65,"bollinger":0.50,"funding":0.50,"volume":0.60,"trend":0.40,"fearGreed":0.15}', 0.50),
(1, '30m', '{"rsi":0.85,"macd":0.50,"bollinger":0.60,"funding":0.40,"volume":0.50,"trend":0.55,"fearGreed":0.20}', 0.45),
(1, '1h', '{"rsi":0.80,"macd":0.45,"bollinger":0.55,"funding":0.30,"volume":0.40,"trend":0.70,"fearGreed":0.25}', 0.40);

-- Expert #2: MACD 전문가
INSERT OR IGNORE INTO expert_weights (expert_id, timeframe, weights, confidence_threshold) VALUES
(2, '5m', '{"rsi":0.40,"macd":0.90,"bollinger":0.50,"funding":0.60,"volume":0.85,"trend":0.35,"fearGreed":0.10}', 0.55),
(2, '10m', '{"rsi":0.45,"macd":0.85,"bollinger":0.55,"funding":0.50,"volume":0.70,"trend":0.50,"fearGreed":0.15}', 0.50),
(2, '30m', '{"rsi":0.50,"macd":0.75,"bollinger":0.60,"funding":0.40,"volume":0.60,"trend":0.65,"fearGreed":0.20}', 0.45),
(2, '1h', '{"rsi":0.50,"macd":0.70,"bollinger":0.55,"funding":0.30,"volume":0.50,"trend":0.75,"fearGreed":0.25}', 0.40);

-- Expert #3: 볼린저 전문가
INSERT OR IGNORE INTO expert_weights (expert_id, timeframe, weights, confidence_threshold) VALUES
(3, '5m', '{"rsi":0.45,"macd":0.65,"bollinger":0.85,"funding":0.55,"volume":0.75,"trend":0.25,"fearGreed":0.10}', 0.55),
(3, '10m', '{"rsi":0.55,"macd":0.60,"bollinger":0.85,"funding":0.45,"volume":0.65,"trend":0.40,"fearGreed":0.15}', 0.50),
(3, '30m', '{"rsi":0.60,"macd":0.55,"bollinger":0.80,"funding":0.35,"volume":0.55,"trend":0.50,"fearGreed":0.20}', 0.45),
(3, '1h', '{"rsi":0.60,"macd":0.50,"bollinger":0.75,"funding":0.25,"volume":0.45,"trend":0.60,"fearGreed":0.25}', 0.40);

-- Expert #4-10 생략 (필요시 추가)
-- 나머지 전문가들도 동일한 패턴으로 INSERT

-- 전문가별 통계 초기화
INSERT OR IGNORE INTO expert_stats (expert_id, timeframe)
SELECT id, tf.timeframe
FROM expert_profiles
CROSS JOIN (SELECT '5m' as timeframe UNION SELECT '10m' UNION SELECT '30m' UNION SELECT '1h') tf;

-- ==========================================
-- AI 트레이더 배틀 아레나 테이블
-- ==========================================

-- 5. 트레이딩 세션 테이블 (실제 매매 기록)
CREATE TABLE IF NOT EXISTS trading_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expert_id INTEGER NOT NULL,
    coin TEXT NOT NULL,  -- 'btc' or 'eth'
    position TEXT NOT NULL,  -- 'long' or 'short'

    -- 진입 정보
    entry_time TIMESTAMP NOT NULL,
    entry_price REAL NOT NULL,
    entry_confidence REAL NOT NULL,  -- 진입 시 신뢰도

    -- 청산 정보
    exit_time TIMESTAMP,
    exit_price REAL,
    exit_reason TEXT,  -- '익절', '손절', '타임아웃', '지표역전' 등

    -- 수익 정보
    hold_duration_minutes INTEGER,  -- 보유 시간 (분)
    price_change_percent REAL,  -- 실제 가격 변동률
    leveraged_profit_percent REAL,  -- 레버리지 20배 수익률
    profit_amount REAL,  -- 실제 달러 수익/손실

    -- 잔고 정보
    balance_before REAL,  -- 거래 전 잔고
    balance_after REAL,   -- 거래 후 잔고

    -- 상태
    status TEXT DEFAULT 'open',  -- 'open', 'closed_win', 'closed_loss', 'closed_timeout'

    -- 지표 스냅샷 (진입 시점)
    entry_indicators TEXT,  -- JSON: 진입 시점의 모든 지표

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 트레이더 잔고 및 통계 테이블
CREATE TABLE IF NOT EXISTS trader_balances (
    expert_id INTEGER NOT NULL,
    coin TEXT NOT NULL,  -- 'btc' or 'eth'

    -- 잔고 정보 (KRW 원화 기준)
    initial_balance REAL DEFAULT 10000000.0,
    current_balance REAL DEFAULT 10000000.0,
    peak_balance REAL DEFAULT 10000000.0,  -- 최고 잔고

    -- 일일 통계
    today_trades INTEGER DEFAULT 0,
    today_wins INTEGER DEFAULT 0,
    today_losses INTEGER DEFAULT 0,
    today_profit_percent REAL DEFAULT 0.0,
    today_profit_amount REAL DEFAULT 0.0,

    -- 누적 통계
    total_trades INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    win_rate REAL DEFAULT 0.0,

    -- 수익 통계
    total_profit_amount REAL DEFAULT 0.0,
    total_profit_percent REAL DEFAULT 0.0,
    avg_profit_per_trade REAL DEFAULT 0.0,
    avg_win_percent REAL DEFAULT 0.0,
    avg_loss_percent REAL DEFAULT 0.0,
    best_trade_percent REAL DEFAULT 0.0,
    worst_trade_percent REAL DEFAULT 0.0,

    -- 리스크 통계
    max_drawdown_percent REAL DEFAULT 0.0,  -- 최대 낙폭
    consecutive_wins INTEGER DEFAULT 0,  -- 현재 연속 승
    consecutive_losses INTEGER DEFAULT 0,  -- 현재 연속 패
    max_consecutive_wins INTEGER DEFAULT 0,
    max_consecutive_losses INTEGER DEFAULT 0,

    -- 보유 시간 통계
    avg_hold_minutes REAL DEFAULT 0.0,

    -- 상태
    status TEXT DEFAULT 'active',  -- 'active', 'paused', 'stopped'
    daily_loss_limit_hit BOOLEAN DEFAULT 0,  -- 일일 손실 한도 도달

    -- 타임스탬프
    last_trade_at TIMESTAMP,
    last_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (expert_id, coin)
);

-- 7. 일일 리더보드 스냅샷 (매일 00:00 UTC 저장)
CREATE TABLE IF NOT EXISTS daily_leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,  -- 'YYYY-MM-DD'
    coin TEXT NOT NULL,
    expert_id INTEGER NOT NULL,

    -- 순위 정보
    rank INTEGER NOT NULL,

    -- 일일 성과
    daily_profit_percent REAL NOT NULL,
    daily_profit_amount REAL NOT NULL,
    daily_trades INTEGER NOT NULL,
    daily_wins INTEGER NOT NULL,
    daily_win_rate REAL NOT NULL,

    -- 잔고 정보
    balance REAL NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, coin, expert_id)
);

-- 인덱스 생성 (트레이딩 아레나 성능 최적화)
CREATE INDEX IF NOT EXISTS idx_trading_sessions_expert ON trading_sessions(expert_id, coin);
CREATE INDEX IF NOT EXISTS idx_trading_sessions_status ON trading_sessions(status);
CREATE INDEX IF NOT EXISTS idx_trading_sessions_entry_time ON trading_sessions(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trading_sessions_open ON trading_sessions(status, entry_time) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_trader_balances_coin ON trader_balances(coin);
CREATE INDEX IF NOT EXISTS idx_daily_leaderboard_date ON daily_leaderboard(date, coin);

-- 트레이더 잔고 초기화 (BTC/ETH 각각 $10,000 시작)
INSERT OR IGNORE INTO trader_balances (expert_id, coin)
SELECT id, coin
FROM expert_profiles
CROSS JOIN (SELECT 'btc' as coin UNION SELECT 'eth') c;
