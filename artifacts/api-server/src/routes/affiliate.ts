import { Router, type IRouter } from "express";
import { db, usersTable, affiliateCommissionsTable, affiliateWithdrawalsTable } from "@workspace/db";
import { eq, sql, desc, count, sum } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware.js";
import { sendAffiliateWithdrawalEmail } from "../lib/email.js";
import { notifyAffiliateWithdrawal } from "../lib/telegram.js";

const router: IRouter = Router();

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "ZYN";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function ensureReferralCode(userId: number): Promise<string> {
  // Try to generate a unique code and save it
  let code = generateReferralCode();
  for (let attempt = 0; attempt < 10; attempt++) {
    const [clash] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.referralCode, code))
      .limit(1);
    if (!clash) break;
    code = generateReferralCode();
  }
  await db
    .update(usersTable)
    .set({ referralCode: code })
    .where(eq(usersTable.id, userId));
  return code;
}

// ─── GET /v1/affiliate/stats ──────────────────────────────────────────────────
router.get("/v1/affiliate/stats", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const [user] = await db
    .select({ referralCode: usersTable.referralCode, affiliateBalance: usersTable.affiliateBalance })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // Auto-generate referral code for existing users who don't have one yet
  let referralCode = user.referralCode;
  if (!referralCode) {
    referralCode = await ensureReferralCode(userId);
  }

  const [{ filleulCount }] = await db
    .select({ filleulCount: count() })
    .from(usersTable)
    .where(eq(usersTable.referredBy, userId));

  const [{ totalEarned }] = await db
    .select({ totalEarned: sum(affiliateCommissionsTable.amountUsd) })
    .from(affiliateCommissionsTable)
    .where(eq(affiliateCommissionsTable.userId, userId));

  const [{ pendingAmount }] = await db
    .select({ pendingAmount: sum(affiliateWithdrawalsTable.amountUsd) })
    .from(affiliateWithdrawalsTable)
    .where(sql`${affiliateWithdrawalsTable.userId} = ${userId} AND ${affiliateWithdrawalsTable.status} = 'pending'`);

  res.json({
    referralCode,
    affiliateBalance: user.affiliateBalance ?? 0,
    filleulCount: Number(filleulCount),
    totalEarned: Number(totalEarned ?? 0),
    pendingWithdrawal: Number(pendingAmount ?? 0),
  });
});

// ─── GET /v1/affiliate/referrals ──────────────────────────────────────────────
router.get("/v1/affiliate/referrals", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const referrals = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.referredBy, userId))
    .orderBy(desc(usersTable.createdAt));

  res.json({ referrals });
});

// ─── GET /v1/affiliate/withdrawals ────────────────────────────────────────────
router.get("/v1/affiliate/withdrawals", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;

  const withdrawals = await db
    .select()
    .from(affiliateWithdrawalsTable)
    .where(eq(affiliateWithdrawalsTable.userId, userId))
    .orderBy(desc(affiliateWithdrawalsTable.createdAt));

  res.json({ withdrawals });
});

// ─── POST /v1/affiliate/withdraw ──────────────────────────────────────────────
router.post("/v1/affiliate/withdraw", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const userId = req.userId!;
  const { amountUsd, phone, country } = req.body;

  if (!amountUsd || !phone || !country) {
    res.status(400).json({ error: "Validation error", message: "Montant, numéro de téléphone et pays requis" });
    return;
  }

  const amount = parseFloat(amountUsd);
  if (isNaN(amount) || amount <= 0) {
    res.status(400).json({ error: "Validation error", message: "Montant invalide" });
    return;
  }

  const [user] = await db
    .select({ affiliateBalance: usersTable.affiliateBalance, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user || (user.affiliateBalance ?? 0) < amount) {
    res.status(400).json({ error: "Insufficient balance", message: "Solde d'affiliation insuffisant" });
    return;
  }

  const [withdrawal] = await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ affiliateBalance: sql`${usersTable.affiliateBalance} - ${amount}` })
      .where(eq(usersTable.id, userId));

    return tx
      .insert(affiliateWithdrawalsTable)
      .values({ userId, amountUsd: amount, phone, country, status: "pending" })
      .returning();
  });

  res.json({ withdrawal, message: "Demande de retrait soumise. Traitement sous 48h." });

  // Fire-and-forget notifications to admin
  const notifOpts = {
    withdrawalId: withdrawal.id,
    userName: user.name,
    userEmail: user.email,
    amountUsd: amount,
    phone,
    country,
  };
  sendAffiliateWithdrawalEmail(notifOpts).catch(() => {});
  notifyAffiliateWithdrawal(notifOpts).catch(() => {});
});

export default router;
