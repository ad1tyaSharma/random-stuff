from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
import asyncio
from src.config import get_settings
from src.services.redis_service import db
from src.services.stock_checker import checker
from src.services.notifier import notifier

settings = get_settings()
logger = logging.getLogger(__name__)

class SchedulerService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running_check = False

    def start(self):
        # Schedule check based on config interval
        trigger = CronTrigger(minute=f"*/{settings.CHECK_INTERVAL_MINUTES}")
        self.scheduler.add_job(self.run_check, trigger)
        self.scheduler.start()
        logger.info(f"⏰ Scheduler started (every {settings.CHECK_INTERVAL_MINUTES} minutes)")
        
        # Initial check after 10s
        asyncio.create_task(self._delayed_initial_check())

    async def _delayed_initial_check(self):
        await asyncio.sleep(10)
        await self.run_check()

    def stop(self):
        self.scheduler.shutdown()
        logger.info("⏹️ Scheduler stopped")

    async def run_check(self):
        if self.is_running_check:
            logger.warning("⚠️ Check already running, skipping...")
            return

        self.is_running_check = True
        logger.info("🔄 Running scheduled stock check...")

        try:
            products = await db.get_all_products()
            
            if not products:
                logger.info("📭 No products to check")
                self.is_running_check = False
                return

            logger.info(f"📦 Checking {len(products)} product(s)...")

            for product in products:
                await self._check_product(product)
                await asyncio.sleep(2)  # Crawl delay

            logger.info("✅ Stock check completed")

        except Exception as e:
            logger.error(f"❌ Error during stock check: {e}")
        finally:
            self.is_running_check = False

    async def _check_product(self, product: dict):
        try:
            url = product['url']
            old_status = product.get('status')
            
            result = await checker.check_stock(url)
            
            if result['status'] == 'error':
                logger.warning(f"⚠️ Error checking {product.get('name')}: {result.get('error')}")
                return

            new_status = result['status']
            
            # Update Redis
            await db.update_product_status(url, new_status, {
                "name": result.get('name') or product.get('name'),
                "imageUrl": result.get('imageUrl') or product.get('imageUrl')
            })

            # Notify if changed
            if old_status != new_status and old_status != 'unknown':
                logger.info(f"📢 Status change: {product.get('name')} - {old_status} -> {new_status}")
                
                subscribers = await db.get_subscribers(url)
                if subscribers:
                    updated_product = await db.get_product(url)
                    await notifier.notify_users(list(subscribers), updated_product, old_status, new_status)

        except Exception as e:
            logger.error(f"❌ Error checking product {product.get('url')}: {e}")

    async def force_check(self):
        logger.info("🔄 Forcing immediate stock check...")
        await self.run_check()

scheduler = SchedulerService()
