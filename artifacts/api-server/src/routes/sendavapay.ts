import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/adminMiddleware.js";
import { notifyDeposit } from "../lib/telegram.js";

const router: IRouter = Router();

const SENDAVAPAY_BASE  = "https://sendavapay.com";
const FCFA_PER_USD     = 620;

const CURRENCY_TO_USD: Record<string, number> = {
  XOF: 1 / 620,
  XAF: 1 / 620,
  CDF: 1 / 2800,
  USD: 1,
};

interface SendavaOperatorInfo {
  operator: string;
  country:  string;
  currency: string;
  prefix:   string;
  needsOtp: boolean;
  ussdCode: string | null;
}

const SENDAVA_OPERATORS: Record<string, SendavaOperatorInfo> = {
  // Togo
  TMONEY_TG:  { operator: "TMoney", country: "TG", currency: "XOF", prefix: "228", needsOtp: false, ussdCode: null },
  MOOV_TG:    { operator: "Moov",   country: "TG", currency: "XOF", prefix: "228", needsOtp: false, ussdCode: null },
  // Bénin
  MTN_BJ:     { operator: "MTN",    country: "BJ", currency: "XOF", prefix: "229", needsOtp: false, ussdCode: null },
  MOOV_BJ:    { operator: "Moov",   country: "BJ", currency: "XOF", prefix: "229", needsOtp: false, ussdCode: null },
  // Cameroun
  MTN_CM:     { operator: "MTN",    country: "CM", currency: "XAF", prefix: "237", needsOtp: false, ussdCode: null },
  ORANGE_CM:  { operator: "Orange", country: "CM", currency: "XAF", prefix: "237", needsOtp: false, ussdCode: null },
  // Burkina Faso — Orange Money (OTP requis)
  ORANGE_BF:  { operator: "Orange", country: "BF", currency: "XOF", prefix: "226", needsOtp: true,  ussdCode: "*144*4*6*{amount}#" },
  // Côte d'Ivoire — Orange Money (OTP requis)
  ORANGE_CI:  { operator: "Orange", country: "CI", currency: "XOF", prefix: "225", needsOtp: true,  ussdCode: "#144*82#" },
  MTN_CI:     { operator: "MTN",    country: "CI", currency: "XOF", prefix: "225", needsOtp: false, ussdCode: null },
  MOOV_CI:    { operator: "Moov",   country: "CI", currency: "XOF", prefix: "225", needsOtp: false, ussdCode: null },
  WAVE_CI:    { operator: "Wave",   country: "CI", currency: "XOF", prefix: "225", needsOtp: false, ussdCode: null },
  // Mali — Orange Money (OTP requis)
  ORANGE_ML:  { operator: "Orange", country: "ML", currency: "XOF", prefix: "223", needsOtp: true,  ussdCode: "#144#77#" },
  // Sénégal
  ORANGE_SN:  { operator: "Orange", country: "SN", currency: "XOF", prefix: "221", needsOtp: true,  ussdCode: "#144#391#" },
  WAVE_SN:    { operator: "Wave",   country: "SN", currency: "XOF", prefix: "221", needsOtp: false, ussdCode: null },
  // RD Congo
  VODACOM_CD: { operator: "Vodacom", country: "COD", currency: "CDF", prefix: "243", needsOtp: false, ussdCode: null },
  AIRTEL_CD:  { operator: "Airtel",  country: "COD", currency: "CDF", prefix: "243", needsOtp: false, ussdCode: null },
  ORANGE_CD:  { operator: "Orange",  country: "COD", currency: "CDF", prefix: "243", needsOtp: false, ussdCode: null },
  // Congo Brazzaville
  MTN_CG:     { operator: "MTN",    country: "COG", currency: "XAF", prefix: "242", needsOtp: false, ussdCode: null },
  AIRTEL_CG:  { operator: "Airtel", country: "COG", currency: "XAF", prefix: "242", needsOtp: false, ussdCode: null },
};

function buildMsisdn(phone: string, prefix: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00" + prefix)) return "+" + digits.slice(2);
  if (digits.startsWith(prefix) && digits.length > 8) return "+" + digits;
  if (digits.startsWith("+")) return digits;
  return "+" + prefix + digits;
}

function generateReference(userId: string | number): string {
  return `ZNUM${Date.now()}U${userId}`;
}

function signRequest(payload: Record<string, unknown>, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}

