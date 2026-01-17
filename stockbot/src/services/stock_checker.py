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
            status = 'unknown'
            is_out_of_stock = False
            
            # Primary Indicators:
            # 1. 'Notify Me' button (.product_enquiry) - Only present when out of stock
            notify_me = page.locator('.product_enquiry')
            
            # 2. 'Add to Cart' button (.add-to-cart) - Present on both, but disabled when out of stock
            add_to_cart = page.locator('.add-to-cart').first
            
            # 3. 'Sold Out' banner specifically in main product area (alert-danger banner)
            sold_out_banner = page.locator('.alert.alert-danger:has-text("Sold Out")')

            if await notify_me.count() > 0 and await notify_me.is_visible():
                is_out_of_stock = True
            elif await sold_out_banner.count() > 0:
                # Banner exists, check visibility
                is_out_of_stock = await sold_out_banner.is_visible()
            elif await add_to_cart.count() > 0:
                # Check for 'disabled' class or attribute
                classes = await add_to_cart.get_attribute('class') or ""
                disabled_attr = await add_to_cart.get_attribute('disabled') or ""
                if 'disabled' in classes.lower() or disabled_attr == 'true' or disabled_attr == '1':
                    is_out_of_stock = True
                else:
                    status = 'in_stock'
            
            if is_out_of_stock:
                status = 'out_of_stock'
            elif status == 'unknown' and await add_to_cart.count() > 0:
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
