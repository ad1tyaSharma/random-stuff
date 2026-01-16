# 🥛 Amul Stock Tracker Bot

A Discord bot for tracking Amul product stock status with Redis persistence, slash commands, user-specific notifications, and a beautiful web dashboard.

## ✨ Features

- **📊 Stock Detection**: Automatically detects "In Stock" vs "Out of Stock" on Amul product pages
- **🔔 Notifications**: Get DM or channel notifications when stock status changes
- **💾 Redis Persistence**: Never lose your tracked products, even after restart
- **⚡ Slash Commands**: Easy-to-use Discord commands
- **🌐 Web Dashboard**: Beautiful glassmorphic UI to manage tracked products
- **📈 Scalable**: Track unlimited products with user-specific subscriptions

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org/)
- **Redis** - [Download](https://redis.io/download/) or use [Upstash](https://upstash.com/)
- **Discord Bot** - [Create one here](https://discord.com/developers/applications)

### 1. Clone & Install

```bash
cd stockbot
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your values:

```bash
copy .env.example .env
```

Edit `.env` with your credentials:

```env
# Discord Bot
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_server_id_here  # For testing (instant command updates)

# Redis
REDIS_URL=redis://localhost:6379

# Web Dashboard
WEB_PORT=3000

# Stock Check Interval (minutes)
CHECK_INTERVAL_MINUTES=5
```

### 3. Deploy Slash Commands

```bash
npm run deploy
```

### 4. Start the Bot

```bash
npm start
```

You should see:
```
╔══════════════════════════════════════════════╗
║     🥛 AMUL STOCK TRACKER BOT 🥛              ║
╚══════════════════════════════════════════════╝

✅ Configuration validated
✅ Connected to Redis
✅ Discord bot logged in as YourBot#1234
⏰ Starting scheduler (every 5 minutes)
🌐 Web dashboard running at http://localhost:3000

🚀 All systems running!
```

## 📝 Discord Commands

| Command | Description |
|---------|-------------|
| `/start <url>` | Start tracking a product |
| `/stop <url>` | Stop tracking a product |
| `/list` | List all your tracked products |
| `/status <url>` | Check stock status without tracking |

### Example

```
/start https://shop.amul.com/en/product/amul-whey-protein-32-g-or-pack-of-30-sachets
```

## 🌐 Web Dashboard

Access the dashboard at `http://localhost:3000`

Features:
- View all tracked products
- Add new products
- Remove products
- Force immediate stock check
- Real-time status updates

## 📁 Project Structure

```
stockbot/
├── package.json
├── .env.example
├── src/
│   ├── index.js              # Main entry point
│   ├── config/
│   │   └── index.js          # Configuration
│   ├── services/
│   │   ├── redis.js          # Redis operations
│   │   ├── stockChecker.js   # Puppeteer stock checker
│   │   ├── scheduler.js      # Cron scheduler
│   │   └── notifier.js       # Discord notifications
│   ├── bot/
│   │   ├── client.js         # Discord client
│   │   ├── deploy.js         # Command deployment
│   │   └── commands/
│   │       ├── start.js      # /start command
│   │       ├── stop.js       # /stop command
│   │       ├── list.js       # /list command
│   │       └── status.js     # /status command
│   └── web/
│       ├── server.js         # Express server
│       ├── routes/
│       │   └── api.js        # REST API
│       └── public/
│           ├── index.html    # Dashboard
│           ├── style.css     # Styles
│           └── app.js        # Frontend JS
└── README.md
```

## 🔧 Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Your Discord bot token | Required |
| `DISCORD_CLIENT_ID` | Your Discord application ID | Required |
| `DISCORD_GUILD_ID` | Guild ID for testing | Optional |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `WEB_PORT` | Web dashboard port | `3000` |
| `CHECK_INTERVAL_MINUTES` | Stock check frequency | `5` |
| `DEFAULT_PINCODE` | Pincode for checking | `110001` |
| `NOTIFICATION_TYPE` | `dm` or `channel` | `dm` |
| `NOTIFICATION_CHANNEL_ID` | Channel for notifications | Optional |

## 🔗 Creating a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and click "Add Bot"
4. Copy the **Token** → `DISCORD_TOKEN`
5. Copy **Application ID** → `DISCORD_CLIENT_ID`
6. Enable "Message Content Intent" under Privileged Gateway Intents
7. Go to OAuth2 → URL Generator
8. Select scopes: `bot`, `applications.commands`
9. Select permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
10. Copy the generated URL and open it to invite the bot

## 📦 Running Redis

### Option 1: Local Redis (Windows)

Use [Memurai](https://www.memurai.com/) (Redis-compatible for Windows) or WSL.

### Option 2: Docker

```bash
docker run -d -p 6379:6379 redis:alpine
```

### Option 3: Cloud Redis

Use [Upstash](https://upstash.com/) or [Redis Cloud](https://redis.com/try-free/) for free managed Redis.

Update `.env`:
```env
REDIS_URL=redis://default:password@host:port
```

## 🐛 Troubleshooting

**Bot not responding to commands?**
- Make sure you ran `npm run deploy`
- Check if guild ID is correct
- Verify bot has proper permissions

**Stock check failing?**
- Amul website may be blocking requests
- Try changing the pincode in config
- Check if Puppeteer is installed correctly

**Redis connection failed?**
- Ensure Redis is running
- Check REDIS_URL in .env
- Try `redis-cli ping` to test connection

## 📄 License

MIT License - feel free to use and modify!
