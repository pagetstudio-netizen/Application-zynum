import { Router, type IRouter } from "express";
import { db, ordersTable, usersTable, affiliateCommissionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { BuyNumberBody, CheckSmsParams, GetOrderHistoryQueryParams } from "@workspace/api-zod";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware.js";
import {
  buyNumber,
  checkOrder,
  cancelOrder,
  finishOrder,
  getOperatorsForServiceCountry,
  getServiceName,
  getServiceInfo,
  getCountryName,
  mapFiveSimStatus,
} from "../lib/fivesim.js";
import { applyTieredPricing } from "../lib/pricing.js";
import { applyDiscountCode } from "./discounts.js";
import { notifyPurchase } from "../lib/telegram.js";

const router: IRouter = Router();

function formatOrder(order: typeof ordersTable.$inferSelect) {
  const { icon: serviceIcon, color: serviceColor } = getServiceInfo(order.service);
  return {
    id: String(order.id),
    externalId: order.externalId,
    phone: order.phone,
    service: order.service,
    serviceName: order.serviceName,
    serviceIcon,
    serviceColor,
    country: order.country,
    countryName: order.countryName,
    status: order.status as "PENDING" | "RECEIVED" | "FINISHED" | "TIMEOUT" | "BANNED" | "CANCELED",
    smsCode: order.smsCode ?? null,
    smsText: order.smsText ?? null,
    priceUsd: order.priceUsd,
    priceFcfa: order.priceFcfa,
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

// ─── List operators for service + country ─────────────────────────────────────
router.get("/v1/operators", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const service = typeof req.query.service === "string" ? req.query.service : "";
  const country = typeof req.query.country === "string" ? req.query.country : "";
  if (!service || !country) {
    res.status(400).json({ error: "Validation error", message: "service and country are required" });
    return;
  }
  const rawOperators = await getOperatorsForServiceCountry(service, country);
  const operators = rawOperators.map((op) => {
    const { priceUsd, priceFcfa } = applyTieredPricing(op.priceUsd);
    return { ...op, priceUsd, priceFcfa };
  });
  res.json({ operators });
});

// ─── Buy number ───────────────────────────────────────────────────────────────
router.post("/v1/buy", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = BuyNumberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { service, country, currency, operator, discountCode } = parsed.data;
  const userId = req.userId!;
  const serviceName = getServiceName(service);
  const countryName = getCountryName(country);

  let fiveSimOrder;
  try {
    fiveSimOrder = await buyNumber(service, country, operator ?? "any");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'achat du numéro";
    res.status(400).json({ error: "Purchase failed", message });
    return;
  }

  // Applique la tarification à paliers ZyNum
  let { priceUsd, priceFcfa } = applyTieredPricing(fiveSimOrder.price);

  // Applique le code de réduction si fourni
  if (discountCode) {
    const result = await applyDiscountCode(discountCode, country, priceUsd, priceFcfa);
    priceUsd = result.finalPriceUsd;
    priceFcfa = result.finalPriceFcfa;
  }

  let order;
  try {
    order = await db.transaction(async (tx) => {
      const [user] = await tx.select({ balanceUsd: usersTable.balanceUsd }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (!user || user.balanceUsd < priceUsd) {
        throw new Error("Solde insuffisant. Veuillez recharger votre compte.");
      }
      await tx.update(usersTable).set({ balanceUsd: sql`${usersTable.balanceUsd} - ${priceUsd}` }).where(eq(usersTable.id, userId));
      const [newOrder] = await tx.insert(ordersTable).values({
        userId,
        externalId: String(fiveSimOrder.id),
        phone: fiveSimOrder.phone,
        service, serviceName, country, countryName,
        status: mapFiveSimStatus(fiveSimOrder.status),
        priceUsd, priceFcfa,
        currency: currency ?? "USD",
      }).returning();
      return newOrder;
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur lors de l'achat";
    res.status(400).json({ error: "Purchase failed", message });
    return;
  }

  res.json({ order: formatOrder(order) });

  // Fire-and-forget Telegram notification
  db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId)).limit(1).then(([u]) => {
    notifyPurchase({
      userId,
      userName: u?.name ?? `User#${userId}`,
      orderId: String(order.id),
      serviceName,
      countryName,
      phone: fiveSimOrder.phone,
      priceFcfa: order.priceFcfa,
      priceUsd:  order.priceUsd,
    }).catch(() => {});
  }).catch(() => {});
});

// ─── Check SMS ────────────────────────────────────────────────────────────────
router.get("/v1/check/:orderId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = Array.isArray(req.params.orderId) ? req.params.orderId[0] : req.params.orderId;
  const parsed = CheckSmsParams.safeParse({ orderId: rawId });
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [dbOrder] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, parseInt(rawId, 10)), eq(ordersTable.userId, req.userId!)))
    .limit(1);

  if (!dbOrder) {
    res.status(404).json({ error: "Not found", message: "Commande introuvable" });
    return;
  }

  let updatedOrder = dbOrder;

  if (dbOrder.status === "PENDING" || dbOrder.status === "RECEIVED") {
    // Auto-cancel if >6 minutes old with no code received
    const SIX_MIN_MS = 6 * 60 * 1000;
    const orderAge = Date.now() - new Date(dbOrder.createdAt).getTime();
    if (orderAge > SIX_MIN_MS && !dbOrder.smsCode) {
      try { await cancelOrder(parseInt(dbOrder.externalId, 10)); } catch { /* ignore 5sim error */ }
      const [canceled] = await db.transaction(async (tx) => {
        await tx
          .update(usersTable)
          .set({ balanceUsd: sql`${usersTable.balanceUsd} + ${dbOrder.priceUsd}` })
          .where(eq(usersTable.id, dbOrder.userId));
        return tx
          .update(ordersTable)
          .set({ status: "CANCELED" })
          .where(eq(ordersTable.id, dbOrder.id))
          .returning();
      });
      res.json({ order: formatOrder(canceled), autocanceled: true });
      return;
    }

    try {
      const fiveSimOrder = await checkOrder(parseInt(dbOrder.externalId, 10));
      const newStatus = mapFiveSimStatus(fiveSimOrder.status);
      const smsCode = fiveSimOrder.sms?.[0]?.code ?? null;
      const smsText = fiveSimOrder.sms?.[0]?.text ?? null;

      const [updated] = await db
        .update(ordersTable)
        .set({ status: newStatus, smsCode, smsText })
        .where(eq(ordersTable.id, dbOrder.id))
        .returning();

      updatedOrder = updated;
    } catch {
      // Return existing data if 5SIM check fails
    }
  }

  res.json({ order: formatOrder(updatedOrder) });
});

