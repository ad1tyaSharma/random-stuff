/**
 * Amul Stock Tracker Bot - Main Entry Point
 * 
 * This file initializes all services and starts the bot.
 */

import { config, validateConfig } from './config/index.js';
import redis from './services/redis.js';
import stockChecker from './services/stockChecker.js';
import scheduler from './services/scheduler.js';
import bot from './bot/client.js';
import webServer from './web/server.js';

// Parse command line arguments
const args = process.argv.slice(2);
const botOnly = args.includes('--bot-only');
const webOnly = args.includes('--web-only');

// Banner
console.log(`
╔══════════════════════════════════════════════╗
║     🥛 AMUL STOCK TRACKER BOT 🥛              ║
║     Track product availability in real-time   ║
╚══════════════════════════════════════════════╝
`);

async function main() {
    try {
        // Validate configuration
        validateConfig();
        console.log('✅ Configuration validated');

        // Connect to Redis
        await redis.connect();

        if (!webOnly) {
            // Start Discord bot
            await bot.start();

            // Start scheduler
            scheduler.start();
        }

        if (!botOnly) {
            // Start web server
            await webServer.start();
        }

        console.log('\n🚀 All systems running!\n');

        // Display status
        const stats = await redis.getStats();
        console.log(`📊 Current Stats:`);
        console.log(`   • Tracking ${stats.totalProducts} product(s)`);
        console.log(`   • ${stats.inStock} in stock, ${stats.outOfStock} out of stock`);
        console.log(`   • ${stats.totalSubscribers} total subscription(s)`);
        console.log('');

    } catch (error) {
        console.error('❌ Failed to start:', error.message);
        process.exit(1);
    }
}

// Graceful shutdown
async function shutdown(signal) {
    console.log(`\n📴 Received ${signal}, shutting down gracefully...`);

    try {
        // Stop scheduler
        scheduler.stop();

        // Close browser
        await stockChecker.close();

        // Stop Discord bot
        await bot.stop();

        // Stop web server
        await webServer.stop();

        // Disconnect from Redis
        await redis.disconnect();

        console.log('👋 Goodbye!');
        process.exit(0);

    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle shutdown signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the application
main();
