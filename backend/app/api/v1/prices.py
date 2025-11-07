from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import CryptoPrice
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

router = APIRouter()


class PriceResponse(BaseModel):
    id: int
    symbol: str
    exchange: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float

    class Config:
        from_attributes = True


@router.get("/prices/{symbol}", response_model=List[PriceResponse])
async def get_prices(
    symbol: str,
    exchange: Optional[str] = "binance",
    hours: int = Query(24, description="Hours of historical data"),
    db: Session = Depends(get_db),
):
    """
    Get historical price data for a cryptocurrency
    """
    start_time = datetime.utcnow() - timedelta(hours=hours)

    prices = (
        db.query(CryptoPrice)
        .filter(
            CryptoPrice.symbol == symbol.upper(),
            CryptoPrice.exchange == exchange,
            CryptoPrice.timestamp >= start_time,
        )
        .order_by(CryptoPrice.timestamp.desc())
        .limit(1000)
        .all()
    )

    return prices


@router.get("/prices/{symbol}/latest", response_model=PriceResponse)
async def get_latest_price(
    symbol: str,
    exchange: Optional[str] = "binance",
    db: Session = Depends(get_db),
):
    """
    Get the latest price for a cryptocurrency
    """
    price = (
        db.query(CryptoPrice)
        .filter(
            CryptoPrice.symbol == symbol.upper(),
            CryptoPrice.exchange == exchange,
        )
        .order_by(CryptoPrice.timestamp.desc())
        .first()
    )

    if not price:
        return {"error": "Price not found"}

    return price
