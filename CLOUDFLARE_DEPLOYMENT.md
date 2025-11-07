# 🚀 Cloudflare 배포 가이드

완전 무료 Cloudflare 기반 암호화폐 분석 플랫폼 배포 방법

## 📋 사전 준비

1. **Cloudflare 계정** 생성: https://dash.cloudflare.com/sign-up
2. **Node.js 18+** 설치: https://nodejs.org/
3. **Git** 설치 (이미 완료)

## 🔧 1단계: Wrangler CLI 설치

```bash
npm install -g wrangler

# Cloudflare 로그인
wrangler login
```

브라우저가 열리면 Cloudflare 계정으로 로그인하세요.

## 💾 2단계: D1 데이터베이스 생성

```bash
cd workers

# D1 데이터베이스 생성
wrangler d1 create crypto-analysis
```

출력된 `database_id`를 복사하여 `wrangler.toml`의 `database_id` 부분에 붙여넣으세요.

```bash
# 데이터베이스 스키마 적용
wrangler d1 execute crypto-analysis --file=src/db/schema.sql
```

## 🗂️ 3단계: KV Namespace 생성

```bash
# KV 네임스페이스 생성
wrangler kv:namespace create CACHE
```

출력된 `id`를 복사하여 `wrangler.toml`의 KV `id` 부분에 붙여넣으세요.

## 📦 4단계: Workers 배포

```bash
# 의존성 설치
npm install

# 로컬 테스트 (선택사항)
npm run dev

# 배포
npm run deploy
```

배포가 완료되면 Workers URL이 출력됩니다:
```
https://crypto-analysis-api.your-subdomain.workers.dev
```

## 🎨 5단계: Frontend 배포 (Cloudflare Pages)

### 방법 1: GitHub 연동 (추천)

1. Cloudflare Dashboard → Pages 이동
2. "Create a project" 클릭
3. GitHub 저장소 연결
4. Build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `pages-new`
5. Environment variables 설정:
   - `VITE_API_URL`: Workers URL 입력

### 방법 2: 직접 배포

```bash
cd ../pages-new

# 의존성 설치
npm install

# 빌드
npm run build

# 배포
npx wrangler pages deploy dist --project-name=crypto-analysis
```

## ✅ 6단계: 동작 확인

### Workers API 테스트

```bash
# Health check
curl https://crypto-analysis-api.your-subdomain.workers.dev/health

# BTC 가격 조회
curl https://crypto-analysis-api.your-subdomain.workers.dev/api/prices/BTC

# 기술적 분석
curl https://crypto-analysis-api.your-subdomain.workers.dev/api/analysis/BTC

# 뉴스
curl https://crypto-analysis-api.your-subdomain.workers.dev/api/news
```

### Frontend 접속

브라우저에서 Pages URL 접속:
```
https://crypto-analysis.pages.dev
```

## 🔄 업데이트 방법

### Workers 업데이트

```bash
cd workers
npm run deploy
```

### Pages 업데이트

GitHub에 push하면 자동으로 배포됩니다. 또는:

```bash
cd pages-new
npm run build
npx wrangler pages deploy dist
```

## 📊 사용 현황 모니터링

Cloudflare Dashboard에서 실시간 모니터링:

1. **Workers Analytics**: 요청 수, 에러율, CPU 시간
2. **D1 Analytics**: 쿼리 수, 스토리지 사용량
3. **Pages Analytics**: 방문자 수, 대역폭

## 🐛 문제 해결

### Workers 로그 확인

```bash
wrangler tail
```

### D1 데이터 확인

```bash
wrangler d1 execute crypto-analysis --command="SELECT * FROM prices LIMIT 10"
```

### KV 데이터 확인

```bash
wrangler kv:key list --namespace-id=YOUR_KV_ID
```

## 💰 무료 티어 한도

| 서비스 | 무료 한도 | 현재 사용량 (예상) |
|--------|-----------|-------------------|
| Workers Requests | 100,000/일 | ~5,000/일 |
| D1 Reads | 5,000,000/일 | ~50,000/일 |
| D1 Writes | 100,000/일 | ~1,500/일 |
| KV Reads | 100,000/일 | ~10,000/일 |
| KV Writes | 1,000/일 | ~100/일 |
| Pages Builds | 500/월 | ~10/월 |

**총 비용: $0/월** ✅

## 🔒 보안 설정

### CORS 설정

`wrangler.toml`에서 허용할 도메인 설정:

```toml
[vars]
ALLOWED_ORIGINS = "https://crypto-analysis.pages.dev,https://your-custom-domain.com"
```

### 속도 제한 (Rate Limiting)

Cloudflare Dashboard → Security → Rate Limiting에서 설정

## 🌐 커스텀 도메인 연결 (선택사항)

### Pages 커스텀 도메인

1. Cloudflare Dashboard → Pages → Custom domains
2. 도메인 추가
3. DNS 레코드 자동 생성됨

### Workers 커스텀 도메인

1. Routes 메뉴에서 커스텀 도메인 설정
2. `api.yourdomain.com/*` → Workers 연결

## 📝 다음 단계

1. ✅ 기본 배포 완료
2. 🔄 Cron 작업 구현 (가격 업데이트, 뉴스 수집)
3. 📊 더 많은 분석 엔진 추가
4. 🎨 프론트엔드 UI 개선
5. 📱 모바일 최적화

## 🆘 도움말

- **Cloudflare Docs**: https://developers.cloudflare.com/
- **Workers Docs**: https://developers.cloudflare.com/workers/
- **D1 Docs**: https://developers.cloudflare.com/d1/
- **Pages Docs**: https://developers.cloudflare.com/pages/

문제가 발생하면 GitHub Issues에 올려주세요!
