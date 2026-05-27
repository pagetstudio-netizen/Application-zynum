import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { notifyDeposit } from "../lib/telegram.js";

const router: IRouter = Router();

const FCFA_PER_USD   = 620;
const PAXITY_TX_BASE = "https://transaction.paxity.io/api/v1";

/**
 * Real Paxity payment method IDs per operator.
 * Sourced from GET /payment-method/country/{code} responses.
 */
interface PaxityMethodInfo {
  id: string;
  prefix: string;
  country: string;
  currency: string;
}

const PAXITY_METHODS: Record<string, PaxityMethodInfo> = {
  // Bénin
  MOOVBJ:   { id: "MOOVBJ",   prefix: "229", country: "BJ", currency: "XOF" },
  MTNBJ:    { id: "MTNBJ",    prefix: "229", country: "BJ", currency: "XOF" },
  // Burkina Faso
  MOOVBF:   { id: "MOOVBF",   prefix: "226", country: "BF", currency: "XOF" },
  OMBF:     { id: "OMBF",     prefix: "226", country: "BF", currency: "XOF" },
  // Cameroun
  MTNCM:    { id: "MTNCM",    prefix: "237", country: "CM", currency: "XAF" },
  OMCM:     { id: "OMCM",     prefix: "237", country: "CM", currency: "XAF" },
  // Côte d'Ivoire
  MTNCI:    { id: "MTNCI",    prefix: "225", country: "CI", currency: "XOF" },
  WAVECI:   { id: "WAVECI",   prefix: "225", country: "CI", currency: "XOF" },
  OMCI:     { id: "OMCI",     prefix: "225", country: "CI", currency: "XOF" },
  // Ghana
  ATGH:     { id: "ATGH",     prefix: "233", country: "GH", currency: "GHS" },
  MTNGH:    { id: "MTNGH",    prefix: "233", country: "GH", currency: "GHS" },
  TLGH:     { id: "TLGH",     prefix: "233", country: "GH", currency: "GHS" },
  // Guinée
  MTNGN:    { id: "MTNGN",    prefix: "224", country: "GN", currency: "GNF" },
  OMGN:     { id: "OMGN",     prefix: "224", country: "GN", currency: "GNF" },
  // Kenya
  MPESAKE:  { id: "MPESAKE",  prefix: "254", country: "KE", currency: "KES" },
  // Mali
  MOOVML:   { id: "MOOVML",   prefix: "223", country: "ML", currency: "XOF" },
  OMML:     { id: "OMML",     prefix: "223", country: "ML", currency: "XOF" },
  // Nigeria
  MTNNG:    { id: "MTNNG",    prefix: "234", country: "NG", currency: "NGN" },
  OPNG:     { id: "OPNG",     prefix: "234", country: "NG", currency: "NGN" },
  // Sénégal
  OMSN:     { id: "OMSN",     prefix: "221", country: "SN", currency: "XOF" },
  WAVESN:   { id: "WAVESN",   prefix: "221", country: "SN", currency: "XOF" },
  // Togo (two different prefixes per operator)
  MOOVTG:   { id: "MOOVTG",   prefix: "226", country: "TG", currency: "XOF" },
  TMONEYTG: { id: "TMONEYTG", prefix: "228", country: "TG", currency: "XOF" },
};

function paxityHeaders() {
  return {
    Authorization: `Bearer ${process.env.PAXITY_APP_TOKEN ?? ""}`,
    "Content-Type": "application/json",
    "x-api-key":   process.env.PAXITY_API_KEY   ?? process.env.VITE_PAXITY_API_KEY   ?? "",
    "X-API-TOKEN": process.env.PAXITY_API_TOKEN  ?? process.env.VITE_PAXITY_API_TOKEN ?? "",
  };
}

