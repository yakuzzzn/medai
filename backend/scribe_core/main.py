from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import uvicorn
import structlog
from typing import Optional
import os

from .config import settings
from .database import init_db, close_db
from .services.audio_service import AudioService
from .services.transcription_service import TranscriptionService
from .services.summarization_service import SummarizationService
from .services.coding_service import CodingService
from .api.routes import audio, drafts, coding
from .utils.logger import setup_logging

# Setup logging
setup_logging()
logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting MedAI Scribe Core service")
    await init_db()
    logger.info("Database initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down MedAI Scribe Core service")
    await close_db()
    logger.info("Database connection closed")

app = FastAPI(
    title="MedAI Scribe Core",
    description="AI-powered medical documentation service",
    version="1.0.0",
    lifespan=lifespan
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "medai-scribe-core",
        "version": "1.0.0"
    }

# Include routers
app.include_router(audio.router, prefix="/api/v1", tags=["audio"])
app.include_router(drafts.router, prefix="/api/v1", tags=["drafts"])
app.include_router(coding.router, prefix="/api/v1", tags=["coding"])

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("Unhandled exception", exc_info=exc)
    return HTTPException(
        status_code=500,
        detail="Internal server error"
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    ) 