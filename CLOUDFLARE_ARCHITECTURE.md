# 🌐 Cloudflare 기반 무료 암호화폐 분석 플랫폼 아키텍처

## 📊 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                  Cloudflare Pages (Frontend)                 │
│                    React + TypeScript                        │
│              https://your-project.pages.dev                  │
└────────────────────┬───────────────────────────────────────┘
                     │ HTTPS API Calls
┌────────────────────┴───────────────────────────────────────┐
│              Cloudflare Workers (Backend API)                │
│                  TypeScript Serverless                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Prices API│  │News API  │  │Analysis  │  │Health    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────┬───────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼──────┐         ┌───────▼──────┐
│ Cloudflare D1 │         │Cloudflare KV │
│  (Database)   │         │   (Cache)    │
│   SQLite      │         │ Key-Value    │
└───────┬───────┘         └──────────────┘
        │
┌───────▼──────────────────────────────────────────────┐
│         Cloudflare Workers Cron Triggers             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │Price Update│  │News Fetch  │  │Analysis Run│     │
│  │Every 1 min │  │Every 5 min │  │Every 30min │     │
│  └────────────┘  └────────────┘  └────────────┘     │
└──────────────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────┐
│              External Free Data Sources               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │Binance API │  │Upbit API   │  │RSS Feeds   │     │
│  │(Public)    │  │(Public)    │  │(Free)      │     │
│  └────────────┘  └────────────┘  └────────────┘     │
└──────────────────────────────────────────────────────┘
```

## 🆓 완전 무료 스택

### Frontend
- **Cloudflare Pages**: 무제한 요청, 500 빌드/월
- **React + TypeScript**: 동일 유지
- **TailwindCSS**: 동일 유지

### Backend
- **Cloudflare Workers**: 100,000 요청/일 (무료)
- **TypeScript**: JavaScript 런타임
- **Hono Framework**: 빠른 웹 프레임워크

### Database & Storage
- **Cloudflare D1**: 5GB 스토리지, 500만 읽기/일
- **Cloudflare KV**: 100,000 읽기/일, 1,000 쓰기/일
- **SQLite**: D1의 기반

### Scheduled Jobs
- **Workers Cron**: 무제한 스케줄 (Workers 할당량 내)

## 📡 무료 데이터 소스

### 1. 거래소 공개 API (인증 불필요)

#### Binance Public API
```
GET https://api.binance.com/api/v3/ticker/24hr
GET https://api.binance.com/api/v3/klines
Rate Limit: 1200 요청/분
```

#### Upbit Public API
```
GET https://api.upbit.com/v1/candles/minutes/1
GET https://api.upbit.com/v1/ticker
Rate Limit: 600 요청/분
```

#### Bithumb Public API
```
GET https://api.bithumb.com/public/ticker/ALL_KRW
Rate Limit: 90 요청/초
```

### 2. 뉴스 RSS 피드

- **CoinDesk**: https://www.coindesk.com/arc/outboundfeeds/rss/
- **CoinTelegraph**: https://cointelegraph.com/rss
- **Bitcoin Magazine**: https://bitcoinmagazine.com/.rss/full/
- **Reddit r/cryptocurrency**: https://www.reddit.com/r/cryptocurrency/.rss
- **Google News Crypto**: https://news.google.com/rss/search?q=cryptocurrency

### 3. 경제 캘린더

- **Investing.com RSS**: 주요 경제 이벤트
- **Forex Factory**: 공개 캘린더 (스크래핑)

## 🤖 AI 대체: 규칙 기반 분석 시스템

### 분석 엔진 구조

```typescript
interface Analyst {
  name: string;
  analyze(data: MarketData): Prediction;
}

// 1. 기술적 분석가
class TechnicalAnalyst {
  - RSI (상대강도지수)
  - MACD (이동평균수렴확산)
  - Bollinger Bands (볼린저 밴드)
  - Moving Averages (이동평균)
  → 과매수/과매도 판단
}

// 2. 모멘텀 트레이더
class MomentumTrader {
  - Price velocity (가격 변화율)
  - Volume surge (거래량 급증)
  - Breakout detection (돌파 감지)
  → 단기 추세 예측
}

// 3. 변동성 분석가
class VolatilityAnalyst {
  - ATR (Average True Range)
  - Standard deviation
  - Support/Resistance levels
  → 리스크 평가
}

// 4. 뉴스 감성 분석가
class SentimentAnalyst {
  - Keyword scoring (긍정/부정 키워드)
  - News frequency (뉴스 빈도)
  - Social mentions (소셜 언급)
  → 시장 심리 판단
}

// 5. 추세 추종자
class TrendFollower {
  - EMA crossovers
  - ADX (추세 강도)
  - Parabolic SAR
  → 중기 추세 방향
}

// 합의 알고리즘
class ConsensusEngine {
  - Weight predictions by confidence
  - Calculate agreement score
  - Identify divergences
  → 종합 의견
}
```

### 기술적 지표 계산

모든 지표는 JavaScript로 직접 구현 (외부 API 불필요):

```typescript
// RSI 계산 예시
function calculateRSI(prices: number[], period: number = 14): number {
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? -c : 0);

  const avgGain = gains.slice(-period).reduce((a, b) => a + b) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b) / period;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// MACD, Bollinger Bands, MA 등도 유사하게 구현
```

### 감성 분석 (키워드 기반)

```typescript
const POSITIVE_KEYWORDS = [
  'bullish', 'surge', 'rally', 'breakthrough', 'adoption',
  'partnership', 'upgrade', 'growth', 'positive', 'gain'
];

