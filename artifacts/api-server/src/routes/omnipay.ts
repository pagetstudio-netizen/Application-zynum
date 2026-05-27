import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/adminMiddleware.js";
import { notifyDeposit } from "../lib/telegram.js";

const router: IRouter = Router();

const OMNIPAY_BASE = "https://omnipay.webtechci.com/interface/api2";
const FCFA_PER_USD = 620;

const CURRENCY_TO_USD: Record<string, number> = {
  XOF: 1 / 620,
  XAF: 1 / 620,
  GHS: 1 / 15,
  GNF: 1 / 8700,
  USD: 1,
};

interface OmniOperatorInfo {
  omnipayOperator: string;
  needsOtp: boolean;
  needsReturnUrl: boolean;
  prefix: string;
  currency: string;
}

const OMNIPAY_OPERATORS: Record<string, OmniOperatorInfo> = {
  // Côte d'Ivoire
  ORANGE_CI: { omnipayOperator: "orange",   needsOtp: true,  needsReturnUrl: false, prefix: "225", currency: "XOF" },
  MTN_CI:    { omnipayOperator: "mtn",      needsOtp: false, needsReturnUrl: false, prefix: "225", currency: "XOF" },
  MOOV_CI:   { omnipayOperator: "moov",     needsOtp: false, needsReturnUrl: false, prefix: "225", currency: "XOF" },
  WAVE_CI:   { omnipayOperator: "wave",     needsOtp: false, needsReturnUrl: true,  prefix: "225", currency: "XOF" },
  MIXX_CI:   { omnipayOperator: "mixx",     needsOtp: false, needsReturnUrl: false, prefix: "225", currency: "XOF" },
  // Sénégal
  WAVE_SN:   { omnipayOperator: "wave",     needsOtp: false, needsReturnUrl: true,  prefix: "221", currency: "XOF" },
  ORANGE_SN: { omnipayOperator: "orange",   needsOtp: false, needsReturnUrl: false, prefix: "221", currency: "XOF" },
  FREE_SN:   { omnipayOperator: "free",     needsOtp: false, needsReturnUrl: false, prefix: "221", currency: "XOF" },
  // Burkina Faso
  ORANGE_BF: { omnipayOperator: "orange",   needsOtp: true,  needsReturnUrl: false, prefix: "226", currency: "XOF" },
  MOOV_BF:   { omnipayOperator: "moov",     needsOtp: false, needsReturnUrl: false, prefix: "226", currency: "XOF" },
  // Mali
  ORANGE_ML: { omnipayOperator: "orange",   needsOtp: true,  needsReturnUrl: false, prefix: "223", currency: "XOF" },
  MOOV_ML:   { omnipayOperator: "moov",     needsOtp: false, needsReturnUrl: false, prefix: "223", currency: "XOF" },
  // Guinée
  ORANGE_GN: { omnipayOperator: "orange",   needsOtp: false, needsReturnUrl: false, prefix: "224", currency: "GNF" },
  MTN_GN:    { omnipayOperator: "mtn",      needsOtp: false, needsReturnUrl: false, prefix: "224", currency: "GNF" },
  // Cameroun
  MTN_CM:    { omnipayOperator: "mtn",      needsOtp: false, needsReturnUrl: false, prefix: "237", currency: "XAF" },
  ORANGE_CM: { omnipayOperator: "orange",   needsOtp: false, needsReturnUrl: false, prefix: "237", currency: "XAF" },
  // Bénin
  MTN_BJ:    { omnipayOperator: "mtn",      needsOtp: false, needsReturnUrl: false, prefix: "229", currency: "XOF" },
  MOOV_BJ:   { omnipayOperator: "moov",     needsOtp: false, needsReturnUrl: false, prefix: "229", currency: "XOF" },
  // Togo
  MOOV_TG:    { omnipayOperator: "moov",    needsOtp: false, needsReturnUrl: false, prefix: "228", currency: "XOF" },
  TOGOCEL_TG: { omnipayOperator: "togocel", needsOtp: false, needsReturnUrl: false, prefix: "228", currency: "XOF" },
  // Ghana
  MTN_GH:    { omnipayOperator: "mtn",      needsOtp: false, needsReturnUrl: false, prefix: "233", currency: "GHS" },
  AIRTEL_GH: { omnipayOperator: "airtel",   needsOtp: false, needsReturnUrl: false, prefix: "233", currency: "GHS" },
  // Niger
  MOOV_NE:   { omnipayOperator: "moov",     needsOtp: false, needsReturnUrl: false, prefix: "227", currency: "XOF" },
};

