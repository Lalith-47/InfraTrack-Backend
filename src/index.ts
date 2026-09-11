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
import { usersRouter } from "./routes/users.js";
import { aiRouter } from "./routes/ai.js";

const app = express();

// Trust proxy for Render / reverse proxies (needed for rate-limit & secure cookies)
app.set("trust proxy", 1);

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Robust CORS configuration supporting Vercel production, preview deployments, and local dev
const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true; // Allow non-browser requests (mobile, curl, health checks)
  if (origin === env.FRONTEND_URL) return true;
  if (origin === "https://sih2026-beige.vercel.app") return true;
  if (origin === "https://sih2026.vercel.app") return true;
  if (origin.endsWith(".vercel.app")) return true;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return true;
  return false;
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      // Allow without throwing 500
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Cookie",
    "X-Requested-With",
    "X-Visitor-Id",
    "X-Request-Id",
    "x-visitor-id",
    "x-request-id",
    "better-auth-client",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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
  let dbStatus = "connected";
  let dbError: string | undefined = undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error: any) {
    dbStatus = "pending_configuration";
    dbError = error?.message || String(error);
  }
  res.status(200).json({
    status: "ok",
    service: "infratrack-backend",
    database: dbStatus,
    dbError,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Better Auth routes mounted BEFORE express.json() body parser
// Apply rate limiter to auth endpoints
app.use("/api/auth", authRateLimiter);
app.all("/api/auth/*", toNodeHandler(auth));

// Body parsing middleware for application API routes (25mb for AI drone/site photo uploads)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Feature routes
app.use("/api/me", meRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/admin/users", usersRouter);
app.use("/api/ai", aiRouter);

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
