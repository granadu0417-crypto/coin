from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, Enum
from sqlalchemy.sql import func
import enum
from app.db.session import Base


class DirectionEnum(str, enum.Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class PersonaEnum(str, enum.Enum):
    VALUE_INVESTOR = "value_investor"
    TECHNICAL_ANALYST = "technical_analyst"
    MOMENTUM_TRADER = "momentum_trader"
    CONTRARIAN = "contrarian"
    MACRO_ECONOMIST = "macro_economist"
    QUANT_ANALYST = "quant_analyst"
    RISK_MANAGER = "risk_manager"


class SentimentEnum(str, enum.Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"


class CryptoPrice(Base):
    """Time-series price data for cryptocurrencies"""
    __tablename__ = "crypto_prices"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    exchange = Column(String(50), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    open = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    low = Column(Float, nullable=False)
    close = Column(Float, nullable=False)
    volume = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Prediction(Base):
    """AI persona predictions"""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    persona = Column(Enum(PersonaEnum), nullable=False, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    direction = Column(Enum(DirectionEnum), nullable=False)
    confidence = Column(Float, nullable=False)  # 0-100
    timeframe = Column(String(20), nullable=False)  # "24h", "7d", "30d"
    reasoning = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    target_date = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True)


class NewsArticle(Base):
    """Cryptocurrency news articles"""
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    url = Column(String(1000), nullable=False, unique=True)
    source = Column(String(100), nullable=False)
    published_at = Column(DateTime(timezone=True), nullable=False, index=True)
    content = Column(Text, nullable=True)
    symbols = Column(String(200), nullable=True)  # Comma-separated
    sentiment_score = Column(Float, nullable=True)  # -1 to 1
    sentiment_label = Column(Enum(SentimentEnum), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SentimentAnalysis(Base):
    """Aggregated sentiment analysis"""
    __tablename__ = "sentiment_analysis"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False, index=True)
    source = Column(String(50), nullable=False)  # "news", "reddit", "twitter"
    timeframe = Column(String(20), nullable=False)  # "1h", "24h", "7d"
    sentiment_score = Column(Float, nullable=False)  # -1 to 1
    sentiment_label = Column(Enum(SentimentEnum), nullable=False)
    sample_size = Column(Integer, nullable=False)  # Number of items analyzed
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
