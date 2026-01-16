import puppeteer from 'puppeteer';
import config from '../config/index.js';

class StockChecker {
    constructor() {
        this.browser = null;
    }

    /**
     * Initialize the browser instance
     */
    async init() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                ],
            });
            console.log('🌐 Puppeteer browser initialized');
        }
        return this.browser;
    }

    /**
     * Close the browser instance
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('🌐 Puppeteer browser closed');
        }
    }

    /**
     * Validate if URL is a valid Amul product URL
     */
    isValidAmulUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname === 'shop.amul.com' && url.includes('/product/');
        } catch {
            return false;
        }
    }

    /**
     * Check stock status for a product URL
     * @param {string} url - The Amul product URL
     * @returns {Object} - { status: 'in_stock' | 'out_of_stock' | 'error', name, imageUrl, error? }
     */
    async checkStock(url) {
        if (!this.isValidAmulUrl(url)) {
            return {
                status: 'error',
                error: 'Invalid Amul product URL',
            };
        }

        await this.init();
        const page = await this.browser.newPage();

        try {
            // Set viewport and user agent
            await page.setViewport({ width: 1280, height: 800 });
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            );

            // Navigate to product page
            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait for Vue.js to render
            await page.waitForTimeout(3000);

            // Check if pincode popup appears and handle it
            const pincodeInput = await page.$('#search');
            if (pincodeInput) {
                // Try to set pincode
                await this.handlePincodePopup(page);
                await page.waitForTimeout(2000);
            }

            // Extract product information
            const result = await page.evaluate(() => {
                const getTextContent = (selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.textContent.trim() : null;
                };

                // Get product name
                const productName = getTextContent('h1') ||
                    getTextContent('.product-title') ||
                    getTextContent('[itemprop="name"]') ||
                    document.title.split('|')[0].trim();

                // Get product image
                const imageEl = document.querySelector('.product-image img') ||
                    document.querySelector('[itemprop="image"]') ||
                    document.querySelector('.carousel-item.active img');
                const imageUrl = imageEl ? imageEl.src : null;

                // Check stock status - Look for indicators
                const pageText = document.body.innerText.toLowerCase();
                const hasNotifyMe = pageText.includes('notify me');
                const hasSoldOut = pageText.includes('sold out');
                const hasAddToCart = pageText.includes('add to cart');

                // Check for specific button classes
                const notifyMeButton = document.querySelector('.product_enquiry');
                const addToCartButton = document.querySelector('.add-to-cart');
                const soldOutBadge = document.querySelector('.stock-indicator');

                let status = 'unknown';

                if (hasNotifyMe || hasSoldOut || notifyMeButton) {
                    status = 'out_of_stock';
                } else if (hasAddToCart || addToCartButton) {
                    status = 'in_stock';
                }

                return {
                    name: productName,
                    imageUrl: imageUrl,
                    status: status,
                    debug: {
                        hasNotifyMe,
                        hasSoldOut,
                        hasAddToCart,
                    }
                };
            });

            return result;

        } catch (error) {
            console.error(`❌ Error checking stock for ${url}:`, error.message);
            return {
                status: 'error',
                error: error.message,
            };
        } finally {
            await page.close();
        }
    }

    /**
     * Handle the pincode popup that appears on Amul website
     */
    async handlePincodePopup(page) {
        try {
            const pincode = config.checker.defaultPincode;

            // Type pincode in search field
            await page.type('#search', pincode, { delay: 50 });
            await page.waitForTimeout(1000);

            // Press Enter or click on suggestion
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1500);

            // Try clicking on first suggestion if it appears
            const suggestion = await page.$('.pac-item');
            if (suggestion) {
                await suggestion.click();
            }

        } catch (error) {
            console.log('⚠️ Could not handle pincode popup:', error.message);
        }
    }

    /**
     * Batch check multiple products
     */
    async checkMultipleProducts(urls) {
        const results = [];

        for (const url of urls) {
            const result = await this.checkStock(url);
            results.push({ url, ...result });

            // Small delay between checks to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    }
}

// Singleton instance
export const stockChecker = new StockChecker();
export default stockChecker;
