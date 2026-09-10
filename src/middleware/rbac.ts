import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

export type UserRole = "ADMIN" | "SUPERVISOR" | "VIEWER";

export function requireRole(allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "You must be signed in to access this resource",
      });
      return;
    }

    try {
      // Ensure we have the fresh role directly from the database
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true },
      });

      const userRole = (dbUser?.role || "VIEWER") as UserRole;
      (req.user as unknown as { role: UserRole }).role = userRole;

      if (!allowedRoles.includes(userRole)) {
        res.status(403).json({
          error: "Forbidden",
          message: `Access denied. Requires one of: [${allowedRoles.join(", ")}]. Current role: ${userRole}`,
          requiredRoles: allowedRoles,
          currentRole: userRole,
        });
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
