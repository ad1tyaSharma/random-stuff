import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Discord
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.DISCORD_CLIENT_ID,
        guildId: process.env.DISCORD_GUILD_ID,
    },

    // Redis
    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },

    // Web Dashboard
    web: {
        port: parseInt(process.env.WEB_PORT) || 3000,
    },

    // Stock Checker
    checker: {
        intervalMinutes: parseInt(process.env.CHECK_INTERVAL_MINUTES) || 5,
        defaultPincode: process.env.DEFAULT_PINCODE || '110001',
    },

    // Notifications
    notifications: {
        type: process.env.NOTIFICATION_TYPE || 'dm', // 'dm' or 'channel'
        channelId: process.env.NOTIFICATION_CHANNEL_ID,
    },
};

// Validate required config
export function validateConfig() {
    const required = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        console.error('Please copy .env.example to .env and fill in the values.');
        process.exit(1);
    }
}

export default config;
