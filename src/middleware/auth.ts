import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

async function resolveSession(req: Request) {
  let session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session || !session.user) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const rawToken = authHeader.slice(7).trim();
      const tokenVal = rawToken.includes(".") ? rawToken.split(".")[0] : rawToken;
      const dbSession = await prisma.session.findUnique({
        where: { token: tokenVal },
        include: { user: true },
      });
      if (dbSession && dbSession.expiresAt > new Date()) {
        session = {
          user: dbSession.user,
          session: dbSession,
        };
      }
    }
  }
  return session;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await resolveSession(req);

    if (!session || !session.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be authenticated to access this resource",
      });
    }

    req.user = session.user;
    req.session = session.session;
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await resolveSession(req);

    if (session && session.user) {
      req.user = session.user;
      req.session = session.session;
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
