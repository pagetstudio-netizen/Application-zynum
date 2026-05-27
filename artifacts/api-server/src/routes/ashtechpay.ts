import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, transactionsTable, operatorRoutesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware.js";
import { requireAdmin } from "../middlewares/adminMiddleware.js";
import { notifyDeposit } from "../lib/telegram.js";

const router: IRouter = Router();

const ATP_BASE    = "https://ashtechpay.top";
const FCFA_PER_USD = 620;

const CURRENCY_TO_USD: Record<string, number> = {
  XOF: 1 / 620,
  XAF: 1 / 620,
  GNF: 1 / 8700,
  CDF: 1 / 2800,
  USD: 1,
};

interface ATPOperatorInfo {
  operator:     string;
  country_code: string;
  currency:     string;
  prefix:       string;
}

const ATP_OPERATORS: Record<string, ATPOperatorInfo> = {
  // Bénin
  ATP_MOOV_BJ:      { operator: "Moov Money",       country_code: "BJ", currency: "XOF", prefix: "229" },
  ATP_MTN_BJ:       { operator: "MTN Mobile Money",  country_code: "BJ", currency: "XOF", prefix: "229" },
  // Burkina Faso
  ATP_MOOV_BF:      { operator: "Moov Money",        country_code: "BF", currency: "XOF", prefix: "226" },
  ATP_ORANGE_BF:    { operator: "Orange Money",       country_code: "BF", currency: "XOF", prefix: "226" },
  // Cameroun
  ATP_MTN_CM:       { operator: "MTN Mobile Money",  country_code: "CM", currency: "XAF", prefix: "237" },
  ATP_ORANGE_CM:    { operator: "Orange Money",       country_code: "CM", currency: "XAF", prefix: "237" },
  // Centrafrique
  ATP_ORANGE_CF:    { operator: "Orange Money",       country_code: "CF", currency: "XAF", prefix: "236" },
  // Congo Brazzaville
  ATP_AIRTEL_CG:    { operator: "Airtel Money",       country_code: "CG", currency: "XAF", prefix: "242" },
  ATP_MTN_CG:       { operator: "MTN Mobile Money",  country_code: "CG", currency: "XAF", prefix: "242" },
  // Côte d'Ivoire
  ATP_MOOV_CI:      { operator: "Moov Money",        country_code: "CI", currency: "XOF", prefix: "225" },
  ATP_MTN_CI:       { operator: "MTN Mobile Money",  country_code: "CI", currency: "XOF", prefix: "225" },
  ATP_ORANGE_CI:    { operator: "Orange Money",       country_code: "CI", currency: "XOF", prefix: "225" },
  ATP_WAVE_CI:      { operator: "Wave",              country_code: "CI", currency: "XOF", prefix: "225" },
  // Gabon
  ATP_AIRTEL_GA:    { operator: "Airtel Money",       country_code: "GA", currency: "XAF", prefix: "241" },
  ATP_MOOV_GA:      { operator: "Moov Money",        country_code: "GA", currency: "XAF", prefix: "241" },
  // Guinée Conakry
  ATP_MTN_GN:       { operator: "MTN Mobile Money",  country_code: "GN", currency: "GNF", prefix: "224" },
  ATP_ORANGE_GN:    { operator: "Orange Money",       country_code: "GN", currency: "GNF", prefix: "224" },
  // Guinée équatoriale
  ATP_ORANGE_GQ:    { operator: "Orange Money",       country_code: "GQ", currency: "XAF", prefix: "240" },
  // Guinée-Bissau
  ATP_ORANGE_GW:    { operator: "Orange Money",       country_code: "GW", currency: "XOF", prefix: "245" },
  // Mali
  ATP_MOOV_ML:      { operator: "Moov Money",        country_code: "ML", currency: "XOF", prefix: "223" },
  ATP_ORANGE_ML:    { operator: "Orange Money",       country_code: "ML", currency: "XOF", prefix: "223" },
  // Niger
  ATP_AIRTEL_NE:    { operator: "Airtel Money",       country_code: "NE", currency: "XOF", prefix: "227" },
  // RD Congo
  ATP_AFRIMONEY_CD: { operator: "Afrimoney",         country_code: "CD", currency: "CDF", prefix: "243" },
  ATP_AIRTEL_CD:    { operator: "Airtel Money",       country_code: "CD", currency: "CDF", prefix: "243" },
  ATP_ORANGE_CD:    { operator: "Orange Money",       country_code: "CD", currency: "CDF", prefix: "243" },
  ATP_VODACOM_CD:   { operator: "Vodacom M-Pesa",    country_code: "CD", currency: "CDF", prefix: "243" },
  // Sénégal
  ATP_FREE_SN:      { operator: "Free Money",         country_code: "SN", currency: "XOF", prefix: "221" },
  ATP_ORANGE_SN:    { operator: "Orange Money",       country_code: "SN", currency: "XOF", prefix: "221" },
  ATP_WAVE_SN:      { operator: "Wave",              country_code: "SN", currency: "XOF", prefix: "221" },
  // Tchad
  ATP_AIRTEL_TD:    { operator: "Airtel Money",       country_code: "TD", currency: "XAF", prefix: "235" },
  ATP_MOOV_TD:      { operator: "Moov Money",        country_code: "TD", currency: "XAF", prefix: "235" },
  // Togo
  ATP_FLOOZ_TG:     { operator: "Flooz (Moov)",       country_code: "TG", currency: "XOF", prefix: "228" },
  ATP_TMONEY_TG:    { operator: "T-Money",           country_code: "TG", currency: "XOF", prefix: "228" },
};

