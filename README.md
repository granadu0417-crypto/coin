# 🚀 Crypto Analysis Platform

AI-powered cryptocurrency analysis platform with multiple expert personas, real-time data aggregation, and event tracking.

## 📋 Features

- **Real-time Data**: Live price updates from Binance, Upbit, Bithumb, Coinbase
- **AI Expert Personas**: 7 different trading experts with unique strategies
- **Sentiment Analysis**: News and social media sentiment tracking
- **Event Calendar**: Economic events (FOMC, CPI) with impact analysis
- **Unified Dashboard**: All data sources in one place

## 🛠️ Tech Stack

### Frontend
- React 18 + TypeScript
- TailwindCSS
- TradingView Lightweight Charts
- Socket.io-client

### Backend
- Python 3.11+ with FastAPI
- Celery + Redis
- PostgreSQL + TimescaleDB
- ccxt (Exchange APIs)
- LangChain + Gemini Flash

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Run with Docker

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your API keys
nano .env

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Local Development

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📁 Project Structure

```
crypto-analysis-platform/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── api/         # API routes
│   │   ├── core/        # Config, security
│   │   ├── db/          # Database models
│   │   ├── services/    # Business logic
│   │   └── main.py      # FastAPI app
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API clients
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml   # Docker orchestration
├── .env.example         # Environment template
└── README.md
```

## 🔑 Environment Variables

See `.env.example` for all required variables:
- `GEMINI_API_KEY`: Google Gemini API key
- `BINANCE_API_KEY`, `BINANCE_API_SECRET`: Binance API credentials
- `UPBIT_ACCESS_KEY`, `UPBIT_SECRET_KEY`: Upbit API credentials
- `CRYPTOPANIC_API_KEY`: CryptoPanic news API key
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string

## 📊 Development Phases

- [x] **Phase 1**: MVP - Single exchange, basic dashboard, 3 AI personas (Current)
- [ ] **Phase 2**: Multi-source data - Korean exchanges, news, social media
- [ ] **Phase 3**: AI persona system - 7 experts with consensus view
- [ ] **Phase 4**: Event calendar - Economic events with impact analysis
- [ ] **Phase 5**: Polish - Performance, monitoring, mobile responsive

## 📝 License

MIT License - Personal use only

## ⚠️ Disclaimer

This platform provides analysis and predictions for informational purposes only. It does NOT constitute financial advice. Always do your own research before making investment decisions.