function buildMsisdn(phone: string, prefix: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00" + prefix)) return digits.slice(2);
  if (digits.startsWith(prefix) && digits.length > 8) return digits;
  return prefix + digits;
}

function generateReference(userId: string | number): string {
  return `ZNUM${Date.now()}U${userId}`;
}

function verifyOmniSignature(body: Record<string, unknown>, callbackKey: string): boolean {
  try {
    const { id, type, reference, msisdn, amount, fees, status, message } = body;
    const concatenated = [id, type, reference, msisdn, amount, fees, status, message].join("|");
    const expected = crypto.createHmac("sha3-512", callbackKey).update(concatenated).digest("hex");
    return expected === String(body.signature ?? "");
  } catch {
    return true;
  }
}

// POST /v1/payments/omnipay/initiate
router.post("/v1/payments/omnipay/initiate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, userId, phone, operatorId, otp, firstName, lastName } = req.body ?? {};

    if (!amount || !userId || !phone || !operatorId) {
      res.status(400).json({ error: "Champs requis manquants : amount, userId, phone, operatorId" });
      return;
    }

    const opInfo = OMNIPAY_OPERATORS[operatorId as string];
    if (!opInfo) {
      res.status(400).json({ error: `Opérateur inconnu : ${operatorId}` });
      return;
    }

    const apiKey = process.env.OMNIPAY_API_KEY ?? "";
    if (!apiKey) {
      res.status(503).json({ error: "OmniPay non configuré. Clé API manquante." });
      return;
    }

    if (opInfo.needsOtp && !otp) {
      res.status(400).json({
        error: "Un code OTP est requis pour cet opérateur. Générez-le depuis votre app Orange Money.",
        code: "OTP_REQUIRED",
      });
      return;
    }

    const uid = parseInt(String(userId), 10);
    const reference = generateReference(uid);
    const rawAmount = Math.round(Number(amount));
    const msisdn = buildMsisdn(String(phone), opInfo.prefix);
    const baseUrl = process.env.API_BASE_URL ?? "https://zynum.net";

    const body: Record<string, unknown> = {
      action: "paymentrequest",
      apikey: apiKey,
      msisdn,
      amount: String(rawAmount),
      reference,
      first_name: String(firstName ?? "ZyNum"),
      last_name:  String(lastName  ?? `User${uid}`),
    };

    body.operator = opInfo.omnipayOperator;
    if (opInfo.needsOtp)       body.otp = String(otp);
    if (opInfo.needsReturnUrl)  body.return_url = `${baseUrl}/recharge?omnipay_ref=${encodeURIComponent(reference)}`;

    // Save pending transaction
    if (!isNaN(uid) && uid > 0) {
      const rate     = CURRENCY_TO_USD[opInfo.currency] ?? CURRENCY_TO_USD.XOF;
      const usdEst   = rawAmount * rate;
      const fcfaEst  = opInfo.currency === "XOF" ? rawAmount : Math.round(usdEst * FCFA_PER_USD);
      try {
        await db.insert(transactionsTable).values({
          userId:    uid,
          type:      "recharge",
          amountUsd: usdEst,
          amountFcfa: fcfaEst,
          method:    "omnipay",
          provider:  "omnipay",
          status:    "pending",
          reference,
          metadata:  JSON.stringify({ operatorId, msisdn, currency: opInfo.currency }),
        });
      } catch (dbErr) {
        console.warn("[OmniPay initiate] DB pre-insert error:", dbErr);
      }
    }

    console.log("[OmniPay initiate] body:", { ...body, apikey: "***" });

    const omniRes = await fetch(OMNIPAY_BASE, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    const rawBody = await omniRes.text();
    let data: Record<string, unknown>;
    try { data = JSON.parse(rawBody); } catch { data = { raw: rawBody }; }

    console.log("[OmniPay initiate] response:", JSON.stringify(data).slice(0, 500));

    if (String(data.success) !== "1") {
      res.status(400).json({ ...data, reference });
      return;
    }

    res.json({ ...data, reference, needsOtp: opInfo.needsOtp });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    console.error("[OmniPay initiate] Error:", message);
    res.status(500).json({ error: "initiate_error", message });
  }
});

