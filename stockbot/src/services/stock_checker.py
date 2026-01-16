from playwright.async_api import async_playwright
import logging
from src.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class StockChecker:
    def __init__(self):
        self.playwright = None
        self.browser = None

    async def start(self):
        if not self.playwright:
            self.playwright = await async_playwright().start()
            # Launch chromium. Set headless=True for production
            self.browser = await self.playwright.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
            logger.info("🌐 Playwright browser initialized")

    async def stop(self):
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("🌐 Playwright browser stopped")

    def is_valid_amul_url(self, url: str) -> bool:
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            return parsed.hostname == 'shop.amul.com' and '/product/' in parsed.path
        except:
            return False

    async def check_stock(self, url: str):
        if not self.browser:
            await self.start()
        
        context = await self.browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800}
        )
        page = await context.new_page()

        try:
            # Set default timeout to 30s
            page.set_default_timeout(30000)
            
            await page.goto(url, wait_until='networkidle')
            await page.wait_for_timeout(3000) # Wait for Vue hydration

            # Handle Pincode if Present
            try:
                pincode_input = page.locator('#search')
                if await pincode_input.count() > 0 and await pincode_input.is_visible():
                    logger.info("Pincode popup detected, entering pincode...")
                    await pincode_input.fill(settings.DEFAULT_PINCODE)
                    await page.wait_for_timeout(1000)
                    await page.keyboard.press('Enter')
                    await page.wait_for_timeout(2000)
                    
                    # Click first suggestion if exists
                    suggestion = page.locator('.pac-item').first
                    if await suggestion.count() > 0 and await suggestion.is_visible():
                         await suggestion.click()
                         await page.wait_for_timeout(2000)
            except Exception as e:
                logger.warning(f"Pincode handling issue: {e}")

            # Extract Data
            
            # Product Name
            name = await page.title()
            h1 = page.locator('h1')
            if await h1.count() > 0:
                name = await h1.text_content()
            name = name.strip().split('|')[0].strip()

            # Image
            image_url = ""
            img = page.locator('.product-image img').first
            if await img.count() > 0:
                 image_url = await img.get_attribute('src')
            
            # Stock Status Logic
            page_text = (await page.content()).lower()
            
            status = 'unknown'
            
            # Check for Notify Me (Out of Stock)
            has_notify_me = "notify me" in page_text or await page.locator('.product_enquiry').count() > 0
            has_sold_out = "sold out" in page_text
            
            # Check for Add to Cart (In Stock)
            has_add_to_cart = "add to cart" in page_text or await page.locator('.add-to-cart').count() > 0

            if has_notify_me or has_sold_out:
                status = 'out_of_stock'
            elif has_add_to_cart:
                status = 'in_stock'

            return {
                "status": status,
                "name": name,
                "imageUrl": image_url,
                "error": None
            }

        except Exception as e:
            logger.error(f"Error checking stock for {url}: {e}")
            return {
                "status": "error",
                "error": str(e),
                "name": "Unknown",
                "imageUrl": ""
            }
        finally:
            await context.close()

checker = StockChecker()
