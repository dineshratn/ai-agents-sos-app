"""Configuration for the multi-agent system."""
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env")

class Config:
    """Application configuration."""

    # OpenRouter API
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

    # AI Model
    MODEL_NAME = "deepseek/deepseek-chat"

    # Server
    HOST = "0.0.0.0"
    PORT = 8000

    # Site info for OpenRouter
    SITE_URL = os.getenv("SITE_URL", "http://localhost:3000")
    SITE_NAME = "SOS Emergency App - Multi-Agent System"

    # Agent settings
    TEMPERATURE = 0.3
    MAX_TOKENS = 1000

    # SSL verification (set to False for corporate proxies like Zscaler)
    # WARNING: Only disable in development environments
    VERIFY_SSL = os.getenv("VERIFY_SSL", "true").lower() != "false"

    @classmethod
    def validate(cls):
        """Validate required configuration."""
        if not cls.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY is not set in environment variables")
        if not cls.VERIFY_SSL:
            print("⚠️  WARNING: SSL verification is disabled. Only use in development!")
        return True

# Validate config on import
try:
    Config.validate()
    print("✅ Configuration validated successfully")
except ValueError as e:
    print(f"⚠️  Configuration error: {e}")