// POST /v1/payments/omnipay/confirm — poll status
router.post("/v1/payments/omnipay/confirm", async (req: Request, res: Response): Promise<void> => {
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

    const apiKey = process.env.OMNIPAY_API_KEY ?? "";
    if (!apiKey) {
      res.status(503).json({ error: "OmniPay non configuré" });
      return;
    }

    const omniRes = await fetch(OMNIPAY_BASE, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "getstatus", apikey: apiKey, reference }),
    });

    const data = (await omniRes.json()) as Record<string, unknown>;
    console.log("[OmniPay confirm] status:", JSON.stringify(data).slice(0, 300));

    const omniStatus = Number(data.status ?? 0);
    if (omniStatus === 4) {
      res.json({ credited: false, failed: true, omniStatus, message: String(data.message ?? "Transaction échouée") });
      return;
    }
    if (omniStatus !== 3) {
      res.json({ credited: false, omniStatus, message: String(data.message ?? "En attente") });
      return;
    }

    // Status 3 = success
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
        userId:    uid,
        type:      "recharge",
        amountUsd,
        amountFcfa,
        method:    "omnipay",
        provider:  "omnipay",
        status:    "completed",
        reference: String(reference),
        metadata:  JSON.stringify({ source: "manual_confirm", omnipayId: data.id }),
      });
    }

    console.log(`[OmniPay confirm] Crédité $${amountUsd.toFixed(4)} → user #${uid}`);
    res.json({ credited: true, action: "credited", amountUsd });

    // Fire-and-forget Telegram notification
    db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, uid)).limit(1).then(([u]) => {
      notifyDeposit({
        userId:    uid,
        userName:  u?.name ?? `User#${uid}`,
        amountFcfa,
        amountUsd,
        reference: String(reference),
        method:    "OmniPay",
        phone:     String(data.phone    ?? data.msisdn    ?? ""),
        operator:  String(data.operator ?? data.provider  ?? ""),
      }).catch(() => {});
    }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    console.error("[OmniPay confirm] Error:", message);
    res.status(500).json({ error: "confirm_error", message });
  }
});

