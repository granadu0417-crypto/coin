from celery import Celery
from celery.schedules import crontab
from app.core.config import settings
from app.db.session import SessionLocal
from app.services.binance_service import binance_service
from app.services.ai_service import ai_service
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Celery app
celery_app = Celery(
    "crypto_analysis",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(name="update_price_data")
def update_price_data():
    """
    Fetch and update price data from Binance
    Runs every 1 minute
    """
    logger.info("Starting price data update...")
    db = SessionLocal()
    try:
        asyncio.run(binance_service.update_price_data(db))
        logger.info("Price data update completed")
    except Exception as e:
        logger.error(f"Error updating price data: {e}")
    finally:
        db.close()


@celery_app.task(name="generate_predictions")
def generate_predictions():
    """
    Generate AI predictions for top cryptocurrencies
    Runs every 4 hours to control LLM costs
    """
    logger.info("Starting AI predictions generation...")
    db = SessionLocal()
    try:
        symbols = ["BTC", "ETH", "BNB", "SOL", "XRP"]
        for symbol in symbols:
            logger.info(f"Generating predictions for {symbol}...")
            asyncio.run(ai_service.analyze_all(db, symbol, timeframe="24h"))

        logger.info("AI predictions completed")
    except Exception as e:
        logger.error(f"Error generating predictions: {e}")
    finally:
        db.close()


@celery_app.task(name="cleanup_old_data")
def cleanup_old_data():
    """
    Clean up old data to save storage
    Runs daily at 2 AM
    """
    logger.info("Starting data cleanup...")
    db = SessionLocal()
    try:
        from datetime import datetime, timedelta
        from app.db.models import CryptoPrice, Prediction

        # Delete price data older than 30 days
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        deleted_prices = (
            db.query(CryptoPrice)
            .filter(CryptoPrice.timestamp < cutoff_date)
            .delete()
        )

        # Deactivate old predictions
        old_predictions = (
            db.query(Prediction).filter(Prediction.created_at < cutoff_date).all()
        )
        for pred in old_predictions:
            pred.is_active = False

        db.commit()
        logger.info(f"Cleaned up {deleted_prices} old price records")

    except Exception as e:
        db.rollback()
        logger.error(f"Error cleaning up data: {e}")
    finally:
        db.close()


# Configure periodic tasks
celery_app.conf.beat_schedule = {
    "update-prices-every-minute": {
        "task": "update_price_data",
        "schedule": 60.0,  # Every 60 seconds
    },
    "generate-predictions-every-4-hours": {
        "task": "generate_predictions",
        "schedule": crontab(minute=0, hour="*/4"),  # Every 4 hours
    },
    "cleanup-old-data-daily": {
        "task": "cleanup_old_data",
        "schedule": crontab(minute=0, hour=2),  # Daily at 2 AM
    },
}
