import ccxt
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.models import CryptoPrice
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class BinanceService:
    """Service for fetching cryptocurrency data from Binance"""

    def __init__(self):
        self.exchange = ccxt.binance(
            {
                "apiKey": settings.BINANCE_API_KEY,
                "secret": settings.BINANCE_API_SECRET,
                "enableRateLimit": True,
            }
        )
        # Top 10 cryptocurrencies to track
        self.symbols = [
            "BTC/USDT",
            "ETH/USDT",
            "BNB/USDT",
            "XRP/USDT",
            "SOL/USDT",
            "ADA/USDT",
            "DOGE/USDT",
            "AVAX/USDT",
            "DOT/USDT",
            "MATIC/USDT",
        ]

    async def fetch_ohlcv(
        self, symbol: str, timeframe: str = "1m", limit: int = 100
    ) -> list:
        """
        Fetch OHLCV (Open, High, Low, Close, Volume) data
        """
        try:
            ohlcv = await asyncio.to_thread(
                self.exchange.fetch_ohlcv, symbol, timeframe, limit=limit
            )
            return ohlcv
        except Exception as e:
            logger.error(f"Error fetching OHLCV for {symbol}: {e}")
            return []

    def save_price_data(self, db: Session, symbol: str, ohlcv_data: list):
        """
        Save price data to database
        """
        try:
            for candle in ohlcv_data:
                timestamp = datetime.fromtimestamp(candle[0] / 1000)

                # Check if data already exists
                existing = (
                    db.query(CryptoPrice)
                    .filter(
                        CryptoPrice.symbol == symbol.replace("/USDT", ""),
                        CryptoPrice.exchange == "binance",
                        CryptoPrice.timestamp == timestamp,
                    )
                    .first()
                )

                if not existing:
                    price = CryptoPrice(
                        symbol=symbol.replace("/USDT", ""),
                        exchange="binance",
                        timestamp=timestamp,
                        open=float(candle[1]),
                        high=float(candle[2]),
                        low=float(candle[3]),
                        close=float(candle[4]),
                        volume=float(candle[5]),
                    )
                    db.add(price)

            db.commit()
            logger.info(f"Saved {len(ohlcv_data)} price records for {symbol}")

        except Exception as e:
            db.rollback()
            logger.error(f"Error saving price data for {symbol}: {e}")

    async def fetch_ticker(self, symbol: str) -> dict:
        """
        Fetch current ticker information
        """
        try:
            ticker = await asyncio.to_thread(self.exchange.fetch_ticker, symbol)
            return ticker
        except Exception as e:
            logger.error(f"Error fetching ticker for {symbol}: {e}")
            return {}

    async def fetch_all_tickers(self) -> dict:
        """
        Fetch tickers for all tracked symbols
        """
        tickers = {}
        for symbol in self.symbols:
            ticker = await self.fetch_ticker(symbol)
            if ticker:
                tickers[symbol] = ticker
        return tickers

    async def update_price_data(self, db: Session):
        """
        Update price data for all tracked symbols
        """
        for symbol in self.symbols:
            logger.info(f"Fetching data for {symbol}")
            ohlcv = await self.fetch_ohlcv(symbol, timeframe="1m", limit=100)
            if ohlcv:
                self.save_price_data(db, symbol, ohlcv)
            await asyncio.sleep(1)  # Rate limiting


# Singleton instance
binance_service = BinanceService()