async function verifyPaxityTransaction(reference: string): Promise<{
  verified: boolean;
  status: string;
  amount?: number;
  currency?: string;
  idClient?: string;
}> {
  if (!reference || !process.env.PAXITY_APP_TOKEN)
    return { verified: false, status: "missing_token" };
  try {
    const res = await fetch(
      `${PAXITY_TX_BASE}/transaction/get-status/${reference}`,
      { headers: paxityHeaders() }
    );
    if (!res.ok) return { verified: false, status: `api_error_${res.status}` };
    const data  = (await res.json()) as Record<string, unknown>;
    const txData = (data.data ?? data) as Record<string, unknown>;
    const status = String(txData.status ?? data.status ?? "").toUpperCase();
    return {
      verified: ["SUCCESS", "COMPLETED", "PAID"].includes(status),
      status,
      amount:   Number(txData.amount  ?? data.amount  ?? 0),
      currency: String(txData.currency ?? data.currency ?? "XOF"),
      idClient: String(txData.idClient ?? data.idClient ?? ""),
    };
  } catch (err) {
    console.error("[Paxity verify]", err);
    return { verified: false, status: "fetch_error" };
  }
}

// POST /v1/payments/paxity/confirm  — manual confirm after "J'ai payé"
router.post("/v1/payments/paxity/confirm", async (req: Request, res: Response): Promise<void> => {
  try {
    const { reference, userId } = req.body ?? {};

    if (!reference || !userId) {
      res.status(400).json({ error: "Missing reference or userId" });
      return;
    }

    const uid = parseInt(String(userId), 10);
    if (isNaN(uid) || uid <= 0) {
      res.status(400).json({ error: "Invalid userId" });
      return;
    }

    // Check for duplicate (already credited)
    const [existing] = await db
      .select({ id: transactionsTable.id, status: transactionsTable.status })
      .from(transactionsTable)
      .where(eq(transactionsTable.reference, String(reference)))
      .limit(1);

    if (existing) {
      res.json({ credited: true, action: "already_credited" });
      return;
    }

    // Verify with Paxity
    const verified = await verifyPaxityTransaction(String(reference));
    console.log("[Paxity confirm] Verification result:", verified);

    if (!verified.verified) {
      res.json({ credited: false, status: verified.status, message: "Paiement non confirmé par Paxity" });
      return;
    }

    // Normalize currency to USD
    const XOF_TO_USD: Record<string, number> = {
      XOF: 1 / 620, XAF: 1 / 620, GHS: 1 / 15,
      GNF: 1 / 8700, KES: 1 / 130, NGN: 1 / 1550, USD: 1,
    };
    const currency   = (verified.currency ?? "XOF").toUpperCase();
    const amount     = verified.amount ?? 0;
    const rate       = XOF_TO_USD[currency] ?? (1 / 620);
    const amountUsd  = currency === "USD" ? amount : amount * rate;
    const amountFcfa = currency === "XOF" ? amount : Math.round(amountUsd * 620);

    const [user] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.id, uid)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await db.update(usersTable)
      .set({ balanceUsd: sql`${usersTable.balanceUsd} + ${amountUsd}` })
      .where(eq(usersTable.id, uid));

    await db.insert(transactionsTable).values({
      userId: uid,
      type: "recharge",
      amountUsd,
      amountFcfa,
      method: "paxity",
      provider: "paxity",
      status: "completed",
      reference: String(reference),
      metadata: JSON.stringify({ source: "manual_confirm" }),
    });

    console.log(`[Paxity confirm] Credited $${amountUsd.toFixed(4)} to user #${uid}`);
    res.json({ credited: true, action: "credited", amountUsd });

    // Fire-and-forget Telegram notification
    db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, uid)).limit(1).then(([u]) => {
      notifyDeposit({
        userId:    uid,
        userName:  u?.name ?? `User#${uid}`,
        amountFcfa,
        amountUsd,
        reference: String(reference),
        method:    "Paxity",
      }).catch(() => {});
    }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    console.error("[Paxity confirm] Error:", message);
    res.status(500).json({ error: "confirm_error", message });
  }
});

