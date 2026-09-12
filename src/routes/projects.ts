import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

export const projectsRouter = Router();

const createProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  code: z.string().min(2, "Project code is required"),
  wbsCode: z.string().default("WBS-001"),
  department: z.string().min(2, "Department is required"),
  category: z.string().min(2, "Category is required"),
  location: z.string().min(2, "Location is required"),
  description: z.string().optional().default(""),
  baselineStartDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  baselineEndDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  currentProgress: z.number().min(0).max(100).default(0),
  plannedProgress: z.number().min(0).max(100).default(0),
  status: z.enum(["ON_TRACK", "AT_RISK", "DELAYED", "COMPLETED"]).default("ON_TRACK"),
  budget: z.string().default("₹0 Cr"),
  spent: z.string().default("₹0 Cr"),
  supervisor: z.string().default("Unassigned"),
  contractor: z.string().default("Unassigned"),
});

const updateProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters").optional(),
  code: z.string().min(2, "Project code is required").optional(),
  wbsCode: z.string().optional(),
  department: z.string().optional(),
  category: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  baselineStartDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  baselineEndDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  currentProgress: z.number().min(0).max(100).optional(),
  plannedProgress: z.number().min(0).max(100).optional(),
  status: z.enum(["ON_TRACK", "AT_RISK", "DELAYED", "COMPLETED"]).optional(),
  budget: z.string().optional(),
  spent: z.string().optional(),
  supervisor: z.string().optional(),
  contractor: z.string().optional(),
});

const postUpdateSchema = z.object({
  channel: z.enum(["EXCEL", "TEXT", "VOICE"]),
  notes: z.string().min(3, "Notes must be at least 3 characters long"),
  progressDelta: z.number().min(0).max(50).default(0.5),
  tags: z.array(z.string()).optional().default([]),
  author: z.string().optional(),
});