async function sendavaPost(
  path: string,
  payload: Record<string, unknown>,
  apiKey: string,
  apiSecret: string
): Promise<Record<string, unknown>> {
  const signature = signRequest(payload, apiSecret);
  const res = await fetch(`${SENDAVAPAY_BASE}${path}`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key":    apiKey,
      "x-signature":  signature,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function sendavaGet(
  path: string,
  apiKey: string,
  apiSecret: string
): Promise<Record<string, unknown>> {
  const payload = {};
  const signature = signRequest(payload, apiSecret);
  const res = await fetch(`${SENDAVAPAY_BASE}${path}`, {
    method:  "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key":    apiKey,
      "x-signature":  signature,
    },
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

// ─── POST /v1/payments/sendavapay/initiate ────────────────────────────────────
router.post("/v1/payments/sendavapay/initiate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, userId, phone, operatorId, firstName, lastName } = req.body ?? {};

    if (!amount || !userId || !phone || !operatorId) {
      res.status(400).json({ error: "Champs requis manquants : amount, userId, phone, operatorId" });
      return;
    }

    const opInfo = SENDAVA_OPERATORS[operatorId as string];
    if (!opInfo) {
      res.status(400).json({ error: `Opérateur inconnu : ${operatorId}` });
      return;
    }

    const apiKey    = process.env.SENDAVAPAY_SDK_KEY        ?? "";
    const apiSecret = process.env.SENDAVAPAY_WEBHOOK_SECRET ?? "";
    if (!apiKey || !apiSecret) {
      res.status(503).json({ error: "SendavaPay non configuré. Clé API ou secret manquant." });
      return;
    }

    const uid       = parseInt(String(userId), 10);
    const reference = generateReference(uid);
    const rawAmount = Math.round(Number(amount));
    const msisdn    = buildMsisdn(String(phone), opInfo.prefix);
    const baseUrl   = process.env.API_BASE_URL ?? "https://zynum.net";

    const payload: Record<string, unknown> = {
      amount:       rawAmount,
      phoneNumber:  msisdn,
      operator:     opInfo.operator,
      country:      opInfo.country,
      customerName: `${String(firstName ?? "ZyNum")} ${String(lastName ?? `User${uid}`)}`.trim(),
      description:  "Recharge ZyNum",
      callbackUrl:  `${baseUrl}/api/v1/webhooks/sendavapay`,
      reference,
    };

    // Save pending transaction before calling API
    if (!isNaN(uid) && uid > 0) {
      const rate      = CURRENCY_TO_USD[opInfo.currency] ?? CURRENCY_TO_USD.XOF;
      const usdEst    = rawAmount * rate;
      const fcfaEst   = opInfo.currency === "XOF" ? rawAmount : Math.round(usdEst * FCFA_PER_USD);
      try {
        await db.insert(transactionsTable).values({
          userId:     uid,
          type:       "recharge",
          amountUsd:  usdEst,
          amountFcfa: fcfaEst,
          method:     "sendavapay",
          provider:   "sendavapay",
          status:     "pending",
          reference,
          metadata:   JSON.stringify({ operatorId, msisdn, currency: opInfo.currency }),
        });
      } catch (dbErr) {
        console.warn("[SendavaPay initiate] DB pre-insert error:", dbErr);
      }
    }

    console.log("[SendavaPay initiate] payload:", { ...payload, reference });

    const data = await sendavaPost("/api/sdk/payment", payload, apiKey, apiSecret);
    console.log("[SendavaPay initiate] response:", JSON.stringify(data).slice(0, 500));

    if (!data.success) {
      res.status(400).json({ ...data, reference });
      return;
    }

    // Build USSD code with actual amount for Burkina Faso
    let ussdCode = opInfo.ussdCode;
    if (ussdCode) ussdCode = ussdCode.replace("{amount}", String(rawAmount));

    res.json({
      ...data,
      reference,
      needsOtp: opInfo.needsOtp,
      ussdCode:  ussdCode ?? (data.ussdCode ?? null),
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    console.error("[SendavaPay initiate] Error:", message);
    res.status(500).json({ error: "initiate_error", message });
  }
});

// ─── POST /v1/payments/sendavapay/confirm-otp ─────────────────────────────────
router.post("/v1/payments/sendavapay/confirm-otp", async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference, otp } = req.body ?? {};

    if (!reference || !otp) {
      res.status(400).json({ error: "Champs requis manquants : reference, otp" });
      return;
    }

    const apiKey    = process.env.SENDAVAPAY_SDK_KEY    ?? "";
    const apiSecret = process.env.SENDAVAPAY_WEBHOOK_SECRET ?? "";
    if (!apiKey || !apiSecret) {
      res.status(503).json({ error: "SendavaPay non configuré" });
      return;
    }

    const payload = { reference: String(reference), otp: String(otp) };
    const data    = await sendavaPost("/api/sdk/confirm-otp", payload, apiKey, apiSecret);
    console.log("[SendavaPay confirm-otp] response:", JSON.stringify(data).slice(0, 300));

    res.json(data);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    console.error("[SendavaPay confirm-otp] Error:", message);
    res.status(500).json({ error: "confirm_otp_error", message });
  }
});

// ─── POST /v1/payments/sendavapay/confirm — vérifier / créditer manuellement ──
router.post("/v1/payments/sendavapay/confirm", async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference, userId } = req.body ?? {};

    if (!reference || !userId) {
      res.status(400).json({ error: "Champs requis manquants : reference, userId" });
      return;
    }

    const uid = parseInt(String(userId), 10);
    if (isNaN(uid) || uid <= 0) {
      res.status(400).json({ error: "userId invalide" });
      return;
    }

    // Check if already credited
    const [existing] = await db
      .select({ id: transactionsTable.id, status: transactionsTable.status })
      .from(transactionsTable)
      .where(eq(transactionsTable.reference, String(reference)))
      .limit(1);

    if (existing?.status === "completed") {
      res.json({ credited: true, action: "already_credited" });
      return;
    }

    const apiKey    = process.env.SENDAVAPAY_SDK_KEY    ?? "";
    const apiSecret = process.env.SENDAVAPAY_WEBHOOK_SECRET ?? "";
    if (!apiKey || !apiSecret) {
      res.status(503).json({ error: "SendavaPay non configuré" });
      return;
    }

    const payload = { reference: String(reference) };
    const data    = await sendavaPost("/api/sdk/verify", payload, apiKey, apiSecret);
    console.log("[SendavaPay confirm] verify response:", JSON.stringify(data).slice(0, 300));

    const txStatus = String(data.status ?? "").toUpperCase();

    if (txStatus === "FAILED" || txStatus === "CANCELLED") {
      res.json({ credited: false, failed: true, status: txStatus, message: String(data.message ?? "Transaction échouée") });
      return;
    }
    if (txStatus !== "SUCCESS") {
      res.json({ credited: false, status: txStatus, message: String(data.message ?? "En attente") });
      return;
    }

    const rawAmount  = Number(data.amount ?? 0);
    const currency   = String(data.currency ?? "XOF").toUpperCase();
    const rate       = CURRENCY_TO_USD[currency] ?? CURRENCY_TO_USD.XOF;
    const amountUsd  = rawAmount * rate;
    const amountFcfa = currency === "XOF" ? rawAmount : Math.round(amountUsd * FCFA_PER_USD);

    const [user] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.id, uid)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    await db.update(usersTable)
      .set({ balanceUsd: sql`${usersTable.balanceUsd} + ${amountUsd}` })
      .where(eq(usersTable.id, uid));

    if (existing) {
      await db.update(transactionsTable)
        .set({ status: "completed", amountUsd, amountFcfa })
        .where(eq(transactionsTable.reference, String(reference)));
    } else {
      await db.insert(transactionsTable).values({
        userId:     uid,
        type:       "recharge",
        amountUsd,
        amountFcfa,
        method:     "sendavapay",
        provider:   "sendavapay",
        status:     "completed",
        reference:  String(reference),
        metadata:   JSON.stringify({ source: "manual_confirm", txid: data.txid }),
      });
    }

    console.log(`[SendavaPay confirm] Crédité $${amountUsd.toFixed(4)} → user #${uid}`);
    res.json({ credited: true, action: "credited", amountUsd });

    db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, uid)).limit(1).then(([u]) => {
      notifyDeposit({
        userId:    uid,
        userName:  u?.name ?? `User#${uid}`,
        amountFcfa,
        amountUsd,
        reference: String(reference),
        method:    "SendavaPay",
        phone:     String(data.phoneNumber ?? ""),
        operator:  String(data.operator ?? ""),
      }).catch(() => {});
    }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    console.error("[SendavaPay confirm] Error:", message);
    res.status(500).json({ error: "confirm_error", message });
  }
});

