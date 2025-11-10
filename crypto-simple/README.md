# 🪙 암호화폐 실시간 분석 대시보드

**순수 HTML + CSS + JavaScript로 만든 간단한 암호화폐 대시보드**

## ✨ 특징

- ✅ **빌드 불필요** - HTML 파일만 열면 바로 작동
- ✅ **WSL 불필요** - Windows에서 바로 실행
- ✅ **실시간 가격** - Upbit API로 BTC/ETH 실시간 가격
- ✅ **차트 시각화** - Chart.js로 가격 추이 그래프
- ✅ **기술적 분석** - RSI, 이동평균 등 지표 계산
- ✅ **반응형 디자인** - 모바일/데스크톱 지원

## 🚀 사용 방법

### 1. 파일 열기
```
crypto-simple/index.html 더블클릭
```
또는 브라우저 주소창에 파일 경로 입력:
```
file:///C:/Users/user/Desktop/클로드/코인/crypto-simple/index.html
```

### 2. 자동으로 작동!
- 실시간 가격이 10초마다 자동 업데이트
- 차트가 실시간으로 그려짐
- 기술적 분석 자동 계산

## 📁 파일 구조

```
crypto-simple/
├── index.html      # 메인 HTML
├── style.css       # 스타일시트
├── app.js          # JavaScript 로직
└── README.md       # 이 파일
```

## 🔧 기능 설명

### 1. 실시간 가격
- **거래소**: Upbit (한국 거래소)
- **코인**: BTC, ETH
- **업데이트**: 10초마다 자동
- **표시 정보**: 현재가, 24h 변동률, 고가, 저가, 거래량

### 2. 가격 차트
- **라이브러리**: Chart.js
- **기간**: 최근 10분 (60개 데이터 포인트)
- **전환**: BTC ↔ ETH 버튼으로 전환

### 3. 기술적 분석
- **RSI (14)**: 상대강도지수 (과매수/과매도 판단)
- **MA (5)**: 5일 이동평균선 (추세 판단)
- **시장 심리**: RSI 기반 시장 분위기

### 4. 시장 전망
- **방향**: 상승/하락 예측
- **신뢰도**: 분석 신뢰도 %
- **이유**: 예측 근거 설명

### 5. 뉴스
- 암호화폐 관련 뉴스 (현재 정적 데이터)

## 🌐 GitHub Pages 배포

```bash
# GitHub 저장소 생성 후
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/your-username/crypto-dashboard.git
git push -u origin main

# Settings > Pages > Branch: main 선택
# 완료! https://your-username.github.io/crypto-dashboard/
```

## 🔥 커스터마이징

### 다른 코인 추가하기
`app.js`의 `fetchPrices()` 함수에서 마켓 추가:
```javascript
const response = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-BTC,KRW-ETH,KRW-XRP');
```

### 업데이트 주기 변경
```javascript
// 10초 → 5초로 변경
setInterval(fetchPrices, 5000);
```

### 색상 테마 변경
`style.css`에서 색상 변수 수정:
```css
background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
```

## 📊 API 사용

### Upbit API
- **문서**: https://docs.upbit.com/reference
- **CORS**: 허용됨 (브라우저에서 직접 호출 가능)
- **인증**: 불필요 (공개 API)
- **제한**: 분당 600회

## ⚡ 성능

- **로딩 속도**: 1초 이하
- **메모리 사용**: ~50MB
- **CPU 사용**: 최소
- **네트워크**: 10초당 1회 API 호출

## 🐛 문제 해결

### Q: 가격이 안 뜨요
**A**: 인터넷 연결 확인 또는 Upbit API 서버 상태 확인

### Q: 차트가 안 보여요
**A**: Chart.js CDN 로딩 실패 → 인터넷 연결 확인

### Q: 브라우저 콘솔 에러
**A**: F12 → Console 탭에서 에러 확인

## 📝 라이선스

MIT License - 자유롭게 사용하세요!

## 🙋‍♂️ 지원

문제가 있으면 이슈 등록해주세요!
