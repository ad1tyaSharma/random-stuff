import Redis from 'ioredis';
import config from '../config/index.js';

class RedisService {
    constructor() {
        this.client = null;
    }

    async connect() {
        this.client = new Redis(config.redis.url);

        this.client.on('connect', () => {
            console.log('✅ Connected to Redis');
        });

        this.client.on('error', (err) => {
            console.error('❌ Redis error:', err.message);
        });

        return this.client;
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit();
            console.log('📴 Disconnected from Redis');
        }
    }

    // ============ Product Operations ============

    /**
     * Add a product to tracking
     */
    async addProduct(url, productData) {
        const key = `product:${this.urlToKey(url)}`;
        await this.client.hset(key, {
            url: url,
            name: productData.name || 'Unknown Product',
            status: productData.status || 'unknown',
            imageUrl: productData.imageUrl || '',
            lastChecked: Date.now(),
            createdAt: Date.now(),
        });

        // Add to global product set
        await this.client.sadd('products:all', url);

        return true;
    }

    /**
     * Remove a product from tracking (only if no subscribers)
     */
    async removeProduct(url) {
        const subscriberCount = await this.getSubscriberCount(url);

        if (subscriberCount === 0) {
            const key = `product:${this.urlToKey(url)}`;
            await this.client.del(key);
            await this.client.srem('products:all', url);
            return true;
        }

        return false;
    }

    /**
     * Get product data
     */
    async getProduct(url) {
        const key = `product:${this.urlToKey(url)}`;
        const data = await this.client.hgetall(key);

        if (Object.keys(data).length === 0) {
            return null;
        }

        return data;
    }

    /**
     * Get all tracked products
     */
    async getAllProducts() {
        const urls = await this.client.smembers('products:all');
        const products = [];

        for (const url of urls) {
            const product = await this.getProduct(url);
            if (product) {
                const subscribers = await this.getSubscribers(url);
                products.push({ ...product, subscribers });
            }
        }

        return products;
    }

    /**
     * Update product status
     */
    async updateProductStatus(url, status, additionalData = {}) {
        const key = `product:${this.urlToKey(url)}`;
        const exists = await this.client.exists(key);

        if (!exists) {
            return false;
        }

        await this.client.hset(key, {
            status: status,
            lastChecked: Date.now(),
            ...additionalData,
        });

        return true;
    }

    // ============ User Subscription Operations ============

    /**
     * Subscribe a user to a product
     */
    async subscribeUser(userId, url) {
        // Add user to product's subscribers
        await this.client.sadd(`product:${this.urlToKey(url)}:subscribers`, userId);

        // Add product to user's list
        await this.client.sadd(`user:${userId}:products`, url);

        return true;
    }

    /**
     * Unsubscribe a user from a product
     */
    async unsubscribeUser(userId, url) {
        // Remove user from product's subscribers
        await this.client.srem(`product:${this.urlToKey(url)}:subscribers`, userId);

        // Remove product from user's list
        await this.client.srem(`user:${userId}:products`, url);

        // Try to remove product if no subscribers left
        await this.removeProduct(url);

        return true;
    }

    /**
     * Get all subscribers for a product
     */
    async getSubscribers(url) {
        return await this.client.smembers(`product:${this.urlToKey(url)}:subscribers`);
    }

    /**
     * Get subscriber count for a product
     */
    async getSubscriberCount(url) {
        return await this.client.scard(`product:${this.urlToKey(url)}:subscribers`);
    }

    /**
     * Get all products a user is subscribed to
     */
    async getUserProducts(userId) {
        const urls = await this.client.smembers(`user:${userId}:products`);
        const products = [];

        for (const url of urls) {
            const product = await this.getProduct(url);
            if (product) {
                products.push(product);
            }
        }

        return products;
    }

    /**
     * Check if user is subscribed to a product
     */
    async isUserSubscribed(userId, url) {
        return await this.client.sismember(`product:${this.urlToKey(url)}:subscribers`, userId);
    }

    // ============ Utility Methods ============

    /**
     * Convert URL to Redis-safe key
     */
    urlToKey(url) {
        return Buffer.from(url).toString('base64').replace(/[/+=]/g, '_');
    }

    /**
     * Get statistics
     */
    async getStats() {
        const allProducts = await this.client.smembers('products:all');
        let totalSubscribers = 0;
        let inStock = 0;
        let outOfStock = 0;

        for (const url of allProducts) {
            const product = await this.getProduct(url);
            const subscribers = await this.getSubscriberCount(url);
            totalSubscribers += subscribers;

            if (product?.status === 'in_stock') inStock++;
            else if (product?.status === 'out_of_stock') outOfStock++;
        }

        return {
            totalProducts: allProducts.length,
            totalSubscribers,
            inStock,
            outOfStock,
        };
    }
}

// Singleton instance
export const redis = new RedisService();
export default redis;
