import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import uvicorn
import os

from src.config import get_settings
from src.web.routes import router as api_router
from src.bot.client import bot_instance
from src.services.scheduler import scheduler

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Amul Stock Tracker Bot...")
    scheduler.start()
    # Note: bot.start() is blocking if awaited directly, but create_task schedules it.
    try:
         asyncio.create_task(bot_instance.start(settings.DISCORD_TOKEN))
    except Exception as e:
        logger.error(f"Failed to start Discord bot: {e}")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down services...")
    scheduler.stop()
    if bot_instance.is_ready():
        await bot_instance.close()

app = FastAPI(lifespan=lifespan)

# Include API Routes
app.include_router(api_router)

# Mount Static Files (Dashboard)
# Verify static directory exists at src/web/static
static_dir = os.path.join(os.path.dirname(__file__), "web", "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)

app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.WEB_PORT, reload=False)
