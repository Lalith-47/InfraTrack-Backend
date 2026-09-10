import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, optionalAuth } from "../middleware/auth.js";

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

// GET /api/projects - List projects (supports filters)
projectsRouter.get("/", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { status, department, search } = req.query;

    const where: Record<string, unknown> = {};
    if (status && typeof status === "string") {
      where.status = status;
    }
    if (department && typeof department === "string") {
      where.department = department;
    }
    if (search && typeof search === "string") {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// GET /api/projects/:id - Get project by ID
projectsRouter.get("/:id", optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
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

// POST /api/projects - Create project (requires authentication)
projectsRouter.post("/", requireAuth, async (req: Request, res: Response) => {
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
});
