import type { Request, Response, NextFunction } from "express";
import { validateToken, getUserById } from "../lib/auth.js";

export interface AuthRequest extends Request {
  userId?: number;
  userApiKey?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "Unauthorized", message: "No token provided" });
    return;
  }

  const token = authHeader.replace("Bearer ", "");

  // Check if it's an API key (starts with zyn_)
  if (token.startsWith("zyn_")) {
    const { db, usersTable } = await import("@workspace/db");
    const { eq } = await import("drizzle-orm");
    const [user] = await db.select().from(usersTable).where(eq(usersTable.apiKey, token)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid API key" });
      return;
    }
    req.userId = user.id;
    req.userApiKey = token;
    next();
    return;
  }

  const userId = await validateToken(token);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
    return;
  }

  req.userId = userId;
  next();
}
