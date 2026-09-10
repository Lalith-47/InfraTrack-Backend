import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth.js";

export const meRouter = Router();

// GET /api/me - Protected route proving session verification works
meRouter.get("/", requireAuth, (req: Request, res: Response) => {
  res.json({
    user: req.user,
    session: req.session,
  });
});