function buildPhone(phone: string, prefix: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00" + prefix)) return digits.slice(2);
  if (digits.startsWith(prefix) && digits.length > 8) return digits;
  return prefix + digits;
}

function generateReference(userId: string | number): string {
  return `ZNUM${Date.now()}U${userId}`;
}

async function atpCollect(
  params: Record<string, unknown>,
  apiKey: string,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const res = await fetch(`${ATP_BASE}/v1/collect`, {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

// ─── POST /v1/payments/ashtechpay/initiate ────────────────────────────────────
router.post("/v1/payments/ashtechpay/initiate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { amount, userId, phone, operatorId } = req.body ?? {};

    if (!amount || !userId || !phone || !operatorId) {
      res.status(400).json({ error: "Champs requis manquants : amount, userId, phone, operatorId" });
      return;
    }

    const opInfo = ATP_OPERATORS[operatorId as string];
    if (!opInfo) {
      res.status(400).json({ error: `Opérateur inconnu : ${operatorId}` });
      return;
    }

    const apiKey = process.env.ASHTECHPAY_API_KEY ?? "";
    if (!apiKey) {
      res.status(503).json({ error: "AshTechPay non configuré. Clé API manquante." });
      return;
    }

    const uid       = parseInt(String(userId), 10);
    const reference = generateReference(uid);
    const rawAmount = Math.round(Number(amount));
    const phoneFmt  = buildPhone(String(phone), opInfo.prefix);
    const baseUrl   = process.env.API_BASE_URL ?? "https://zynum.net";

    const collectParams: Record<string, unknown> = {
      amount:       rawAmount,
      currency:     opInfo.currency,
      phone:        phoneFmt,
      operator:     opInfo.operator,
      country_code: opInfo.country_code,
      reference,
      notify_url:   `${baseUrl}/api/v1/webhooks/ashtechpay`,
    };

    const rate     = CURRENCY_TO_USD[opInfo.currency] ?? CURRENCY_TO_USD.XOF;
    const usdEst   = rawAmount * rate;
    const fcfaEst  = opInfo.currency === "XOF" ? rawAmount : Math.round(usdEst * FCFA_PER_USD);

    if (!isNaN(uid) && uid > 0) {
      try {
        await db.insert(transactionsTable).values({
          userId:     uid,
          type:       "recharge",
          amountUsd:  usdEst,
          amountFcfa: fcfaEst,
          method:     "ashtechpay",
          provider:   "ashtechpay",
          status:     "pending",
          reference,
          metadata:   JSON.stringify({ operatorId, phone: phoneFmt, currency: opInfo.currency, collectParams }),
        });
      } catch (dbErr) {
        console.warn("[AshTechPay initiate] DB pre-insert error:", dbErr);
      }
    }

    console.log("[AshTechPay initiate] collect params:", { ...collectParams, notify_url: "***" });

    const { status, data } = await atpCollect(collectParams, apiKey);
    console.log("[AshTechPay initiate] response:", status, JSON.stringify(data).slice(0, 400));

    if (status === 202) {
      const atpTxId = String(data.transaction_id ?? "");
      if (atpTxId) {
        const meta = { operatorId, phone: phoneFmt, currency: opInfo.currency, atpTransactionId: atpTxId, collectParams };
        await db.update(transactionsTable)
          .set({ metadata: JSON.stringify(meta) })
          .where(eq(transactionsTable.reference, reference))
          .catch(() => {});
      }

      const isWave = String(data.flow ?? "") === "wave";
      res.status(202).json({
        status:      "pending",
        transactionId: atpTxId,
        reference,
        waveUrl:     isWave ? String(data.wave_url ?? "") : null,
        flow:        isWave ? "wave" : "push",
      });
      return;
    }

    if (status === 400 && String(data.error ?? "") === "otp_required") {
      const ussdCode = data.ussd_code ? String(data.ussd_code) : null;
      res.json({
        needsOtp: true,
        otpType:  ussdCode ? "ussd" : "sms",
        ussdCode,
        reference,
        message:  String(data.message ?? "OTP requis pour cet opérateur."),
      });
      return;
    }

    res.status(400).json({ ...data, reference, error: data.error ?? "payment_error" });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    console.error("[AshTechPay initiate] Error:", message);
    res.status(500).json({ error: "initiate_error", message });
  }
});

// ─── POST /v1/payments/ashtechpay/confirm-otp ────────────────────────────────
router.post("/v1/payments/ashtechpay/confirm-otp", async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference, otp, userId } = req.body ?? {};

    if (!reference || !otp || !userId) {
      res.status(400).json({ error: "Champs requis manquants : reference, otp, userId" });
      return;
    }

    const apiKey = process.env.ASHTECHPAY_API_KEY ?? "";
    if (!apiKey) {
      res.status(503).json({ error: "AshTechPay non configuré." });
      return;
    }

    const [existing] = await db
      .select({ metadata: transactionsTable.metadata })
      .from(transactionsTable)
      .where(eq(transactionsTable.reference, String(reference)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Transaction introuvable" });
      return;
    }

    let collectParams: Record<string, unknown> = {};
    try {
      const meta = JSON.parse(String(existing.metadata ?? "{}"));
      collectParams = (meta.collectParams as Record<string, unknown>) ?? {};
    } catch {
      res.status(500).json({ error: "Erreur de lecture des paramètres de transaction" });
      return;
    }

    const paramsWithOtp = { ...collectParams, otp: String(otp).trim() };
    console.log("[AshTechPay confirm-otp] re-submitting with OTP for reference:", reference);

    const { status, data } = await atpCollect(paramsWithOtp, apiKey);
    console.log("[AshTechPay confirm-otp] response:", status, JSON.stringify(data).slice(0, 400));

    if (status === 202) {
      const atpTxId = String(data.transaction_id ?? "");
      if (atpTxId) {
        try {
          const meta = JSON.parse(String(existing.metadata ?? "{}"));
          await db.update(transactionsTable)
            .set({ metadata: JSON.stringify({ ...meta, atpTransactionId: atpTxId }) })
            .where(eq(transactionsTable.reference, String(reference)));
        } catch { /* non-fatal */ }
      }
      res.json({ status: "pending", transactionId: atpTxId, reference });
      return;
    }

    if (status === 400 && String(data.error ?? "") === "otp_required") {
      res.status(400).json({
        error:    "otp_required",
        message:  String(data.message ?? "Code OTP invalide ou expiré."),
        ussdCode: data.ussd_code ?? null,
      });
      return;
    }

    res.status(400).json({
      error:   data.error ?? "payment_error",
      message: String(data.message ?? "Paiement refusé."),
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    console.error("[AshTechPay confirm-otp] Error:", message);
    res.status(500).json({ error: "confirm_otp_error", message });
  }
});

// ─── POST /v1/payments/ashtechpay/confirm — poll status ──────────────────────
router.post("/v1/payments/ashtechpay/confirm", async (req: Request, res: Response): Promise<void> => {
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

    const [existing] = await db
      .select({ id: transactionsTable.id, status: transactionsTable.status, metadata: transactionsTable.metadata })
      .from(transactionsTable)
      .where(eq(transactionsTable.reference, String(reference)))
      .limit(1);

    if (existing?.status === "completed") {
      res.json({ credited: true, action: "already_credited" });
      return;
    }

    const apiKey = process.env.ASHTECHPAY_API_KEY ?? "";
    if (!apiKey) {
      res.status(503).json({ error: "AshTechPay non configuré" });
      return;
    }

    let atpTransactionId = "";
    try {
      const meta = JSON.parse(String(existing?.metadata ?? "{}"));
      atpTransactionId = String(meta.atpTransactionId ?? "");
    } catch { /* */ }

    if (!atpTransactionId) {
      res.json({ credited: false, message: "Transaction en attente" });
      return;
    }

    const statusRes = await fetch(`${ATP_BASE}/v1/transaction/${atpTransactionId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await statusRes.json() as Record<string, unknown>;
    console.log("[AshTechPay confirm] status:", JSON.stringify(data).slice(0, 300));

    const txStatus = String(data.status ?? "").toLowerCase();

    if (txStatus === "failed") {
      res.json({ credited: false, failed: true, message: "Transaction échouée ou annulée." });
      return;
    }

    if (txStatus !== "success") {
      res.json({ credited: false, message: "En attente de confirmation" });
      return;
    }

    const rawAmount  = Number(data.credited_amount ?? data.amount ?? 0);
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
        method:     "ashtechpay",
        provider:   "ashtechpay",
        status:     "completed",
        reference:  String(reference),
        metadata:   JSON.stringify({ source: "manual_confirm", atpTransactionId }),
      });
    }

    console.log(`[AshTechPay confirm] Crédité $${amountUsd.toFixed(4)} → user #${uid}`);
    res.json({ credited: true, action: "credited", amountUsd });

    db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, uid)).limit(1).then(([u]) => {
      notifyDeposit({
        userId:    uid,
        userName:  u?.name ?? `User#${uid}`,
        amountFcfa,
        amountUsd,
        reference: String(reference),
        method:    "AshTechPay",
        phone:     String(data.phone ?? ""),
        operator:  String(data.operator ?? ""),
      }).catch(() => {});
    }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    console.error("[AshTechPay confirm] Error:", message);
    res.status(500).json({ error: "confirm_error", message });
  }
});