// GET /v1/payments/paxity/methods?country=SN
router.get("/v1/payments/paxity/methods", async (req: Request, res: Response): Promise<void> => {
  try {
    const country = String(req.query.country ?? "SN").toUpperCase();
    const paxityRes = await fetch(
      `${PAXITY_TX_BASE}/payment-method/country/${country}`,
      { headers: paxityHeaders() }
    );
    const data = (await paxityRes.json()) as Record<string, unknown>;
    res.status(paxityRes.ok ? 200 : paxityRes.status).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur";
    res.status(500).json({ error: message });
  }
});

// POST /v1/payments/paxity/initiate
router.post("/v1/payments/paxity/initiate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { method, amount, currency, userId, ipn, phone, operator,
            holderName, cardNumber, expMonth, expYear, cvv } = req.body ?? {};

    if (!method || !amount || !userId) {
      res.status(400).json({ error: "Missing required fields: method, amount, userId" });
      return;
    }

    const baseUrl   = process.env.API_BASE_URL ?? "https://zynum.net";
    const ipnUrl    = ipn || `${baseUrl}/api/v1/webhooks/paxity`;
    const rawAmount = Math.round(Number(amount));
    let paxityRes: globalThis.Response;

    if (method === "mobile") {
      if (!phone || !operator) {
        res.status(400).json({ error: "Missing phone or operator for mobile payment" });
        return;
      }

      const pmInfo = PAXITY_METHODS[operator as string];
      if (!pmInfo) {
        res.status(400).json({
          error: `Unsupported operator: ${operator}`,
          supported: Object.keys(PAXITY_METHODS),
        });
        return;
      }

      // Strip country prefix from phone number if present
      let phoneNumber = String(phone).replace(/\D/g, "");
      if (phoneNumber.startsWith("00" + pmInfo.prefix)) {
        phoneNumber = phoneNumber.slice(2 + pmInfo.prefix.length);
      } else if (phoneNumber.startsWith(pmInfo.prefix) && phoneNumber.length > 8) {
        phoneNumber = phoneNumber.slice(pmInfo.prefix.length);
      }

      const body = {
        paymentMethod: pmInfo.id,
        phoneNumber,
        prefixPhone:   pmInfo.prefix,
        amount:        rawAmount,
        country:       pmInfo.country,
        currency:      currency ?? pmInfo.currency,
        ipn:           ipnUrl,
        idClient:      String(userId),
      };

      console.log("[Paxity initiate/mobile] body:", body);
      paxityRes = await fetch(`${PAXITY_TX_BASE}/transaction/pay-in-mobile`, {
        method:  "POST",
        headers: paxityHeaders(),
        body:    JSON.stringify(body),
      });

    } else if (method === "card") {
      if (!cardNumber || !expMonth || !expYear || !cvv || !holderName) {
        res.status(400).json({ error: "Missing card details" });
        return;
      }
      paxityRes = await fetch(`${PAXITY_TX_BASE}/transaction/pay-in-card-bank`, {
        method:  "POST",
        headers: paxityHeaders(),
        body:    JSON.stringify({
          holderName,
          number:   String(cardNumber).replace(/\s/g, ""),
          expMonth: String(expMonth),
          expYear:  String(expYear),
          cvv,
          amount:   rawAmount,
          country:  "SN",
          currency: currency ?? "XOF",
          ipn:      ipnUrl,
          idClient: String(userId),
        }),
      });
    } else {
      res.status(400).json({ error: "Invalid method. Use 'mobile' or 'card'" });
      return;
    }

    const rawBody = await paxityRes.text();
    let data: unknown;
    try { data = JSON.parse(rawBody); } catch { data = { raw: rawBody }; }

    console.log(`[Paxity initiate/${method}] status=${paxityRes.status}`, JSON.stringify(data).slice(0, 300));
    res.status(paxityRes.ok ? 200 : paxityRes.status).json(data);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    console.error("[Paxity initiate] Error:", message);
    res.status(500).json({ error: "initiate_error", message });
  }
});

