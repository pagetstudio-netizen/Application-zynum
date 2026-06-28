import { Router, type IRouter } from "express";
import { db, discountCodesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/adminMiddleware.js";
import { DISPLAY_RATE } from "../lib/pricing.js";

const router: IRouter = Router();

// ─── Admin: list all discount codes ───────────────────────────────────────────
router.get("/v1/admin/discount-codes", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const codes = await db.select().from(discountCodesTable).orderBy(discountCodesTable.createdAt);
  res.json({ codes });
});

// ─── Admin: create discount code ──────────────────────────────────────────────
router.post("/v1/admin/discount-codes", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const { code, percent, country, isActive } = req.body as {
    code: string;
    percent: number;
    country?: string | null;
    isActive?: boolean;
  };

  if (!code || typeof percent !== "number" || percent <= 0 || percent > 100) {
    res.status(400).json({ error: "Code et pourcentage (1-100) requis" });
    return;
  }

  try {
    const [created] = await db
      .insert(discountCodesTable)
      .values({
        code: code.trim().toUpperCase(),
        percent,
        country: country || null,
        isActive: isActive ?? false,
      })
      .returning();
    res.json({ code: created });
  } catch {
    res.status(409).json({ error: "Ce code existe déjà" });
  }
});

// ─── Admin: update discount code ──────────────────────────────────────────────
router.patch("/v1/admin/discount-codes/:id", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  const { code, percent, country, isActive } = req.body as {
    code?: string;
    percent?: number;
    country?: string | null;
    isActive?: boolean;
  };

  const updates: Partial<typeof discountCodesTable.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (code !== undefined) updates.code = code.trim().toUpperCase();
  if (percent !== undefined) updates.percent = percent;
  if ("country" in req.body) updates.country = country || null;
  if (isActive !== undefined) updates.isActive = isActive;

  const [updated] = await db
    .update(discountCodesTable)
    .set(updates)
    .where(eq(discountCodesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Code introuvable" });
    return;
  }
  res.json({ code: updated });
});

// ─── Admin: delete discount code ──────────────────────────────────────────────
router.delete("/v1/admin/discount-codes/:id", requireAuth, requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(req.params["id"] as string, 10);
  await db.delete(discountCodesTable).where(eq(discountCodesTable.id, id));
  res.json({ success: true });
});

// ─── Public: validate a discount code ─────────────────────────────────────────
router.post("/v1/validate-discount", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { code, country, priceUsd } = req.body as {
    code: string;
    country: string;
    priceUsd: number;
  };

  if (!code || typeof priceUsd !== "number") {
    res.status(400).json({ valid: false, error: "Paramètres manquants" });
    return;
  }

  const [dc] = await db
    .select()
    .from(discountCodesTable)
    .where(eq(discountCodesTable.code, code.trim().toUpperCase()))
    .limit(1);

  if (!dc || !dc.isActive) {
    res.status(404).json({ valid: false, error: "Code invalide ou inactif" });
    return;
  }

  // Check country restriction
  if (dc.country && dc.country !== country) {
    res.status(400).json({ valid: false, error: `Ce code est réservé à un autre pays` });
    return;
  }

  const discountFactor = 1 - dc.percent / 100;
  const discountedPriceUsd = Math.round(priceUsd * discountFactor * 100) / 100;
  const discountedPriceFcfa = Math.round(discountedPriceUsd * DISPLAY_RATE);
  const savedUsd = Math.round((priceUsd - discountedPriceUsd) * 100) / 100;
  const savedFcfa = Math.round(savedUsd * DISPLAY_RATE);

  res.json({
    valid: true,
    percent: dc.percent,
    country: dc.country,
    discountedPriceUsd,
    discountedPriceFcfa,
    savedUsd,
    savedFcfa,
  });
});

// ─── Internal helper exported for use in numbers.ts ───────────────────────────
export async function applyDiscountCode(
  code: string,
  country: string,
  priceUsd: number,
  priceFcfa: number,
): Promise<{
  finalPriceUsd: number;
  finalPriceFcfa: number;
  savedUsd: number;
  savedFcfa: number;
  discountId: number | null;
  discountPercent: number;
}> {
  const [dc] = await db
    .select()
    .from(discountCodesTable)
    .where(eq(discountCodesTable.code, code.trim().toUpperCase()))
    .limit(1);

  if (!dc || !dc.isActive || (dc.country && dc.country !== country)) {
    return { finalPriceUsd: priceUsd, finalPriceFcfa: priceFcfa, savedUsd: 0, savedFcfa: 0, discountId: null, discountPercent: 0 };
  }

  const factor = 1 - dc.percent / 100;
  const finalPriceUsd = Math.round(priceUsd * factor * 100) / 100;
  const finalPriceFcfa = Math.round(priceFcfa * factor);
  const savedUsd = Math.round((priceUsd - finalPriceUsd) * 100) / 100;
  const savedFcfa = Math.round((priceFcfa - finalPriceFcfa));

  // Update usage stats
  await db
    .update(discountCodesTable)
    .set({
      usedCount: sql`${discountCodesTable.usedCount} + 1`,
      totalSavedFcfa: sql`${discountCodesTable.totalSavedFcfa} + ${savedFcfa}`,
      totalSavedUsd: sql`${discountCodesTable.totalSavedUsd} + ${savedUsd}`,
      updatedAt: new Date(),
    })
    .where(eq(discountCodesTable.id, dc.id));

  return { finalPriceUsd, finalPriceFcfa, savedUsd, savedFcfa, discountId: dc.id, discountPercent: dc.percent };
}

export default router;
