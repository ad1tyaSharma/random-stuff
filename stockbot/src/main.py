import asyncio
import logging
from src.config import get_settings
from src.web.server import app
from src.bot.client import bot_instance
from src.services.scheduler import scheduler
import uvicorn

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()

async def start_services():
    """Start background services (Bot + Scheduler)"""
    logger.info("🚀 Starting Amul Stock Tracker Bot...")
    
    # Start Scheduler
    scheduler.start()
    
    # Start Discord Bot
    # asyncio.create_task(bot_instance.start(settings.DISCORD_TOKEN))
    # Note: bot.start() is blocking if awaited directly, but create_task schedules it.
    try:
         asyncio.create_task(bot_instance.start(settings.DISCORD_TOKEN))
    except Exception as e:
        logger.error(f"Failed to start Discord bot: {e}")

@app.on_event("startup")
async def on_startup():
    await start_services()

@app.on_event("shutdown")
async def on_shutdown():
    logger.info("🛑 Shutting down services...")
    scheduler.stop()
    if bot_instance.is_ready():
        await bot_instance.close()

if __name__ == "__main__":
    # In development, run this file directly
    uvicorn.run("src.main:app", host="0.0.0.0", port=settings.WEB_PORT, reload=False)
