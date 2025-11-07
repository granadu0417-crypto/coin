import google.generativeai as genai
from app.core.config import settings
from app.db.models import Prediction, PersonaEnum, DirectionEnum, CryptoPrice
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging
import json

logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)


class AIPersona:
    """AI Persona for cryptocurrency analysis"""

    PERSONA_PROMPTS = {
        PersonaEnum.VALUE_INVESTOR: {
            "name": "Value Investor",
            "style": "Warren Buffett",
            "prompt": """You are a value investing expert modeled after Warren Buffett.
Focus on long-term fundamentals, intrinsic value, and conservative risk management.
Analyze: project utility, team credibility, adoption metrics, and market position.
Provide predictions in JSON format with:
- direction: "bullish", "bearish", or "neutral"
- confidence: 0-100 (your confidence level)
- timeframe: "24h", "7d", or "30d"
- reasoning: Brief explanation (2-3 sentences)

Be conservative and focus on established cryptocurrencies.""",
        },
        PersonaEnum.TECHNICAL_ANALYST: {
            "name": "Technical Analyst",
            "style": "Chart Expert",
            "prompt": """You are a technical analysis expert.
Focus on: chart patterns, technical indicators (RSI, MACD, Bollinger Bands), support/resistance levels.
Analyze price action, volume patterns, and momentum indicators.
Provide predictions in JSON format with:
- direction: "bullish", "bearish", or "neutral"
- confidence: 0-100
- timeframe: "24h", "7d", or "30d"
- reasoning: Technical analysis summary (2-3 sentences)

Use data-driven technical signals for your predictions.""",
        },
        PersonaEnum.MOMENTUM_TRADER: {
            "name": "Momentum Trader",
            "style": "Trend Follower",
            "prompt": """You are a momentum trading expert.
Focus on: strong trends, volume surges, breaking news impact, social sentiment spikes.
Look for rapid price movements and capitalize on momentum.
Provide predictions in JSON format with:
- direction: "bullish", "bearish", or "neutral"
- confidence: 0-100
- timeframe: "24h", "7d", or "30d"
- reasoning: Momentum analysis (2-3 sentences)

Be aggressive with clear momentum signals, cautious otherwise.""",
        },
    }

    def __init__(self, persona: PersonaEnum):
        self.persona = persona
        self.model = genai.GenerativeModel("gemini-1.5-flash")
        self.config = self.PERSONA_PROMPTS[persona]

    def get_recent_price_data(self, db: Session, symbol: str, hours: int = 24) -> str:
        """Get recent price data formatted for AI analysis"""
        start_time = datetime.utcnow() - timedelta(hours=hours)

        prices = (
            db.query(CryptoPrice)
            .filter(
                CryptoPrice.symbol == symbol,
                CryptoPrice.exchange == "binance",
                CryptoPrice.timestamp >= start_time,
            )
            .order_by(CryptoPrice.timestamp.desc())
            .limit(100)
            .all()
        )

        if not prices:
            return "No recent price data available."

        # Calculate statistics
        latest = prices[0]
        oldest = prices[-1]
        price_change = ((latest.close - oldest.close) / oldest.close) * 100

        high_24h = max(p.high for p in prices)
        low_24h = min(p.low for p in prices)
        avg_volume = sum(p.volume for p in prices) / len(prices)

        return f"""
Current Price: ${latest.close:,.2f}
24h Change: {price_change:+.2f}%
24h High: ${high_24h:,.2f}
24h Low: ${low_24h:,.2f}
24h Avg Volume: {avg_volume:,.0f}
Current Volume: {latest.volume:,.0f}
"""

    def analyze(self, db: Session, symbol: str, timeframe: str = "24h") -> dict:
        """
        Analyze cryptocurrency and generate prediction
        """
        try:
            # Get price data
            price_data = self.get_recent_price_data(db, symbol)

            # Construct prompt
            prompt = f"""
{self.config['prompt']}

Cryptocurrency: {symbol}

Recent Market Data:
{price_data}

Provide your analysis and prediction for the {timeframe} timeframe.
Return ONLY a JSON object with the exact format:
{{"direction": "bullish|bearish|neutral", "confidence": 0-100, "timeframe": "{timeframe}", "reasoning": "your reasoning here"}}
"""

            # Generate prediction
            response = self.model.generate_content(prompt)
            result_text = response.text.strip()

            # Extract JSON from response
            if "```json" in result_text:
                result_text = result_text.split("```json")[1].split("```")[0].strip()
            elif "```" in result_text:
                result_text = result_text.split("```")[1].split("```")[0].strip()

            result = json.loads(result_text)

            logger.info(
                f"{self.config['name']} prediction for {symbol}: {result['direction']} ({result['confidence']}%)"
            )

            return result

        except Exception as e:
            logger.error(f"Error in {self.config['name']} analysis for {symbol}: {e}")
            return {
                "direction": "neutral",
                "confidence": 0,
                "timeframe": timeframe,
                "reasoning": f"Analysis failed: {str(e)}",
            }

    def save_prediction(self, db: Session, symbol: str, analysis: dict):
        """Save prediction to database"""
        try:
            prediction = Prediction(
                persona=self.persona,
                symbol=symbol,
                direction=DirectionEnum(analysis["direction"]),
                confidence=float(analysis["confidence"]),
                timeframe=analysis["timeframe"],
                reasoning=analysis["reasoning"],
                is_active=True,
            )

            db.add(prediction)
            db.commit()

            logger.info(f"Saved prediction for {symbol} by {self.persona.value}")

        except Exception as e:
            db.rollback()
            logger.error(f"Error saving prediction: {e}")


class AIService:
    """Service for managing all AI personas"""

    def __init__(self):
        self.personas = [
            AIPersona(PersonaEnum.VALUE_INVESTOR),
            AIPersona(PersonaEnum.TECHNICAL_ANALYST),
            AIPersona(PersonaEnum.MOMENTUM_TRADER),
        ]

    async def analyze_all(
        self, db: Session, symbol: str, timeframe: str = "24h"
    ) -> list:
        """
        Get predictions from all AI personas
        """
        predictions = []

        for persona in self.personas:
            analysis = persona.analyze(db, symbol, timeframe)
            persona.save_prediction(db, symbol, analysis)
            predictions.append({"persona": persona.persona.value, "analysis": analysis})

        return predictions


# Singleton instance
ai_service = AIService()