// GET /api/projects - List projects from PostgreSQL (supports filtering & role scoping)
projectsRouter.get("/", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { status, department, search, scope, filter } = req.query;

    const where: Record<string, unknown> = {};
    if (status && typeof status === "string" && status !== "ALL") {
      where.status = status;
    }
    if (department && typeof department === "string" && department !== "ALL") {
      where.department = department;
    }
    if (search && typeof search === "string" && search.trim()) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { wbsCode: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    // Role-based scoping: supervisor can view only their created projects when scope=mine or filter=mine
    if ((scope === "mine" || filter === "mine") && req.user) {
      where.userId = req.user.id;
    } else if (scope === "assigned" && req.user) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (user) {
        where.OR = [
          { userId: user.id },
          { supervisor: { contains: user.name, mode: "insensitive" } },
        ];
      }
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: {
          select: { recentUpdates: true, timelineData: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// GET /api/projects/:id - Get project by ID with real S-Curve timeline and updates
projectsRouter.get("/:id", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        timelineData: {
          orderBy: { createdAt: "asc" },
        },
        recentUpdates: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json({ project });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// POST /api/projects - Create project (RBAC: ADMIN or SUPERVISOR only)
projectsRouter.post(
  "/",
  requireAuth,
  requireRole(["ADMIN", "SUPERVISOR"]),
  async (req: Request, res: Response) => {
    try {
      const parseResult = createProjectSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.flatten(),
        });
        return;
      }

      const data = parseResult.data;
      const project = await prisma.project.create({
        data: {
          name: data.name,
          code: data.code,
          wbsCode: data.wbsCode,
          department: data.department,
          category: data.category,
          location: data.location,
          description: data.description,
          baselineStartDate: new Date(data.baselineStartDate),
          baselineEndDate: new Date(data.baselineEndDate),
          currentProgress: data.currentProgress,
          plannedProgress: data.plannedProgress,
          status: data.status,
          budget: data.budget,
          spent: data.spent,
          supervisor: data.supervisor,
          contractor: data.contractor,
          userId: req.user?.id,
          timelineData: {
            create: [
              { date: "Baseline", plannedProgress: 5, actualProgress: 0, milestone: "Site Initialization" },
            ],
          },
          recentUpdates: {
            create: [
              {
                author: req.user?.name || data.supervisor,
                role: "Officer",
                channel: "TEXT",
                notes: "Project baseline initialized in system with WBS breakdown.",
                progressDelta: 0,
                tags: ["#BaselineCreated", "#Initialized"],
              },
            ],
          },
        },
      });

      res.status(201).json({ project });
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      if (err.code === "P2002") {
        res.status(409).json({ error: "Project code already exists" });
        return;
      }
      res.status(500).json({ error: "Failed to create project", message: err.message });
    }
  }
);

// POST /api/projects/:id/updates - Multimodal Field Update (RBAC: ADMIN or SUPERVISOR only)
projectsRouter.post(
  "/:id/updates",
  requireAuth,
  requireRole(["ADMIN", "SUPERVISOR"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = postUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.flatten(),
        });
        return;
      }

      const project = await prisma.project.findFirst({
        where: { OR: [{ id }, { code: id }] },
      });

      if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      const { channel, notes, progressDelta, tags, author } = parseResult.data;
      const updatedProgress = Math.min(100, Math.round((project.currentProgress + progressDelta) * 10) / 10);

      // 1. Create the activity update row
      const newActivity = await prisma.activityUpdate.create({
        data: {
          projectId: project.id,
          author: author || req.user?.name || "Field Officer",
          role: "Field Supervisor",
          channel,
          notes,
          progressDelta,
          tags: tags && tags.length > 0 ? tags : ["#FieldUpdate"],
        },
      });

      // 2. Update project progress in DB
      const updatedProject = await prisma.project.update({
        where: { id: project.id },
        data: {
          currentProgress: updatedProgress,
        },
      });

      // 3. Update the latest timeline point actualProgress
      const latestPoint = await prisma.timelinePoint.findFirst({
        where: { projectId: project.id },
        orderBy: { createdAt: "desc" },
      });

      if (latestPoint) {
        await prisma.timelinePoint.update({
          where: { id: latestPoint.id },
          data: { actualProgress: updatedProgress },
        });
      }

      res.status(201).json({
        message: "Progress update recorded successfully",
        activity: newActivity,
        currentProgress: updatedProject.currentProgress,
        project: updatedProject,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to record field update" });
    }
  }
);

// PATCH /api/projects/:id - Update Project Details (RBAC: ADMIN can update all; SUPERVISOR only projects they created)
projectsRouter.patch(
  "/:id",
  requireAuth,
  requireRole(["ADMIN", "SUPERVISOR"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const parseResult = updateProjectSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parseResult.error.flatten(),
        });
        return;
      }

      const existingProject = await prisma.project.findFirst({
        where: { OR: [{ id }, { code: id }] },
      });

      if (!existingProject) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      // Supervisor Scoping Security Rule:
      // Supervisors can ONLY update projects they have created.
      if (req.user?.role === "SUPERVISOR" && existingProject.userId !== req.user.id) {
        res.status(403).json({
          error: "Forbidden",
          message: "Chief Engineers / Supervisors are only authorized to update projects they have created.",
        });
        return;
      }

      const data = parseResult.data;
      const updatePayload: Record<string, any> = {};

      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.code !== undefined) updatePayload.code = data.code;
      if (data.wbsCode !== undefined) updatePayload.wbsCode = data.wbsCode;
      if (data.department !== undefined) updatePayload.department = data.department;
      if (data.category !== undefined) updatePayload.category = data.category;
      if (data.location !== undefined) updatePayload.location = data.location;
      if (data.description !== undefined) updatePayload.description = data.description;
      if (data.baselineStartDate !== undefined) updatePayload.baselineStartDate = new Date(data.baselineStartDate);
      if (data.baselineEndDate !== undefined) updatePayload.baselineEndDate = new Date(data.baselineEndDate);
      if (data.currentProgress !== undefined) updatePayload.currentProgress = data.currentProgress;
      if (data.plannedProgress !== undefined) updatePayload.plannedProgress = data.plannedProgress;
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.budget !== undefined) updatePayload.budget = data.budget;
      if (data.spent !== undefined) updatePayload.spent = data.spent;
      if (data.supervisor !== undefined) updatePayload.supervisor = data.supervisor;
      if (data.contractor !== undefined) updatePayload.contractor = data.contractor;

      const updatedProject = await prisma.project.update({
        where: { id: existingProject.id },
        data: updatePayload,
      });

      res.json({
        message: "Project details successfully updated in database",
        project: updatedProject,
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        res.status(409).json({ error: "Project code already exists" });
        return;
      }
      res.status(500).json({ error: "Failed to update project", message: error?.message });
    }
  }
);

// DELETE /api/projects/:id - Delete Project (RBAC: ADMIN can delete all; SUPERVISOR only projects they created)
projectsRouter.delete(
  "/:id",
  requireAuth,
  requireRole(["ADMIN", "SUPERVISOR"]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existingProject = await prisma.project.findFirst({
        where: { OR: [{ id }, { code: id }] },
      });

      if (!existingProject) {
        res.status(404).json({ error: "Project not found" });
        return;
      }

      // Supervisor Scoping Security Rule:
      // Supervisors can ONLY delete projects they have created.
      if (req.user?.role === "SUPERVISOR" && existingProject.userId !== req.user.id) {
        res.status(403).json({
          error: "Forbidden",
          message: "Chief Engineers / Supervisors are only authorized to delete projects they have created.",
        });
        return;
      }

      await prisma.project.delete({
        where: { id: existingProject.id },
      });

      res.json({
        message: "Project successfully deleted from database",
        deletedId: existingProject.id,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete project", message: error?.message });
    }
  }
);

