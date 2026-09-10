import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { auth } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

export const usersRouter = Router();

// Strict RBAC: All user management endpoints require authenticated ADMIN role
usersRouter.use(requireAuth);
usersRouter.use(requireRole(["ADMIN"]));

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "SUPERVISOR", "VIEWER"]).default("VIEWER"),
});

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "SUPERVISOR", "VIEWER"]),
});

// GET /api/admin/users - List all system users with their roles
usersRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch system users" });
  }
});

// POST /api/admin/users - Admin provisions a new user with specific role
usersRouter.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
      return;
    }

    const { name, email, password, role } = parsed.data;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    // Create user via Better Auth
    const authRes = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!authRes || !authRes.user) {
      res.status(500).json({ error: "Failed to register user in auth subsystem" });
      return;
    }

    // Assign the designated role specified by the Admin
    const updatedUser = await prisma.user.update({
      where: { id: authRes.user.id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: `User created successfully with role ${role}`,
      user: updatedUser,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    res.status(500).json({ error: "Failed to create user", message: err.message });
  }
});

// PATCH /api/admin/users/:id/role - Admin updates an existing user's role
usersRouter.patch("/:id/role", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid role specified", details: parsed.error.flatten() });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Protection: Prevent demoting the last remaining Admin in the system
    if (targetUser.role === "ADMIN" && parsed.data.role !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        res.status(400).json({
          error: "Cannot demote the only remaining Administrator. Promote another user to Admin first.",
        });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    res.json({
      message: `Role updated to ${updated.role}`,
      user: updated,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// DELETE /api/admin/users/:id - Admin deletes a user
usersRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Protection: Prevent deleting yourself
    if (req.user?.id === id) {
      res.status(400).json({ error: "You cannot delete your own active administrator account" });
      return;
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Protection: Prevent deleting the last remaining Admin
    if (targetUser.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        res.status(400).json({
          error: "Cannot delete the only remaining Administrator",
        });
        return;
      }
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});