// ─── Cancel order ─────────────────────────────────────────────────────────────
router.post("/v1/cancel/:orderId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = req.params["orderId"] as string;

  const [dbOrder] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, parseInt(rawId, 10)), eq(ordersTable.userId, req.userId!)))
    .limit(1);

  if (!dbOrder) {
    res.status(404).json({ error: "Not found", message: "Commande introuvable" });
    return;
  }

  // Allow cancel if PENDING, or if RECEIVED but no SMS code was delivered
  const canCancel = dbOrder.status === "PENDING" || (dbOrder.status === "RECEIVED" && !dbOrder.smsCode);
  if (!canCancel) {
    res.status(400).json({ error: "Invalid", message: "Cette commande ne peut pas être annulée (SMS déjà reçu)" });
    return;
  }

  try {
    await cancelOrder(parseInt(dbOrder.externalId, 10));
  } catch {
    // ignore 5SIM cancel error — update DB anyway
  }

  // Cancel order + refund balance in one transaction
  const [updated] = await db.transaction(async (tx) => {
    // Refund user
    await tx
      .update(usersTable)
      .set({ balanceUsd: sql`${usersTable.balanceUsd} + ${dbOrder.priceUsd}` })
      .where(eq(usersTable.id, req.userId!));
    // Mark order canceled
    return tx
      .update(ordersTable)
      .set({ status: "CANCELED" })
      .where(eq(ordersTable.id, dbOrder.id))
      .returning();
  });

  res.json({ order: formatOrder(updated) });
});

// ─── Finish/confirm order ─────────────────────────────────────────────────────
router.post("/v1/finish/:orderId", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const rawId = req.params["orderId"] as string;
  const userId = req.userId!;

  const [dbOrder] = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.id, parseInt(rawId, 10)), eq(ordersTable.userId, userId)))
    .limit(1);

  if (!dbOrder) {
    res.status(404).json({ error: "Not found", message: "Commande introuvable" });
    return;
  }

  try {
    await finishOrder(parseInt(dbOrder.externalId, 10));
  } catch {
    // ignore
  }

  const [updated] = await db
    .update(ordersTable)
    .set({ status: "FINISHED" })
    .where(eq(ordersTable.id, dbOrder.id))
    .returning();

  res.json({ order: formatOrder(updated) });

  // Credit affiliate commission (fire-and-forget)
  db.select({ referredBy: usersTable.referredBy })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1)
    .then(async ([buyer]) => {
      if (!buyer?.referredBy) return;

      // Check this order hasn't already been commissioned
      const existing = await db
        .select({ id: affiliateCommissionsTable.id })
        .from(affiliateCommissionsTable)
        .where(eq(affiliateCommissionsTable.orderId, dbOrder.id))
        .limit(1);
      if (existing.length > 0) return;

      const commission = Math.round(dbOrder.priceUsd * 0.10 * 10000) / 10000;
      if (commission <= 0) return;

      await db.transaction(async (tx) => {
        await tx.insert(affiliateCommissionsTable).values({
          userId: buyer.referredBy!,
          filleulId: userId,
          orderId: dbOrder.id,
          amountUsd: commission,
        });
        await tx
          .update(usersTable)
          .set({ affiliateBalance: sql`${usersTable.affiliateBalance} + ${commission}` })
          .where(eq(usersTable.id, buyer.referredBy!));
      });
    })
    .catch(() => {});
});

// ─── Order history ────────────────────────────────────────────────────────────
router.get("/v1/orders", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const parsed = GetOrderHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const page = parsed.data.page ?? 1;
  const limit = parsed.data.limit ?? 20;
  const offset = (page - 1) * limit;

  const { desc, count } = await import("drizzle-orm");

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.userId!))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: count() })
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.userId!));

  res.json({
    orders: orders.map(formatOrder),
    total: Number(total),
    page,
    limit,
  });
});

export default router;
