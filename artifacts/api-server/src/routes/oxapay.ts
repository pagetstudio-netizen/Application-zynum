import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { notifyDeposit, notifyPaymentAttempt } from "../lib/telegram.js";

const router: IRouter = Router();

const OXAPAY_BASE   = "https://api.oxapay.com";
const FCFA_PER_USD  = 620;

const CURRENCY_NETWORKS: Record<string, string> = {
  USDT: "TRC20",
  BTC:  "Bitcoin",
  ETH:  "ERC20",
  LTC:  "Litecoin",
  BNB:  "BSC",
  TRX:  "TRC20",
};

function generateOrderId(userId: string | number): string {
  return `ZNUM${Date.now()}U${userId}`;
}

// ─── POST /v1/payments/oxapay/initiate ────────────────────────────────────────
// Crée un paiement White Label OxaPay et retourne l'adresse crypto
router.post("/v1/payments/oxapay/initiate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { amountFcfa, userId, currency = "USDT" } = req.body ?? {};

    if (!amountFcfa || !userId) {
      res.status(400).json({ error: "Champs requis : amountFcfa, userId" });
      return;
    }

    const merchantKey = process.env.OXAPAY_MERCHANT_KEY ?? "";
    if (!merchantKey) {
      res.status(503).json({ error: "OxaPay non configuré. Clé manquante." });
      return;
    }

    const uid       = parseInt(String(userId), 10);
    const fcfa      = Math.round(Number(amountFcfa));
    const amountUsd = fcfa / FCFA_PER_USD;
    const orderId   = generateOrderId(uid);
    const baseUrl   = process.env.API_BASE_URL ?? "https://app.zynum.net";

    const cur     = String(currency).toUpperCase();
    const network = CURRENCY_NETWORKS[cur] ?? "TRC20";

    const body = {
      merchant:    merchantKey,
      amount:      parseFloat(amountUsd.toFixed(2)),
      currency:    "USD",
      lifeTime:    30,
      description: `Recharge ZyNum — ${fcfa.toLocaleString("fr-FR")} FCFA`,
      orderId,
      callbackUrl: `${baseUrl}/api/v1/webhooks/oxapay`,
    };

    console.log("[OxaPay initiate] request:", { ...body, merchant: "***" });

    const apiRes  = await fetch(`${OXAPAY_BASE}/merchants/request`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = await apiRes.json() as Record<string, unknown>;
    console.log("[OxaPay initiate] response:", JSON.stringify(data).slice(0, 500));

    if (Number(data.result) !== 100) {
      res.status(400).json({ error: String(data.message ?? "Erreur OxaPay"), data });
      return;
    }

    const trackId  = String(data.trackId ?? "");
    const payLink  = String(data.payLink ?? "");

    // Pré-enregistrer la transaction
    if (!isNaN(uid) && uid > 0) {
      await db.insert(transactionsTable).values({
        userId:     uid,
        type:       "recharge",
        amountUsd,
        amountFcfa: fcfa,
        method:     "oxapay",
        provider:   "oxapay",
        status:     "pending",
        reference:  orderId,
        metadata:   JSON.stringify({ trackId, payLink, orderId }),
      }).catch(e => console.warn("[OxaPay initiate] DB insert warn:", e));
    }

    res.json({
      status:    "pending",
      trackId,
      orderId,
      payLink,
      amountUsd: parseFloat(amountUsd.toFixed(2)),
      amountFcfa: fcfa,
      expiresIn: 30,
    });

    // Notifier le groupe Telegram admin de la tentative
    db.select({ name: usersTable.name }).from(usersTable)
      .where(eq(usersTable.id, uid)).limit(1)
      .then(([u]) => {
        notifyPaymentAttempt({
          userId:      uid,
          userName:    u?.name ?? `User#${uid}`,
          amountFcfa:  fcfa,
          amountUsd:   parseFloat(amountUsd.toFixed(2)),
          reference:   orderId,
          provider:    "OxaPay",
          trackId,
          payCurrency: cur,
        }).catch(() => {});
      }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    console.error("[OxaPay initiate] Error:", message);
    res.status(500).json({ error: "initiate_error", message });
  }
});