// ─── POST /v1/webhooks/ashtechpay ─────────────────────────────────────────────
router.post("/v1/webhooks/ashtechpay", async (req: Request, res: Response): Promise<void> => {
  const body = req.body ?? {};
  console.log("[AshTechPay webhook] Received:", JSON.stringify(body));

  res.status(200).json({ received: true });

  try {
    const event = String(body.event ?? "");
    const reference = String(body.reference ?? "");
    const atpTxId   = String(body.transaction_id ?? "");

    if (!reference) {
      console.error("[AshTechPay webhook] Missing reference");
      return;
    }

    // ── Paiement échoué ────────────────────────────────────────────────────────
    if (event === "payment.failed") {
      console.log("[AshTechPay webhook] payment.failed for reference:", reference);
      await db.update(transactionsTable)
        .set({ status: "failed" })
        .where(eq(transactionsTable.reference, reference))
        .catch(() => {});
      return;
    }

    // ── Payout events (retrait sortant) ────────────────────────────────────────
    if (event === "payout.completed" || event === "payout.failed") {
      console.log(`[AshTechPay webhook] ${event} — ignoré (payout)`);
      return;
    }

    if (event !== "payment.completed") {
      console.log("[AshTechPay webhook] Ignoring event:", event);
      return;
    }

    const [existing] = await db
      .select({ id: transactionsTable.id, status: transactionsTable.status, userId: transactionsTable.userId })
      .from(transactionsTable)
      .where(eq(transactionsTable.reference, reference))
      .limit(1);

    if (existing?.status === "completed") {
      console.log("[AshTechPay webhook] Duplicate, ignoring reference:", reference);
      return;
    }

    // amount = montant net crédité (après frais), total_amount = montant brut
    const rawAmount  = Number(body.amount ?? 0);
    const currency   = String(body.currency ?? "XOF").toUpperCase();
    const rate       = CURRENCY_TO_USD[currency] ?? CURRENCY_TO_USD.XOF;
    const amountUsd  = rawAmount * rate;
    const amountFcfa = currency === "XOF" ? rawAmount : Math.round(amountUsd * FCFA_PER_USD);

    let userId: number | null = existing?.userId ?? null;
    if (!userId) {
      const match = reference.match(/U(\d+)$/);
      if (match) userId = parseInt(match[1], 10);
    }

    if (!userId || isNaN(userId)) {
      console.error("[AshTechPay webhook] Cannot resolve userId from reference:", reference);
      return;
    }

    const [user] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.id, userId)).limit(1);
    if (!user) {
      console.error("[AshTechPay webhook] User not found:", userId);
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
        method:     "ashtechpay",
        provider:   "ashtechpay",
        status:     "completed",
        reference,
        metadata:   JSON.stringify({ webhookPayload: body, atpTransactionId: atpTxId }),
      });
    }

    console.log(`[AshTechPay webhook] Crédité $${amountUsd.toFixed(4)} → user #${userId}`);

    db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId)).limit(1).then(([u]) => {
      notifyDeposit({
        userId,
        userName:  u?.name ?? `User#${userId}`,
        amountFcfa,
        amountUsd,
        reference,
        method:    "AshTechPay",
        phone:     String(body.phone ?? ""),
        operator:  String(body.operator ?? ""),
      }).catch(() => {});
    }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur webhook";
    console.error("[AshTechPay webhook] Error:", message);
  }
});

