# 🚀 Cloudflare Workers AI 전문가 시스템 배포 가이드

24/7 자동 학습 AI 전문가 시스템을 Cloudflare Workers에 배포하는 방법입니다.

## 📋 사전 준비

1. **Cloudflare 계정** (무료)
2. **Node.js** 설치 (v18 이상)
3. **Wrangler CLI** 설치:
   ```bash
   npm install -g wrangler
   ```

## 🔧 Step 1: D1 데이터베이스 초기화

workers 폴더로 이동:
```bash
cd /mnt/c/Users/user/Desktop/클로드/코인/workers
```

D1 데이터베이스 생성 (이미 있다면 Skip):
```bash
wrangler d1 create crypto-analysis
```

schema.sql 실행하여 테이블 생성:
```bash
wrangler d1 execute crypto-analysis --file=schema.sql
```

초기화 확인:
```bash
wrangler d1 execute crypto-analysis --command="SELECT * FROM expert_profiles"
```

예상 결과: 10명의 전문가 프로필이 출력되어야 함

## 📦 Step 2: 의존성 설치

```bash
npm install
```

## 🔨 Step 3: TypeScript 빌드 확인

```bash
npm run build
```

빌드 성공 확인 후 계속 진행

## 🚀 Step 4: Cloudflare Workers 배포

```bash
wrangler deploy
```

배포 성공 시 출력 예시:
```
✨ Compiled Worker successfully
🌍 Uploading...
⬆️  Uploading complete
Published crypto-analysis-api
  https://crypto-analysis-api.YOUR-SUBDOMAIN.workers.dev
```

## ✅ Step 5: 배포 검증

### 5.1 Health Check
```bash
curl https://crypto-analysis-api.YOUR-SUBDOMAIN.workers.dev/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "version": "1.0.0"
}
```

### 5.2 AI Experts 조회
```bash
curl https://crypto-analysis-api.YOUR-SUBDOMAIN.workers.dev/api/ai/experts
```

예상 응답: 10명의 전문가 목록 (통계는 아직 0일 수 있음)

### 5.3 Cron Job 확인
Cloudflare Dashboard → Workers → crypto-analysis-api → Logs 에서 확인

매 1분마다 다음과 같은 로그가 출력되어야 함:
```
⏰ Cron triggered: */1 * * * *
🤖 AI 전문가 자동 학습 시작
💰 현재 가격: BTC $..., ETH $...
📊 BTC 5m 컨센서스: LONG (60%) - L:6 S:2 N:2
✨ AI 전문가 자동 학습 완료
```

## 🎯 Step 6: 프론트엔드 연동

`crypto-simple/app.js` 파일의 WORKERS_API_URL을 배포된 URL로 수정:

```javascript
const WORKERS_API_URL = 'https://crypto-analysis-api.YOUR-SUBDOMAIN.workers.dev';
```

브라우저에서 `index.html` 열기 → Page 2 (전문가 통계) 이동

"🌐 서버 기반 AI 전문가 (24/7 자동 학습 중)" 섹션이 표시되어야 함

## 📊 학습 데이터 확인

최소 30분 정도 기다린 후:

```bash
curl https://crypto-analysis-api.YOUR-SUBDOMAIN.workers.dev/api/ai/experts
```

각 전문가의 통계가 채워지기 시작함:
```json
{
  "experts": [
    {
      "id": 1,
      "name": "RSI 전문가",
      "stats": {
        "5m": {
          "totalPredictions": 30,
          "successCount": 18,
          "failCount": 12,
          "successRate": 60.0
        }
      }
    }
  ]
}
```

## 🔍 문제 해결

### D1 데이터베이스 오류
```bash
# 데이터베이스 삭제 후 재생성
wrangler d1 delete crypto-analysis
wrangler d1 create crypto-analysis
wrangler d1 execute crypto-analysis --file=schema.sql
```

### Cron이 실행되지 않음
Cloudflare Dashboard에서 Cron Triggers 확인:
- Workers → crypto-analysis-api → Triggers → Cron Triggers
- `*/1 * * * *` 가 활성화되어 있는지 확인

### API 호출 CORS 오류
wrangler.toml에 CORS 설정 추가 (이미 코드에 포함됨):
```typescript
app.use('*', cors());
```

### TypeScript 빌드 오류
```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📈 성능 최적화

### 1. D1 인덱스 확인
```bash
wrangler d1 execute crypto-analysis --command="SELECT name FROM sqlite_master WHERE type='index'"
```

### 2. Cron 로그 모니터링
```bash
wrangler tail
```

실시간 로그 확인으로 성능 병목 지점 파악

### 3. KV 캐싱 활용 (선택사항)
자주 조회되는 데이터를 KV에 캐싱하여 D1 부하 감소:

```typescript
// 캐시 먼저 확인
const cached = await env.CACHE.get('expert_stats');
if (cached) return JSON.parse(cached);

// D1에서 조회
const data = await getAllExpertStats(env.DB);

// 캐시 저장 (1분 TTL)
await env.CACHE.put('expert_stats', JSON.stringify(data), { expirationTtl: 60 });
```

## 🎉 배포 완료!

이제 AI 전문가 시스템이 24/7 자동으로 학습합니다:

✅ 매 1분마다 BTC/ETH 예측 생성
✅ 30초 후 자동 검증
✅ 실시간 가중치 학습
✅ D1에 영구 저장
✅ 브라우저 닫아도 계속 학습

프론트엔드에서 실시간으로 통계를 확인하세요! 🚀
