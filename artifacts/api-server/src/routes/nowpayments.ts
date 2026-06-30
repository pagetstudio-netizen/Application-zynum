import { Router, type IRouter, type Request, type Response } from "express";
import { createHmac } from "crypto";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { notifyDeposit, notifyPaymentAttempt } from "../lib/telegram.js";

const router: IRouter = Router();

const NP_BASE      = "https://api.nowpayments.io";
const FCFA_PER_USD = 620;

function generateOrderId(userId: string | number): string {
  return `ZNUM${Date.now()}U${userId}`;
}

function npHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-key": process.env.NOWPAYMENTS_API_KEY ?? "",
  };
}

// ─── POST /v1/payments/nowpayments/initiate ──────────────────────────────────
router.post("/v1/payments/nowpayments/initiate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { amountFcfa, userId, payCurrency = "usdttrc20" } = req.body ?? {};

    if (!amountFcfa || !userId) {
      res.status(400).json({ error: "Champs requis : amountFcfa, userId" });
      return;
    }

    const apiKey = process.env.NOWPAYMENTS_API_KEY ?? "";
    if (!apiKey) {
      res.status(503).json({ error: "NowPayments non configuré. Clé manquante." });
      return;
    }

    const uid      = parseInt(String(userId), 10);
    const fcfa     = Math.round(Number(amountFcfa));
    const priceUsd = parseFloat((fcfa / FCFA_PER_USD).toFixed(2));
    const orderId  = generateOrderId(uid);
    const baseUrl  = process.env.API_BASE_URL ?? "https://app.zynum.net";

    const body = {
      price_amount:    priceUsd,
      price_currency:  "usd",
      pay_currency:    String(payCurrency).toLowerCase(),
      ipn_callback_url: `${baseUrl}/api/v1/webhooks/nowpayments`,
      order_id:        orderId,
      order_description: `Recharge ZyNum — ${fcfa.toLocaleString("fr-FR")} FCFA`,
    };

    console.log("[NowPayments initiate] request:", { ...body, order_id: orderId });

    const apiRes = await fetch(`${NP_BASE}/v1/payment`, {
      method:  "POST",
      headers: npHeaders(),
      body:    JSON.stringify(body),
    });
    const data = await apiRes.json() as Record<string, unknown>;
    console.log("[NowPayments initiate] response:", JSON.stringify(data).slice(0, 500));

    if (!apiRes.ok || !data.pay_address) {
      res.status(400).json({ error: String(data.message ?? "Erreur NowPayments"), data });
      return;
    }

    const paymentId  = String(data.payment_id ?? "");
    const payAddress = String(data.pay_address ?? "");
    const payAmount  = Number(data.pay_amount ?? priceUsd);
    const payCur     = String(data.pay_currency ?? payCurrency);
    const network    = String(data.network ?? "");
    const expiresAt  = String(data.expiration_estimate_date ?? "");

    // Pré-enregistrer la transaction
    if (!isNaN(uid) && uid > 0) {
      await db.insert(transactionsTable).values({
        userId:     uid,
        type:       "recharge",
        amountUsd:  priceUsd,
        amountFcfa: fcfa,
        method:     "nowpayments",
        provider:   "nowpayments",
        status:     "pending",
        reference:  orderId,
        metadata:   JSON.stringify({ paymentId, payAddress, payCur, payAmount, network, orderId }),
      }).catch(e => console.warn("[NowPayments initiate] DB insert warn:", e));
    }

    res.json({
      status:     "pending",
      paymentId,
      orderId,
      payAddress,
      payAmount,
      payCurrency: payCur,
      network,
      priceUsd,
      amountFcfa: fcfa,
      expiresAt,
    });

    // Notifier le groupe Telegram admin de la tentative
    db.select({ name: usersTable.name }).from(usersTable)
      .where(eq(usersTable.id, uid)).limit(1)
      .then(([u]) => {
        notifyPaymentAttempt({
          userId:      uid,
          userName:    u?.name ?? `User#${uid}`,
          amountFcfa:  fcfa,
          amountUsd:   priceUsd,
          reference:   orderId,
          provider:    "NowPayments",
          paymentId,
          payCurrency: payCur,
        }).catch(() => {});
      }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    console.error("[NowPayments initiate] Error:", message);
    res.status(500).json({ error: "initiate_error", message });
  }
});

