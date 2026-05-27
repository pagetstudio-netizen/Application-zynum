import { Router, type IRouter } from "express";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware.js";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/v1/balance", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const [user] = await db
      .select({ balanceUsd: usersTable.balanceUsd })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Not found", message: "Utilisateur introuvable" });
      return;
    }

    res.json({
      balance: user.balanceUsd,
      currency: "USD",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de la récupération du solde";
    res.status(500).json({ error: "Balance error", message });
  }
});

export default router;
