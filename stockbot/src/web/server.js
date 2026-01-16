import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WebServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.setupMiddleware();
        this.setupRoutes();
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        // Parse JSON bodies
        this.app.use(express.json());

        // Parse URL-encoded bodies
        this.app.use(express.urlencoded({ extended: true }));

        // CORS for development
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }
            next();
        });

        // Serve static files
        this.app.use(express.static(path.join(__dirname, 'public')));
    }

    /**
     * Setup routes
     */
    setupRoutes() {
        // API routes
        this.app.use('/api', apiRoutes);

        // Serve index.html for root
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Not Found' });
        });

        // Error handler
        this.app.use((err, req, res, next) => {
            console.error('Express error:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        });
    }

    /**
     * Start the web server
     */
    start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(config.web.port, () => {
                console.log(`🌐 Web dashboard running at http://localhost:${config.web.port}`);
                resolve(this.server);
            });

            this.server.on('error', (error) => {
                console.error('❌ Failed to start web server:', error.message);
                reject(error);
            });
        });
    }

    /**
     * Stop the web server
     */
    stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('📴 Web server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// Singleton instance
export const webServer = new WebServer();
export default webServer;