// ─── GET /v1/payments/nowpayments/status/:paymentId ─────────────────────────
router.get("/v1/payments/nowpayments/status/:paymentId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const { orderId, userId } = req.query;

    const apiKey = process.env.NOWPAYMENTS_API_KEY ?? "";
    if (!apiKey) { res.status(503).json({ error: "NowPayments non configuré" }); return; }

    const uid = parseInt(String(userId ?? "0"), 10);

    // Anti-doublon
    if (orderId) {
      const [existing] = await db
        .select({ status: transactionsTable.status })
        .from(transactionsTable)
        .where(eq(transactionsTable.reference, String(orderId)))
        .limit(1);
      if (existing?.status === "completed") {
        res.json({ credited: true, status: "finished", action: "already_credited" });
        return;
      }
    }

    const apiRes = await fetch(`${NP_BASE}/v1/payment/${paymentId}`, {
      headers: npHeaders(),
    });
    const data = await apiRes.json() as Record<string, unknown>;
    const status = String(data.payment_status ?? "").toLowerCase();

    console.log(`[NowPayments status] ${paymentId} → ${status}`);

    if (status === "expired" || status === "failed" || status === "refunded") {
      if (orderId) {
        await db.update(transactionsTable)
          .set({ status: "failed" })
          .where(eq(transactionsTable.reference, String(orderId)))
          .catch(() => {});
      }
      res.json({ credited: false, failed: true, status, message: "Paiement expiré ou échoué." });
      return;
    }

    if (status !== "finished" && status !== "confirmed") {
      res.json({ credited: false, status, message: "En attente de paiement…" });
      return;
    }

    // Créditer
    const actuallyPaid = Number(data.actually_paid ?? data.pay_amount ?? 0);
    const priceAmount  = Number(data.price_amount ?? 0);
    const amountUsd    = priceAmount > 0 ? priceAmount : actuallyPaid;
    const amountFcfa   = Math.round(amountUsd * FCFA_PER_USD);

    const [user] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.id, uid)).limit(1);
    if (!user) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }

    await db.update(usersTable)
      .set({ balanceUsd: sql`${usersTable.balanceUsd} + ${amountUsd}` })
      .where(eq(usersTable.id, uid));

    if (orderId) {
      await db.update(transactionsTable)
        .set({ status: "completed", amountUsd, amountFcfa })
        .where(eq(transactionsTable.reference, String(orderId)))
        .catch(() => {});
    }

    console.log(`[NowPayments status] Crédité $${amountUsd.toFixed(2)} → user #${uid}`);
    res.json({ credited: true, status, action: "credited", amountUsd });

    db.select({ name: usersTable.name }).from(usersTable)
      .where(eq(usersTable.id, uid)).limit(1)
      .then(([u]) => {
        notifyDeposit({
          userId: uid,
          userName: u?.name ?? `User#${uid}`,
          amountFcfa,
          amountUsd,
          reference: String(orderId ?? paymentId),
          method: "NowPayments Crypto",
          phone: "",
          operator: String(data.pay_currency ?? "Crypto"),
        }).catch(() => {});
      }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    console.error("[NowPayments status] Error:", message);
    res.status(500).json({ error: "status_error", message });
  }
});

// ─── POST /v1/webhooks/nowpayments ───────────────────────────────────────────
router.post("/v1/webhooks/nowpayments", async (req: Request, res: Response): Promise<void> => {
  const body = req.body ?? {};
  console.log("[NowPayments webhook] Received:", JSON.stringify(body).slice(0, 600));

  // Vérifier signature HMAC si secret configuré
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET ?? "";
  if (ipnSecret) {
    const sig = req.headers["x-nowpayments-sig"] as string;
    if (sig) {
      const sorted  = JSON.stringify(body, Object.keys(body).sort());
      const hmac    = createHmac("sha512", ipnSecret).update(sorted).digest("hex");
      if (hmac !== sig) {
        console.warn("[NowPayments webhook] Signature invalide — ignoré");
        res.status(200).json({ received: true });
        return;
      }
    }
  }

  res.status(200).json({ received: true });

  try {
    const status  = String(body.payment_status ?? "").toLowerCase();
    const orderId = String(body.order_id ?? "");

    if (status !== "finished" && status !== "confirmed") {
      if ((status === "expired" || status === "failed") && orderId) {
        await db.update(transactionsTable)
          .set({ status: "failed" })
          .where(eq(transactionsTable.reference, orderId))
          .catch(() => {});
      }
      console.log("[NowPayments webhook] Non-finished status:", status);
      return;
    }

    // Anti-doublon
    if (!orderId) { console.error("[NowPayments webhook] Pas d'orderId"); return; }
    const [existing] = await db
      .select({ id: transactionsTable.id, status: transactionsTable.status, userId: transactionsTable.userId })
      .from(transactionsTable)
      .where(eq(transactionsTable.reference, orderId))
      .limit(1);

    if (existing?.status === "completed") {
      console.log("[NowPayments webhook] Doublon, ignoré:", orderId);
      return;
    }

    const actuallyPaid = Number(body.actually_paid ?? body.pay_amount ?? 0);
    const priceAmount  = Number(body.price_amount ?? 0);
    const amountUsd    = priceAmount > 0 ? priceAmount : actuallyPaid;
    const amountFcfa   = Math.round(amountUsd * FCFA_PER_USD);

    // Résoudre userId depuis référence ZNUM...U{id}
    let userId: number | null = existing?.userId ?? null;
    if (!userId) {
      const match = orderId.match(/U(\d+)$/);
      if (match) userId = parseInt(match[1], 10);
    }
    if (!userId || isNaN(userId)) {
      console.error("[NowPayments webhook] Impossible de résoudre userId:", orderId);
      return;
    }

    const [user] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { console.error("[NowPayments webhook] User introuvable:", userId); return; }

    await db.update(usersTable)
      .set({ balanceUsd: sql`${usersTable.balanceUsd} + ${amountUsd}` })
      .where(eq(usersTable.id, userId));

    if (existing) {
      await db.update(transactionsTable)
        .set({ status: "completed", amountUsd, amountFcfa })
        .where(eq(transactionsTable.reference, orderId));
    } else {
      await db.insert(transactionsTable).values({
        userId,
        type:       "recharge",
        amountUsd,
        amountFcfa,
        method:     "nowpayments",
        provider:   "nowpayments",
        status:     "completed",
        reference:  orderId,
        metadata:   JSON.stringify({ webhookPayload: body }),
      });
    }

    console.log(`[NowPayments webhook] Crédité $${amountUsd.toFixed(2)} → user #${userId}`);

    db.select({ name: usersTable.name }).from(usersTable)
      .where(eq(usersTable.id, userId)).limit(1)
      .then(([u]) => {
        notifyDeposit({
          userId,
          userName: u?.name ?? `User#${userId}`,
          amountFcfa,
          amountUsd,
          reference: orderId,
          method: "NowPayments Crypto",
          phone: "",
          operator: String(body.pay_currency ?? "Crypto"),
        }).catch(() => {});
      }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur webhook";
    console.error("[NowPayments webhook] Error:", message);
  }
});

export default router;