// ─── Admin: synchroniser les opérateurs depuis AshTechPay /v1/countries ──────
const COUNTRY_META: Record<string, { flag: string; prefix: string; currencySymbol: string; countryCode: string }> = {
  BJ:  { flag:"🇧🇯", prefix:"229", currencySymbol:"FCFA", countryCode:"BJ"  },
  BF:  { flag:"🇧🇫", prefix:"226", currencySymbol:"FCFA", countryCode:"BF"  },
  CM:  { flag:"🇨🇲", prefix:"237", currencySymbol:"FCFA", countryCode:"CM"  },
  CF:  { flag:"🇨🇫", prefix:"236", currencySymbol:"FCFA", countryCode:"CF"  },
  CG:  { flag:"🇨🇬", prefix:"242", currencySymbol:"FCFA", countryCode:"CG"  },
  CI:  { flag:"🇨🇮", prefix:"225", currencySymbol:"FCFA", countryCode:"CI"  },
  GA:  { flag:"🇬🇦", prefix:"241", currencySymbol:"FCFA", countryCode:"GA"  },
  GN:  { flag:"🇬🇳", prefix:"224", currencySymbol:"GNF",  countryCode:"GN"  },
  GQ:  { flag:"🇬🇶", prefix:"240", currencySymbol:"FCFA", countryCode:"GQ"  },
  GW:  { flag:"🇬🇼", prefix:"245", currencySymbol:"FCFA", countryCode:"GW"  },
  ML:  { flag:"🇲🇱", prefix:"223", currencySymbol:"FCFA", countryCode:"ML"  },
  NE:  { flag:"🇳🇪", prefix:"227", currencySymbol:"FCFA", countryCode:"NE"  },
  CD:  { flag:"🇨🇩", prefix:"243", currencySymbol:"FC",   countryCode:"COD" },
  SN:  { flag:"🇸🇳", prefix:"221", currencySymbol:"FCFA", countryCode:"SN"  },
  TD:  { flag:"🇹🇩", prefix:"235", currencySymbol:"FCFA", countryCode:"TD"  },
  TG:  { flag:"🇹🇬", prefix:"228", currencySymbol:"FCFA", countryCode:"TG"  },
};

