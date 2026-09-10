import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();

// GET /api/dashboard/stats - Real database metrics scoped by user role
dashboardRouter.get("/stats", requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { id: true, name: true, role: true },
    });

    const role = user?.role || "VIEWER";
    const where: Record<string, unknown> = {};

    // For supervisors, scope stats to their assigned corridors if they have any assigned
    if (role === "SUPERVISOR" && user) {
      const assignedCount = await prisma.project.count({
        where: {
          OR: [
            { userId: user.id },
            { supervisor: { contains: user.name, mode: "insensitive" } },
          ],
        },
      });

      // If supervisor has assigned projects, scope to them
      if (assignedCount > 0) {
        where.OR = [
          { userId: user.id },
          { supervisor: { contains: user.name, mode: "insensitive" } },
        ];
      }
    }

    const projects = await prisma.project.findMany({
      where,
      select: {
        id: true,
        budget: true,
        spent: true,
        currentProgress: true,
        plannedProgress: true,
        status: true,
      },
    });

    const totalProjects = projects.length;
    const onTrackCount = projects.filter((p) => p.status === "ON_TRACK").length;
    const atRiskCount = projects.filter((p) => p.status === "AT_RISK" || p.status === "DELAYED").length;
    const completedCount = projects.filter((p) => p.status === "COMPLETED").length;

    // Calculate total outlay by parsing numeric values
    let totalBudgetNumber = 0;
    for (const p of projects) {
      const cleaned = p.budget.replace(/[^0-9.]/g, "");
      const num = parseFloat(cleaned);
      if (!isNaN(num)) totalBudgetNumber += num;
    }

    const multimodalUpdatesCount = await prisma.activityUpdate.count({
      where: where.OR ? { project: where } : undefined,
    });

    const adherence =
      totalProjects > 0
        ? Math.round(
            (projects.reduce((acc, p) => acc + (p.plannedProgress > 0 ? (p.currentProgress / p.plannedProgress) * 100 : 100), 0) /
              totalProjects) *
              10
          ) / 10
        : 100;

    res.json({
      role,
      userName: user?.name || "Officer",
      stats: {
        totalProjects,
        onTrackCount,
        atRiskCount,
        completedCount,
        monitoredOutlay: `₹${totalBudgetNumber.toLocaleString()} Cr`,
        multimodalUpdatesCount,
        scheduleAdherence: Math.min(100, adherence),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to compute dashboard metrics" });
  }
});
