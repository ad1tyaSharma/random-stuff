import express from 'express';
import redis from '../../services/redis.js';
import stockChecker from '../../services/stockChecker.js';
import scheduler from '../../services/scheduler.js';

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: Date.now(),
        uptime: process.uptime(),
    });
});

/**
 * GET /api/products
 * Get all tracked products
 */
router.get('/products', async (req, res) => {
    try {
        const products = await redis.getAllProducts();
        res.json({
            success: true,
            count: products.length,
            products,
        });
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * POST /api/products
 * Add a new product to track
 */
router.post('/products', async (req, res) => {
    try {
        const { url, userId } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required',
            });
        }

        // Validate URL
        if (!stockChecker.isValidAmulUrl(url)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Amul product URL',
            });
        }

        // Check current stock status
        const result = await stockChecker.checkStock(url);

        if (result.status === 'error') {
            return res.status(400).json({
                success: false,
                error: result.error,
            });
        }

        // Add product
        await redis.addProduct(url, {
            name: result.name,
            status: result.status,
            imageUrl: result.imageUrl,
        });

        // If userId provided, subscribe them
        if (userId) {
            await redis.subscribeUser(userId, url);
        }

        const product = await redis.getProduct(url);

        res.json({
            success: true,
            message: 'Product added successfully',
            product,
        });

    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * DELETE /api/products
 * Remove a product from tracking
 */
router.delete('/products', async (req, res) => {
    try {
        const { url, userId } = req.body;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required',
            });
        }

        if (userId) {
            // Unsubscribe specific user
            await redis.unsubscribeUser(userId, url);
        } else {
            // Force remove product (for admin)
            const key = `product:${redis.urlToKey(url)}`;
            await redis.client.del(key);
            await redis.client.srem('products:all', url);
        }

        res.json({
            success: true,
            message: 'Product removed successfully',
        });

    } catch (error) {
        console.error('Error removing product:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/status/:url
 * Check stock status for a specific URL
 */
router.get('/status', async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL query parameter is required',
            });
        }

        // Decode URL
        const decodedUrl = decodeURIComponent(url);

        if (!stockChecker.isValidAmulUrl(decodedUrl)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Amul product URL',
            });
        }

        const result = await stockChecker.checkStock(decodedUrl);

        res.json({
            success: true,
            url: decodedUrl,
            ...result,
        });

    } catch (error) {
        console.error('Error checking status:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * GET /api/stats
 * Get overall statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await redis.getStats();
        res.json({
            success: true,
            ...stats,
        });
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * POST /api/check
 * Force an immediate stock check
 */
router.post('/check', async (req, res) => {
    try {
        // Run check in background
        scheduler.forceCheck();

        res.json({
            success: true,
            message: 'Stock check initiated',
        });
    } catch (error) {
        console.error('Error forcing check:', error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

export default router;