// ─── POST /v1/webhooks/sendavapay — callback asynchrone ──────────────────────
router.post("/v1/webhooks/sendavapay", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body ?? {};
    console.log("[SendavaPay webhook] Received:", JSON.stringify(body));

    const txStatus  = String(body.status ?? "").toUpperCase();
    const reference = String(body.reference ?? body.txid ?? "");

    if (txStatus !== "SUCCESS") {
      res.json({ received: true, action: "ignored", status: txStatus });
      return;
    }

    if (!reference) {
      res.status(400).json({ error: "Missing reference" });
      return;
    }

    // Duplicate guard
    const [existing] = await db
      .select({ id: transactionsTable.id, status: transactionsTable.status, userId: transactionsTable.userId })
      .from(transactionsTable)
      .where(eq(transactionsTable.reference, reference))
      .limit(1);

    if (existing?.status === "completed") {
      res.json({ received: true, action: "duplicate_ignored" });
      return;
    }

    const rawAmount  = Number(body.amount ?? 0);
    const currency   = String(body.currency ?? "XOF").toUpperCase();
    const rate       = CURRENCY_TO_USD[currency] ?? CURRENCY_TO_USD.XOF;
    const amountUsd  = rawAmount * rate;
    const amountFcfa = currency === "XOF" ? rawAmount : Math.round(amountUsd * FCFA_PER_USD);

    // Resolve userId from pending transaction or reference pattern
    let userId: number | null = existing?.userId ?? null;
    if (!userId) {
      const match = reference.match(/U(\d+)$/);
      if (match) userId = parseInt(match[1], 10);
    }

    if (!userId || isNaN(userId)) {
      console.error("[SendavaPay webhook] Cannot resolve userId from reference:", reference);
      res.status(400).json({ error: "Cannot resolve userId" });
      return;
    }

    const [user] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Utilisateur introuvable" });
      return;
    }

    await db.update(usersTable)
      .set({ balanceUsd: sql`${usersTable.balanceUsd} + ${amountUsd}` })
      .where(eq(usersTable.id, userId));

    if (existing) {
      await db.update(transactionsTable)
        .set({ status: "completed", amountUsd, amountFcfa })
        .where(eq(transactionsTable.reference, reference));
    } else {
      await db.insert(transactionsTable).values({
        userId,
        type:       "recharge",
        amountUsd,
        amountFcfa,
        method:     "sendavapay",
        provider:   "sendavapay",
        status:     "completed",
        reference,
        metadata:   JSON.stringify({ webhookPayload: body }),
      });
    }

    console.log(`[SendavaPay webhook] Crédité $${amountUsd.toFixed(4)} → user #${userId}`);
    res.json({ received: true, action: "credited", amountUsd, userId });

    db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId)).limit(1).then(([u]) => {
      notifyDeposit({
        userId,
        userName:  u?.name ?? `User#${userId}`,
        amountFcfa,
        amountUsd,
        reference,
        method:    "SendavaPay",
        phone:     String(body.phoneNumber ?? body.phone ?? ""),
        operator:  String(body.operator ?? ""),
      }).catch(() => {});
    }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur webhook";
    console.error("[SendavaPay webhook] Error:", message);
    res.status(500).json({ error: "webhook_error", message });
  }
});

