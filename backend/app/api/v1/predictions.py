from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Prediction, PersonaEnum, DirectionEnum
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

router = APIRouter()


class PredictionResponse(BaseModel):
    id: int
    persona: PersonaEnum
    symbol: str
    direction: DirectionEnum
    confidence: float
    timeframe: str
    reasoning: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True


class ConsensusResponse(BaseModel):
    symbol: str
    consensus_direction: DirectionEnum
    consensus_confidence: float
    bullish_count: int
    bearish_count: int
    neutral_count: int
    predictions: List[PredictionResponse]


@router.get("/predictions/{symbol}", response_model=List[PredictionResponse])
async def get_predictions(
    symbol: str,
    persona: Optional[PersonaEnum] = None,
    timeframe: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    """
    Get AI predictions for a cryptocurrency
    """
    query = db.query(Prediction).filter(Prediction.symbol == symbol.upper())

    if persona:
        query = query.filter(Prediction.persona == persona)

    if timeframe:
        query = query.filter(Prediction.timeframe == timeframe)

    if active_only:
        query = query.filter(Prediction.is_active == True)

    predictions = query.order_by(Prediction.created_at.desc()).limit(50).all()

    return predictions


@router.get("/predictions/{symbol}/consensus", response_model=ConsensusResponse)
async def get_consensus(
    symbol: str,
    timeframe: str = "24h",
    db: Session = Depends(get_db),
):
    """
    Get consensus prediction from all AI personas
    """
    predictions = (
        db.query(Prediction)
        .filter(
            Prediction.symbol == symbol.upper(),
            Prediction.timeframe == timeframe,
            Prediction.is_active == True,
        )
        .order_by(Prediction.created_at.desc())
        .limit(10)  # Latest predictions from each persona
        .all()
    )

    if not predictions:
        return {
            "symbol": symbol,
            "consensus_direction": "neutral",
            "consensus_confidence": 0,
            "bullish_count": 0,
            "bearish_count": 0,
            "neutral_count": 0,
            "predictions": [],
        }

    # Count directions
    bullish_count = sum(1 for p in predictions if p.direction == DirectionEnum.BULLISH)
    bearish_count = sum(1 for p in predictions if p.direction == DirectionEnum.BEARISH)
    neutral_count = sum(1 for p in predictions if p.direction == DirectionEnum.NEUTRAL)

    # Calculate consensus
    direction_scores = {
        DirectionEnum.BULLISH: sum(
            p.confidence for p in predictions if p.direction == DirectionEnum.BULLISH
        ),
        DirectionEnum.BEARISH: sum(
            p.confidence for p in predictions if p.direction == DirectionEnum.BEARISH
        ),
        DirectionEnum.NEUTRAL: sum(
            p.confidence for p in predictions if p.direction == DirectionEnum.NEUTRAL
        ),
    }

    consensus_direction = max(direction_scores, key=direction_scores.get)
    consensus_confidence = (
        direction_scores[consensus_direction] / len(predictions) if predictions else 0
    )

    return {
        "symbol": symbol,
        "consensus_direction": consensus_direction,
        "consensus_confidence": consensus_confidence,
        "bullish_count": bullish_count,
        "bearish_count": bearish_count,
        "neutral_count": neutral_count,
        "predictions": predictions,
    }