// POST /v1/webhooks/omnipay — callback (IPN)
router.post("/v1/webhooks/omnipay", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body ?? {};
    console.log("[OmniPay webhook] Received:", JSON.stringify(body));

    // Verify HMAC-SHA3-512 signature
    const callbackKey = process.env.OMNIPAY_CALLBACK_KEY ?? process.env.OMNIPAY_API_KEY ?? "";
    if (callbackKey && body.signature) {
      if (!verifyOmniSignature(body as Record<string, unknown>, callbackKey)) {
        console.warn("[OmniPay webhook] Invalid signature, rejecting");
        res.status(401).json({ error: "Invalid signature" });
        return;
      }
    }

    const callbackStatus = Number(body.status ?? 0);
    const reference      = String(body.reference ?? "");

    if (callbackStatus !== 3) {
      res.json({ received: true, action: "ignored", status: callbackStatus });
      return;
    }

    if (!reference) {
      res.status(400).json({ error: "Missing reference" });
      return;
    }

    // Duplicate check
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
      console.error("[OmniPay webhook] Cannot resolve userId from reference:", reference);
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
        type:      "recharge",
        amountUsd,
        amountFcfa,
        method:    "omnipay",
        provider:  "omnipay",
        status:    "completed",
        reference,
        metadata:  JSON.stringify({ ipnPayload: body }),
      });
    }

    console.log(`[OmniPay webhook] Crédité $${amountUsd.toFixed(4)} → user #${userId}`);
    res.json({ received: true, action: "credited", amountUsd, userId });

    // Fire-and-forget Telegram notification
    db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId)).limit(1).then(([u]) => {
      notifyDeposit({
        userId,
        userName:  u?.name ?? `User#${userId}`,
        amountFcfa,
        amountUsd,
        reference,
        method:   "OmniPay",
        phone:    String(body.phone    ?? body.msisdn    ?? ""),
        operator: String(body.operator ?? body.provider  ?? ""),
      }).catch(() => {});
    }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur webhook";
    console.error("[OmniPay webhook] Error:", message);
    res.status(500).json({ error: "webhook_error", message });
  }
});

// ─── Admin: Consulter le solde OmniPay ───────────────────────────────────────
router.get("/v1/admin/omnipay/balance", requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = process.env.OMNIPAY_API_KEY;
    if (!apiKey) { res.status(500).json({ error: "OMNIPAY_API_KEY non configuré" }); return; }

    // Essaie plusieurs noms d'action possibles pour le solde OmniPay
    const actionsToTry = ["getbalance", "balance_check", "merchant_balance", "account_balance"];
    let data: Record<string, unknown> = {};
    let usedAction = "getbalance";

    for (const action of actionsToTry) {
      const r = await fetch(OMNIPAY_BASE, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, apikey: apiKey }),
      });
      data = await r.json() as Record<string, unknown>;
      usedAction = action;
      // S'arrête dès qu'on n'a pas "Invalid parameters"
      if (String(data.message ?? "").toLowerCase() !== "invalid parameters" && String(data.success ?? "") !== "0") break;
    }

    res.json({ success: true, usedAction, raw: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

// ─── Admin: Retrait / virement OmniPay ───────────────────────────────────────
router.post("/v1/admin/omnipay/withdraw", requireAuth, requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = process.env.OMNIPAY_API_KEY;
    if (!apiKey) { res.status(500).json({ error: "OMNIPAY_API_KEY non configuré" }); return; }

    const { phone, operatorId, amount, note, firstName, lastName } = req.body ?? {};
    if (!phone || !operatorId || !amount) {
      res.status(400).json({ error: "Champs requis : phone, operatorId, amount" });
      return;
    }

    const opInfo = OMNIPAY_OPERATORS[operatorId as string];
    if (!opInfo) { res.status(400).json({ error: `Opérateur inconnu : ${operatorId}` }); return; }

    const rawAmount = parseFloat(String(amount));
    if (isNaN(rawAmount) || rawAmount <= 0) { res.status(400).json({ error: "Montant invalide" }); return; }

    const msisdn    = buildMsisdn(String(phone), opInfo.prefix);
    const reference = `ZNUMOUT${Date.now()}`;

    const body: Record<string, string> = {
      action:     "transfer",
      apikey:     apiKey,
      msisdn,
      amount:     String(rawAmount),
      operator:   opInfo.omnipayOperator,
      reference,
      currency:   opInfo.currency,
      first_name: String(firstName || "ZyNum"),
      last_name:  String(lastName  || "Admin"),
    };
    if (note) body.note = String(note);

    const resp = await fetch(OMNIPAY_BASE, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = await resp.json() as Record<string, unknown>;

    const success = String(data.status ?? "").toLowerCase() === "success" || String(data.code ?? "") === "200";
    res.json({ success, reference, raw: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

export default router;
