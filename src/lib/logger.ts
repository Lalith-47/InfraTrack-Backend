import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "res.headers['set-cookie']",
      "password",
      "*.password",
      "token",
      "*.token",
      "secret",
      "*.secret",
      "BETTER_AUTH_SECRET",
      "DATABASE_URL",
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
          },
        }
      : undefined,
});
