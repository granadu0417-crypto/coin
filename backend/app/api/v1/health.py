from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from sqlalchemy import text
import redis
from app.core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint
    Returns the status of database and redis connections
    """
    try:
        # Check database
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    try:
        # Check Redis
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        redis_status = "healthy"
    except Exception as e:
        redis_status = f"unhealthy: {str(e)}"

    return {
        "status": "ok",
        "database": db_status,
        "redis": redis_status,
    }