// ─── POST /v1/payments/oxapay/confirm — vérifier le statut ───────────────────
router.post("/v1/payments/oxapay/confirm", async (req: Request, res: Response): Promise<void> => {
  try {
    const { trackId, orderId, userId } = req.body ?? {};

    if (!trackId || !userId) {
      res.status(400).json({ error: "Champs requis : trackId, userId" });
      return;
    }

    const merchantKey = process.env.OXAPAY_MERCHANT_KEY ?? "";
    if (!merchantKey) {
      res.status(503).json({ error: "OxaPay non configuré" });
      return;
    }

    const uid = parseInt(String(userId), 10);

    // Vérifier si déjà crédité
    if (orderId) {
      const [existing] = await db
        .select({ status: transactionsTable.status })
        .from(transactionsTable)
        .where(eq(transactionsTable.reference, String(orderId)))
        .limit(1);
      if (existing?.status === "completed") {
        res.json({ credited: true, status: "Paid", action: "already_credited" });
        return;
      }
    }

    const apiRes = await fetch(`${OXAPAY_BASE}/merchants/inquiry`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ merchant: merchantKey, trackId }),
    });
    const data = await apiRes.json() as Record<string, unknown>;
    console.log("[OxaPay confirm] status response:", JSON.stringify(data).slice(0, 300));

    if (Number(data.result) !== 100) {
      res.json({ credited: false, status: "unknown", message: "Vérification impossible" });
      return;
    }

    const status = String(data.status ?? "").toLowerCase();

    if (status === "expired" || status === "failed") {
      if (orderId) {
        await db.update(transactionsTable)
          .set({ status: "failed" })
          .where(eq(transactionsTable.reference, String(orderId)))
          .catch(() => {});
      }
      res.json({ credited: false, failed: true, status: data.status, message: "Paiement expiré ou échoué." });
      return;
    }

    if (status !== "paid") {
      res.json({ credited: false, status: data.status, message: "En attente de paiement…" });
      return;
    }

    // Statut = Paid → créditer
    const receivedUsd  = Number(data.payAmount ?? data.amount ?? 0);
    const amountFcfa   = Math.round(receivedUsd * FCFA_PER_USD);

    const [user] = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.id, uid)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    await db.update(usersTable)
      .set({ balanceUsd: sql`${usersTable.balanceUsd} + ${receivedUsd}` })
      .where(eq(usersTable.id, uid));

    if (orderId) {
      await db.update(transactionsTable)
        .set({ status: "completed", amountUsd: receivedUsd, amountFcfa })
        .where(eq(transactionsTable.reference, String(orderId)))
        .catch(() => {});
    }

    console.log(`[OxaPay confirm] Crédité $${receivedUsd.toFixed(4)} → user #${uid}`);
    res.json({ credited: true, status: "Paid", action: "credited", amountUsd: receivedUsd });

    db.select({ name: usersTable.name }).from(usersTable)
      .where(eq(usersTable.id, uid)).limit(1)
      .then(([u]) => {
        notifyDeposit({
          userId:    uid,
          userName:  u?.name ?? `User#${uid}`,
          amountFcfa,
          amountUsd: receivedUsd,
          reference: String(orderId ?? trackId),
          method:    "OxaPay Crypto",
          phone:     "",
          operator:  String(data.currency ?? "Crypto"),
        }).catch(() => {});
      }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    console.error("[OxaPay confirm] Error:", message);
    res.status(500).json({ error: "confirm_error", message });
  }
});

// ─── POST /v1/webhooks/oxapay ─────────────────────────────────────────────────
router.post("/v1/webhooks/oxapay", async (req: Request, res: Response): Promise<void> => {
  const body = req.body ?? {};
  console.log("[OxaPay webhook] Received:", JSON.stringify(body).slice(0, 600));

  res.status(200).json({ received: true });

  try {
    const status  = String(body.status ?? "").toLowerCase();
    const orderId = String(body.orderId ?? "");
    const trackId = String(body.trackId ?? "");

    if (status !== "paid") {
      if ((status === "expired" || status === "failed") && orderId) {
        await db.update(transactionsTable)
          .set({ status: "failed" })
          .where(eq(transactionsTable.reference, orderId))
          .catch(() => {});
      }
      console.log("[OxaPay webhook] Non-paid status:", status);
      return;
    }

    // Vérifier doublon
    if (orderId) {
      const [existing] = await db
        .select({ id: transactionsTable.id, status: transactionsTable.status, userId: transactionsTable.userId })
        .from(transactionsTable)
        .where(eq(transactionsTable.reference, orderId))
        .limit(1);

      if (existing?.status === "completed") {
        console.log("[OxaPay webhook] Duplicate, ignoring:", orderId);
        return;
      }

      const payAmount  = Number(body.payAmount ?? body.amount ?? 0);
      const amountFcfa = Math.round(payAmount * FCFA_PER_USD);

      // Résoudre userId depuis la référence ZNUM...U{id}
      let userId: number | null = existing?.userId ?? null;
      if (!userId && orderId) {
        const match = orderId.match(/U(\d+)$/);
        if (match) userId = parseInt(match[1], 10);
      }

      if (!userId || isNaN(userId)) {
        console.error("[OxaPay webhook] Cannot resolve userId from orderId:", orderId);
        return;
      }

      const [user] = await db.select({ id: usersTable.id })
        .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      if (!user) {
        console.error("[OxaPay webhook] User not found:", userId);
        return;
      }

      await db.update(usersTable)
        .set({ balanceUsd: sql`${usersTable.balanceUsd} + ${payAmount}` })
        .where(eq(usersTable.id, userId));

      if (existing) {
        await db.update(transactionsTable)
          .set({ status: "completed", amountUsd: payAmount, amountFcfa })
          .where(eq(transactionsTable.reference, orderId));
      } else {
        await db.insert(transactionsTable).values({
          userId,
          type:       "recharge",
          amountUsd:  payAmount,
          amountFcfa,
          method:     "oxapay",
          provider:   "oxapay",
          status:     "completed",
          reference:  orderId,
          metadata:   JSON.stringify({ webhookPayload: body, trackId }),
        });
      }

      console.log(`[OxaPay webhook] Crédité $${payAmount.toFixed(4)} → user #${userId}`);

      db.select({ name: usersTable.name }).from(usersTable)
        .where(eq(usersTable.id, userId)).limit(1)
        .then(([u]) => {
          notifyDeposit({
            userId,
            userName:  u?.name ?? `User#${userId}`,
            amountFcfa,
            amountUsd: payAmount,
            reference: orderId,
            method:    "OxaPay Crypto",
            phone:     "",
            operator:  String(body.currency ?? "Crypto"),
          }).catch(() => {});
        }).catch(() => {});
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur webhook";
    console.error("[OxaPay webhook] Error:", message);
  }
});

export default router;
