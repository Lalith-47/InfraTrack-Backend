import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { toNodeHandler } from "better-auth/node";

import { env } from "./config/env.js";
import { auth } from "./lib/auth.js";
import { prisma } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";
import { authRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { meRouter } from "./routes/me.js";
import { projectsRouter } from "./routes/projects.js";
import { dashboardRouter } from "./routes/dashboard.js";

const app = express();

// Trust proxy for Render / reverse proxies (needed for rate-limit & secure cookies)
app.set("trust proxy", 1);

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration (Strictly allow frontend origin with credentials)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, health checks) or matching frontend
      if (!origin || origin === env.FRONTEND_URL) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// Request Logging
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === "/health",
    },
    redact: [
      "req.headers.cookie",
      "req.headers.authorization",
      "res.headers['set-cookie']",
    ],
  })
);

// Render Health Check (Zero-auth, 200 OK)
app.get("/health", async (_req, res) => {
  try {
    // Quick DB connectivity check
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ok",
      database: "connected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, "Health check failed on database ping");
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// Better Auth routes mounted BEFORE express.json() body parser
// Apply rate limiter to auth endpoints
app.use("/api/auth", authRateLimiter);
app.all("/api/auth/*", toNodeHandler(auth));

// Body parsing middleware for application API routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Feature routes
app.use("/api/me", meRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/dashboard", dashboardRouter);

// Centralized Error Handler
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  logger.info(`👉 Better Auth Base URL: ${env.BETTER_AUTH_URL}`);
  logger.info(`👉 Allowed Frontend URL: ${env.FRONTEND_URL}`);
});

// Graceful Shutdown
async function handleShutdown(signal: string) {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  server.close(async () => {
    logger.info("HTTP server closed.");
    try {
      await prisma.$disconnect();
      logger.info("Database connection closed.");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error during database disconnect");
      process.exit(1);
    }
  });

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

export default app;
