from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Discord
    DISCORD_TOKEN: str
    DISCORD_CLIENT_ID: str
    DISCORD_GUILD_ID: str | None = None
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Web
    WEB_PORT: int = 3000
    
    # Checker
    CHECK_INTERVAL_MINUTES: int = 5
    DEFAULT_PINCODE: str = "110001"
    
    # Notification
    NOTIFICATION_TYPE: str = "dm"  # dm or channel
    NOTIFICATION_CHANNEL_ID: str | None = None

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore" 

@lru_cache()
def get_settings():
    return Settings()
