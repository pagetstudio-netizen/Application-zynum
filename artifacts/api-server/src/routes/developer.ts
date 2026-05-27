import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware.js";
import { generateApiKey } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/v1/developer/apikey", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);

  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Utilisateur introuvable" });
    return;
  }

  if (!user.apiKey) {
    const newKey = generateApiKey();
    await db.update(usersTable).set({ apiKey: newKey }).where(eq(usersTable.id, user.id));
    res.json({ apiKey: newKey, createdAt: user.createdAt.toISOString() });
    return;
  }

  res.json({ apiKey: user.apiKey, createdAt: user.createdAt.toISOString() });
});

router.post("/v1/developer/apikey", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const newKey = generateApiKey();

  const [user] = await db
    .update(usersTable)
    .set({ apiKey: newKey })
    .where(eq(usersTable.id, req.userId!))
    .returning();

  res.json({ apiKey: newKey, createdAt: user.createdAt.toISOString() });
});

export default router;