function operatorSlug(name: string): string {
  return name.toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

router.post("/v1/admin/ashtechpay/sync-countries", requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = process.env.ASHTECHPAY_API_KEY ?? "";
    if (!apiKey) {
      res.status(503).json({ error: "Clé API AshTechPay manquante" });
      return;
    }

    const r = await fetch(`${ATP_BASE}/v1/countries`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!r.ok) {
      res.status(502).json({ error: `AshTechPay /v1/countries returned ${r.status}` });
      return;
    }

    const countries = await r.json() as Array<{ code: string; name: string; currency: string; operators: string[] }>;

    let inserted = 0;
    let skipped  = 0;

    for (const country of countries) {
      const meta = COUNTRY_META[country.code];
      for (const opName of country.operators) {
        const slug     = operatorSlug(opName);
        const key      = `ATP_${slug}_${country.code}`;
        const needsReturnUrl = opName === "Wave";
        const row = {
          countryCode:    meta?.countryCode ?? country.code,
          countryName:    country.name,
          flag:           meta?.flag ?? "🌍",
          prefix:         meta?.prefix ?? "",
          currency:       country.currency,
          currencySymbol: meta?.currencySymbol ?? country.currency,
          operatorName:   opName,
          operatorKey:    key,
          aggregator:     "ashtechpay",
          isActive:       true,
          needsOtp:       false,
          needsReturnUrl,
          otpHint:        null as string | null,
          validationHint: null as string | null,
        };

        try {
          await db.insert(operatorRoutesTable).values(row).onConflictDoUpdate({
            target: operatorRoutesTable.operatorKey,
            set:    { operatorName: opName, isActive: true, needsReturnUrl },
          });
          inserted++;
        } catch {
          skipped++;
        }
      }
    }

    res.json({ success: true, countries: countries.length, inserted, skipped });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

// ─── Admin: frais en temps réel depuis AshTechPay /v1/fees ────────────────────
router.get("/v1/admin/ashtechpay/fees", requireAuth, requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const apiKey = process.env.ASHTECHPAY_API_KEY ?? "";
    if (!apiKey) {
      res.status(503).json({ error: "Clé API AshTechPay manquante" });
      return;
    }
    const r = await fetch(`${ATP_BASE}/v1/fees`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!r.ok) {
      res.status(502).json({ error: `AshTechPay /v1/fees returned ${r.status}` });
      return;
    }
    const data = await r.json();
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

export default router;
