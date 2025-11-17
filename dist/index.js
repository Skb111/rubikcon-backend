"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: "../.env.local" });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const redis_1 = require("redis");
const connect_redis_1 = require("connect-redis");
const routes_1 = require("./routes");
const vite_1 = require("./vite");
async function main() {
    const app = (0, express_1.default)();
    // CORS configuration for production
    const corsOptions = {
        origin: [
            'http://localhost:5173',
            'http://localhost:3000',
            'https://rubikcongames.xyz',
            'http://rubikcongames.xyz'
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };
    app.use((0, cors_1.default)(corsOptions));
    app.use(express_1.default.json({
        verify: (req, res, buf) => {
            // We only need the raw body for the webhook route
            if (req.originalUrl.startsWith('/api/webhook')) {
                req.rawBody = buf;
            }
        }
    }));
    app.use(express_1.default.urlencoded({ extended: false }));
    // Trust the first proxy
    app.set('trust proxy', 1);
    // Session configuration
    let sessionConfig = {
        secret: process.env.SESSION_SECRET || 'rubikcon-games-secret-key',
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    };
    // Use Redis if URL is provided and not empty, otherwise use memory store
    if (process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '') {
        try {
            const redisClient = (0, redis_1.createClient)({
                url: process.env.REDIS_URL,
            });
            redisClient.on('error', err => (0, vite_1.log)(`Redis Client Error: ${err}`));
            redisClient.on('connect', () => (0, vite_1.log)('Redis Client Connected'));
            await redisClient.connect();
            const redisStore = new connect_redis_1.RedisStore({
                client: redisClient,
                prefix: "rubikcon:",
            });
            sessionConfig.store = redisStore;
            (0, vite_1.log)('Using Redis for sessions');
        }
        catch (error) {
            (0, vite_1.log)(`Redis connection failed, using memory store: ${error}`);
        }
    }
    else {
        (0, vite_1.log)('Using in-memory sessions (Redis disabled or URL not provided)');
    }
    app.use((0, express_session_1.default)(sessionConfig));
    app.use((req, res, next) => {
        const start = Date.now();
        const path = req.path;
        let capturedJsonResponse = undefined;
        const originalResJson = res.json;
        res.json = function (bodyJson, ...args) {
            capturedJsonResponse = bodyJson;
            return originalResJson.apply(res, [bodyJson, ...args]);
        };
        res.on("finish", () => {
            const duration = Date.now() - start;
            if (path.startsWith("/api")) {
                let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
                if (capturedJsonResponse) {
                    logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
                }
                if (logLine.length > 80) {
                    logLine = logLine.slice(0, 79) + "…";
                }
                (0, vite_1.log)(logLine);
            }
        });
        next();
    });
    const server = await (0, routes_1.registerRoutes)(app);
    app.use((err, _req, res, _next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
        throw err;
    });
    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    // if (app.get("env") === "development") {
    //   await setupVite(app, server);
    // } else {
    //   serveStatic(app);
    // }
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, '0.0.0.0', () => {
        (0, vite_1.log)(`🚀 Server running on port ${port}`);
        (0, vite_1.log)(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        (0, vite_1.log)(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
}
main().catch(err => {
    (0, vite_1.log)(`Error starting server: ${err}`);
    process.exit(1);
});
