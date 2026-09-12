import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const meRouter = Router();

// GET /api/me - Returns authenticated user profile including DB role and session
meRouter.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dbUser) {
      res.status(404).json({ error: "User record not found" });
      return;
    }

    res.json({
      user: dbUser,
      session: req.session,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "SUPERVISOR", "VIEWER"]),
});

// PATCH /api/me/role - Update active role for testing & role-based dashboard demonstration
meRouter.patch("/role", requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid role", details: parsed.error.flatten() });
      return;
    }

    // Security Rule: Users cannot self-promote to ADMIN unless they are already an ADMIN
    // (Or initial system bootstrap: if 0 admins exist in database, the first user is granted ADMIN)
    if (parsed.data.role === "ADMIN") {
      const dbUser = await prisma.user.findUnique({ where: { id: req.user?.id } });
      if (dbUser?.role !== "ADMIN") {
        const existingAdminCount = await prisma.user.count({ where: { role: "ADMIN" } });
        if (existingAdminCount > 0) {
          res.status(403).json({
            error: "Forbidden",
            message: "Registration or self-promotion to ADMIN is strictly restricted. Only an existing Administrator can provision an Admin account.",
          });
          return;
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user?.id },
      data: { role: parsed.data.role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.json({
      message: `Role updated to ${updatedUser.role}`,
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user role" });
  }
});
