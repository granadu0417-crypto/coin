# 🚀 Getting Started Guide

빠른 시작을 위한 단계별 가이드입니다.

## 필수 요구사항

- Docker Desktop (최신 버전)
- Google Gemini API 키 (무료: https://makersuite.google.com/app/apikey)

## 1단계: API 키 설정

1. `.env` 파일을 열고 Gemini API 키를 입력하세요:

```bash
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

다른 API 키들은 선택사항입니다 (Phase 1에서는 필요 없음):
- Binance API는 공개 데이터만 사용하므로 키 없이도 작동합니다
- 나머지 키들은 Phase 2 이후에 필요합니다

## 2단계: Docker로 실행

```bash
# 모든 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f
```

## 3단계: 접속

서비스가 시작되면 다음 주소로 접속하세요:

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

## 4단계: 데이터 수집 대기

처음 실행 시:

1. **가격 데이터**: 1분 후부터 수집 시작
2. **AI 예측**: 첫 실행 후 즉시 생성, 이후 4시간마다 업데이트

## 문제 해결

### 서비스가 시작되지 않는 경우

```bash
# 모든 서비스 중지
docker-compose down

# 볼륨과 함께 완전히 삭제
docker-compose down -v

# 다시 시작
docker-compose up -d --build
```

### 데이터베이스 연결 오류

```bash
# PostgreSQL 상태 확인
docker-compose ps

# 데이터베이스 로그 확인
docker-compose logs postgres
```

### API 키 오류

`.env` 파일에서 `GEMINI_API_KEY`가 올바른지 확인하세요.

## 개발 모드 (선택사항)

Docker 없이 로컬에서 개발하려면:

### 백엔드

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# PostgreSQL과 Redis가 실행 중이어야 함
uvicorn app.main:app --reload
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

## 다음 단계

Phase 1 MVP가 작동하면:

1. 다른 코인 추가
2. 더 많은 AI 페르소나 활성화 (Phase 3)
3. 뉴스 및 소셜 미디어 데이터 추가 (Phase 2)
4. 이벤트 캘린더 통합 (Phase 4)

## 지원

문제가 발생하면 GitHub Issues에 올려주세요!