const NEGATIVE_KEYWORDS = [
  'bearish', 'crash', 'dump', 'scam', 'hack', 'regulation',
  'ban', 'decline', 'loss', 'negative', 'fear'
];

function analyzeSentiment(text: string): number {
  // -1 (매우 부정) ~ 1 (매우 긍정)
  const lower = text.toLowerCase();
  let score = 0;

  POSITIVE_KEYWORDS.forEach(kw => {
    score += (lower.match(new RegExp(kw, 'g')) || []).length;
  });

  NEGATIVE_KEYWORDS.forEach(kw => {
    score -= (lower.match(new RegExp(kw, 'g')) || []).length;
  });

  return Math.max(-1, Math.min(1, score / 10));
}
```

## 🗄️ Cloudflare D1 스키마

```sql
-- 가격 데이터
CREATE TABLE prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  exchange TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  volume REAL NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_prices_symbol_time ON prices(symbol, timestamp);

-- 예측 데이터
CREATE TABLE predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  analyst TEXT NOT NULL,
  symbol TEXT NOT NULL,
  direction TEXT NOT NULL,
  confidence REAL NOT NULL,
  timeframe TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  is_active INTEGER DEFAULT 1
);

CREATE INDEX idx_predictions_symbol ON predictions(symbol, is_active);

-- 뉴스 데이터
CREATE TABLE news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  content TEXT,
  sentiment_score REAL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_news_published ON news(published_at);

-- 감성 분석 집계
CREATE TABLE sentiment_aggregates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  sentiment_score REAL NOT NULL,
  sample_size INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_sentiment_symbol_time ON sentiment_aggregates(symbol, timestamp);
```

## 📦 프로젝트 구조

```
crypto-analysis-cloudflare/
├── workers/                 # Cloudflare Workers (Backend)
│   ├── src/
│   │   ├── index.ts        # Main worker entry
│   │   ├── api/
│   │   │   ├── prices.ts
│   │   │   ├── predictions.ts
│   │   │   ├── news.ts
│   │   │   └── health.ts
│   │   ├── services/
│   │   │   ├── exchanges/
│   │   │   │   ├── binance.ts
│   │   │   │   ├── upbit.ts
│   │   │   │   └── bithumb.ts
│   │   │   ├── rss/
│   │   │   │   └── aggregator.ts
│   │   │   ├── analysis/
│   │   │   │   ├── technical.ts
│   │   │   │   ├── momentum.ts
│   │   │   │   ├── volatility.ts
│   │   │   │   ├── sentiment.ts
│   │   │   │   ├── trend.ts
│   │   │   │   └── consensus.ts
│   │   │   └── indicators/
│   │   │       ├── rsi.ts
│   │   │       ├── macd.ts
│   │   │       ├── bollinger.ts
│   │   │       └── ma.ts
│   │   ├── db/
│   │   │   ├── schema.sql
│   │   │   └── queries.ts
│   │   ├── cron/
│   │   │   ├── update-prices.ts
│   │   │   ├── fetch-news.ts
│   │   │   └── run-analysis.ts
│   │   └── types/
│   │       └── index.ts
│   ├── wrangler.toml
│   ├── package.json
│   └── tsconfig.json
│
├── pages/                   # Cloudflare Pages (Frontend)
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── types/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── shared/                  # 공유 타입/유틸
│   └── types.ts
│
└── README.md
```

## ⚙️ Cloudflare 설정

### wrangler.toml (Workers)

```toml
name = "crypto-analysis-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "crypto-analysis"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"

[triggers]
crons = [
  "*/1 * * * *",   # Update prices every 1 minute
  "*/5 * * * *",   # Fetch news every 5 minutes
  "*/30 * * * *"   # Run analysis every 30 minutes
]
```

## 🚀 배포 프로세스

### 1. Workers 배포
```bash
cd workers
npm install
wrangler d1 create crypto-analysis
wrangler d1 execute crypto-analysis --file=src/db/schema.sql
wrangler deploy
```

### 2. Pages 배포
```bash
cd pages
npm install
npm run build
wrangler pages deploy dist
```

## 💰 비용 분석 (무료 티어)

| 서비스 | 무료 한도 | 예상 사용량 | 상태 |
|--------|-----------|-------------|------|
| Workers | 100K 요청/일 | ~10K/일 | ✅ 여유 |
| D1 | 500만 읽기/일 | ~50K/일 | ✅ 여유 |
| KV | 100K 읽기/일 | ~20K/일 | ✅ 여유 |
| Pages | 500 빌드/월 | ~10/월 | ✅ 여유 |

**총 비용: $0/월** 🎉

## 🎯 구현 우선순위

### Phase 1: Core Infrastructure (1-2주)
1. Cloudflare Workers 기본 설정
2. D1 데이터베이스 스키마
3. Binance 공개 API 연동
4. 기본 가격 데이터 수집

### Phase 2: Analysis Engine (1-2주)
1. 기술적 지표 구현 (RSI, MACD, MA)
2. 5개 분석가 엔진 구현
3. 합의 알고리즘

### Phase 3: News & Sentiment (1주)
1. RSS 피드 수집
2. 키워드 기반 감성 분석
3. 뉴스 타임라인

### Phase 4: Frontend (1주)
1. React 프론트엔드 적응
2. Cloudflare Pages 배포
3. 최종 통합 테스트

**총 예상 기간: 4-6주**

## 📊 성능 목표

- API 응답 시간: <100ms (Cloudflare Edge)
- 가격 업데이트: 1분마다
- 뉴스 업데이트: 5분마다
- 분석 실행: 30분마다
- 99.9% 가동률 (Cloudflare SLA)
