import { Router, type IRouter } from "express";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware.js";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

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

router.get("/v1/transactions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(transactionsTable)
      .where(eq(transactionsTable.userId, req.userId!))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(50);
    res.json({ transactions: rows });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
