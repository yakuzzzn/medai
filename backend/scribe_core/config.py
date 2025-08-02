from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # Application settings
    APP_NAME: str = "MedAI Scribe Core"
    DEBUG: bool = False
    VERSION: str = "1.0.0"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Security
    SECRET_KEY: str = "your-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str = "postgresql://medai_user:medai_password@localhost:5432/medai"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"
    WHISPER_MODEL: str = "whisper-1"
    
    # File storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_AUDIO_TYPES: List[str] = ["audio/mpeg", "audio/wav", "audio/m4a"]
    
    # Processing settings
    MAX_PROCESSING_TIME: int = 300  # 5 minutes
    CHUNK_SIZE: int = 4096
    SAMPLE_RATE: int = 16000
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://medai.com"
    ]
    
    # Trusted hosts
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # Feature flags
    ENABLE_REAL_TIME_TRANSCRIPTION: bool = False
    ENABLE_ADVANCED_CODING: bool = True
    ENABLE_ANALYTICS: bool = True
    
    # AI System Prompt
    AI_SYSTEM_PROMPT: str = """You are MedScribe-LLM. Output a concise SOAP note in JSON with keys 'subjective', 'objective', 'assessment', 'plan'. Use ICD-10-CM codes where unambiguous. Language = same as input. Cite confidence 0-1 per section. NEVER store PHI in logs."""
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True) 