// POST /v1/webhooks/paxity  (IPN / payment notification)
router.post("/v1/webhooks/paxity", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body ?? {};
    console.log("[Paxity IPN] Received:", JSON.stringify(body));

    const rawStatus:   string = (body.status ?? body.paymentStatus ?? "").toUpperCase();
    const idClientRaw: string = String(body.idClient ?? body.clientId ?? body.merchantRef ?? "");
    const rawAmount:   number = Number(body.amount ?? body.transactionAmount ?? 0);
    const currency:    string = (body.currency ?? "XOF").toUpperCase();
    const reference:   string = String(body.reference ?? body.transactionId ?? body.transactionRef ?? "");

    if (!rawStatus && !reference) {
      res.status(400).json({ error: "Missing status and reference" });
      return;
    }

    let finalStatus   = rawStatus;
    let finalAmount   = rawAmount;
    let finalCurrency = currency;
    let finalIdClient = idClientRaw;

    if (reference) {
      const verified = await verifyPaxityTransaction(reference);
      console.log("[Paxity IPN] Verification:", verified);
      if (verified.status && !["missing_token", "fetch_error"].includes(verified.status)) {
        finalStatus   = verified.status;
        if (verified.amount)   finalAmount   = verified.amount;
        if (verified.currency) finalCurrency = verified.currency;
        if (verified.idClient) finalIdClient = verified.idClient || idClientRaw;
      }
    }

    if (!["SUCCESS", "COMPLETED", "PAID"].includes(finalStatus)) {
      res.json({ received: true, action: "ignored", status: finalStatus });
      return;
    }

    if (!finalIdClient) {
      res.status(400).json({ error: "Missing idClient" });
      return;
    }

    const userId = parseInt(finalIdClient, 10);
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: "Invalid idClient", idClient: finalIdClient });
      return;
    }

    // Normalize any currency to USD for balance
    const XOF_TO_USD: Record<string, number> = {
      XOF: 1 / 620,
      XAF: 1 / 620,
      GHS: 1 / 15,
      GNF: 1 / 8700,
      KES: 1 / 130,
      NGN: 1 / 1550,
      USD: 1,
    };
    const rate       = XOF_TO_USD[finalCurrency] ?? (1 / 620);
    const amountUsd  = finalCurrency === "USD" ? finalAmount : finalAmount * rate;
    const amountFcfa = finalCurrency === "XOF" ? finalAmount : Math.round(amountUsd * 620);

    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found", userId });
      return;
    }

    if (reference) {
      const [existing] = await db
        .select({ id: transactionsTable.id })
        .from(transactionsTable)
        .where(eq(transactionsTable.reference, reference))
        .limit(1);
      if (existing) {
        res.json({ received: true, action: "duplicate_ignored", reference });
        return;
      }
    }

    await db.update(usersTable)
      .set({ balanceUsd: sql`${usersTable.balanceUsd} + ${amountUsd}` })
      .where(eq(usersTable.id, userId));

    await db.insert(transactionsTable).values({
      userId,
      type:      "recharge",
      amountUsd,
      amountFcfa,
      method:    "paxity",
      provider:  "paxity",
      status:    "completed",
      reference: reference || null,
      metadata:  JSON.stringify({ ipnPayload: body }),
    });

    console.log(`[Paxity IPN] Credited $${amountUsd.toFixed(4)} to user #${userId}`);
    res.json({ received: true, action: "credited", amountUsd, userId });

    // Fire-and-forget Telegram notification
    db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId)).limit(1).then(([u]) => {
      notifyDeposit({
        userId,
        userName:  u?.name ?? `User#${userId}`,
        amountFcfa,
        amountUsd,
        reference: reference ?? `PAX-${Date.now()}`,
        method:    "Paxity",
      }).catch(() => {});
    }).catch(() => {});

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur webhook";
    console.error("[Paxity IPN] Error:", message);
    res.status(500).json({ error: "webhook_error", message });
  }
});

export default router;
