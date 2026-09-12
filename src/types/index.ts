import type { auth } from "../lib/auth.js";

export type AuthSession = typeof auth.$Infer.Session;
export type User = Omit<AuthSession["user"], "role"> & { role?: "ADMIN" | "SUPERVISOR" | "VIEWER" | string };
export type Session = AuthSession["session"];

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
    }
  }
}