// ─── Admin : solde SendavaPay ─────────────────────────────────────────────────
router.get("/v1/admin/sendavapay/balance", requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const apiKey    = process.env.SENDAVAPAY_SDK_KEY    ?? "";
    const apiSecret = process.env.SENDAVAPAY_WEBHOOK_SECRET ?? "";
    if (!apiKey || !apiSecret) {
      res.status(503).json({ error: "SENDAVAPAY_SDK_KEY / SENDAVAPAY_WEBHOOK_SECRET non configurés" });
      return;
    }
    const data = await sendavaGet("/api/sdk/balance", apiKey, apiSecret);
    res.json({ success: true, raw: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

// ─── Admin : retrait SendavaPay ───────────────────────────────────────────────
router.post("/v1/admin/sendavapay/withdraw", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey    = process.env.SENDAVAPAY_SDK_KEY    ?? "";
    const apiSecret = process.env.SENDAVAPAY_WEBHOOK_SECRET ?? "";
    if (!apiKey || !apiSecret) {
      res.status(503).json({ error: "SENDAVAPAY_SDK_KEY / SENDAVAPAY_WEBHOOK_SECRET non configurés" });
      return;
    }

    const { phone, operatorId, amount } = req.body ?? {};
    if (!phone || !operatorId || !amount) {
      res.status(400).json({ error: "Champs requis : phone, operatorId, amount" });
      return;
    }

    const opInfo = SENDAVA_OPERATORS[operatorId as string];
    if (!opInfo) {
      res.status(400).json({ error: `Opérateur inconnu : ${operatorId}` });
      return;
    }

    const rawAmount = parseFloat(String(amount));
    if (isNaN(rawAmount) || rawAmount <= 0) {
      res.status(400).json({ error: "Montant invalide" });
      return;
    }

    const msisdn  = buildMsisdn(String(phone), opInfo.prefix);
    const payload = {
      amount:      rawAmount,
      phoneNumber: msisdn,
      operator:    opInfo.operator,
      country:     opInfo.country,
    };

    const data = await sendavaPost("/api/sdk/withdraw", payload, apiKey, apiSecret);
    const success = data.success === true || String(data.status ?? "").toUpperCase() === "SUCCESS";
    res.json({ success, raw: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

export default router;
