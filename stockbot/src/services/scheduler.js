import cron from 'node-cron';
import config from '../config/index.js';
import redis from './redis.js';
import stockChecker from './stockChecker.js';
import notifier from './notifier.js';

class Scheduler {
    constructor() {
        this.job = null;
        this.isRunning = false;
    }

    /**
     * Start the scheduler
     */
    start() {
        const intervalMinutes = config.checker.intervalMinutes;
        const cronExpression = `*/${intervalMinutes} * * * *`;

        console.log(`⏰ Starting scheduler (every ${intervalMinutes} minutes)`);

        this.job = cron.schedule(cronExpression, async () => {
            await this.runCheck();
        });

        // Run initial check after 10 seconds
        setTimeout(() => this.runCheck(), 10000);
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.job) {
            this.job.stop();
            this.job = null;
            console.log('⏹️ Scheduler stopped');
        }
    }

    /**
     * Run a stock check for all tracked products
     */
    async runCheck() {
        if (this.isRunning) {
            console.log('⚠️ Check already running, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('🔄 Running scheduled stock check...');

        try {
            const products = await redis.getAllProducts();

            if (products.length === 0) {
                console.log('📭 No products to check');
                this.isRunning = false;
                return;
            }

            console.log(`📦 Checking ${products.length} product(s)...`);

            for (const product of products) {
                await this.checkProduct(product);
                // Small delay between checks
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            console.log('✅ Stock check completed');

        } catch (error) {
            console.error('❌ Error during stock check:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Check a single product and notify on status change
     */
    async checkProduct(product) {
        try {
            const oldStatus = product.status;
            const result = await stockChecker.checkStock(product.url);

            if (result.status === 'error') {
                console.log(`⚠️ Error checking ${product.name}: ${result.error}`);
                return;
            }

            const newStatus = result.status;

            // Update product in Redis
            await redis.updateProductStatus(product.url, newStatus, {
                name: result.name || product.name,
                imageUrl: result.imageUrl || product.imageUrl,
            });

            // Check if status changed
            if (oldStatus !== newStatus && oldStatus !== 'unknown') {
                console.log(`📢 Status change: ${product.name} - ${oldStatus} → ${newStatus}`);

                // Get subscribers and notify them
                const subscribers = await redis.getSubscribers(product.url);

                if (subscribers.length > 0) {
                    const updatedProduct = await redis.getProduct(product.url);
                    await notifier.notifyUsers(
                        subscribers,
                        updatedProduct,
                        oldStatus,
                        newStatus
                    );
                }
            }

        } catch (error) {
            console.error(`❌ Error checking product ${product.url}:`, error.message);
        }
    }

    /**
     * Force an immediate check for all products
     */
    async forceCheck() {
        console.log('🔄 Forcing immediate stock check...');
        await this.runCheck();
    }
}

// Singleton instance
export const scheduler = new Scheduler();
export default scheduler;
