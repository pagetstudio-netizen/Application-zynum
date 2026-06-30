import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { hashPassword, verifyPassword, createSession, deleteSession, getUserById, generateApiKey } from "../lib/auth.js";
import { requireAuth, type AuthRequest } from "../middlewares/authMiddleware.js";
import { createEmailCode, verifyEmailCode, verifyEmailToken } from "../lib/emailCodes.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendLoginVerificationEmail,
} from "../lib/email.js";

const router: IRouter = Router();

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "ZYN";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ─── REGISTER ────────────────────────────────────────────────────────────────

router.post("/v1/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { name, email, password, confirmPassword } = parsed.data;
  const refCode = typeof req.body.referralCode === "string" ? req.body.referralCode.trim().toUpperCase() : null;

  if (password !== confirmPassword) {
    res.status(400).json({ error: "Validation error", message: "Les mots de passe ne correspondent pas" });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (existing && existing.emailVerified) {
    res.status(409).json({ error: "Conflict", message: "Un compte avec cet email existe déjà" });
    return;
  }

  // Resolve referrer
  let referrerId: number | null = null;
  if (refCode) {
    const [referrer] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.referralCode, refCode)).limit(1);
    if (referrer) referrerId = referrer.id;
  }

  // Generate a unique referral code for the new user
  let newReferralCode = generateReferralCode();
  while (true) {
    const [clash] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.referralCode, newReferralCode)).limit(1);
    if (!clash) break;
    newReferralCode = generateReferralCode();
  }

  let user = existing;
  if (!user) {
    const passwordHash = hashPassword(password);
    const apiKey = generateApiKey();
    [user] = await db.insert(usersTable).values({
      name, email, passwordHash, apiKey, emailVerified: false,
      referralCode: newReferralCode,
      referredBy: referrerId ?? undefined,
    }).returning();
  } else {
    const passwordHash = hashPassword(password);
    const updateSet: Record<string, unknown> = { name, passwordHash, emailVerified: false };
    if (!existing.referralCode) updateSet.referralCode = newReferralCode;
    if (!existing.referredBy && referrerId) updateSet.referredBy = referrerId;
    [user] = await db
      .update(usersTable)
      .set(updateSet as any)
      .where(eq(usersTable.id, existing.id))
      .returning();
  }

  const { code } = await createEmailCode({ email, userId: user.id, type: "verify_email", expiresInMinutes: 15 });
  try {
    await sendVerificationEmail({ to: email, name, code });
  } catch (err) {
    console.error("Verification email error:", err);
  }

  res.status(201).json({ needsVerification: true, email });
});

// ─── VERIFY EMAIL (code) ─────────────────────────────────────────────────────

router.post("/v1/auth/verify-email", async (req, res): Promise<void> => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: "Validation error", message: "Email et code requis" });
    return;
  }

  const { valid } = await verifyEmailCode({ email, code, type: "verify_email" });
  if (!valid) {
    res.status(400).json({ error: "Invalid code", message: "Code invalide ou expiré" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ emailVerified: true, lastLoginAt: new Date() })
    .where(eq(usersTable.email, email))
    .returning();

  if (!user) {
    res.status(404).json({ error: "Not found", message: "Utilisateur introuvable" });
    return;
  }

  try {
    await sendWelcomeEmail({ to: email, name: user.name });
  } catch (err) {
    console.error("Welcome email error:", err);
  }

  const token = await createSession(user.id);

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, createdAt: user.createdAt },
  });
});

// ─── VERIFY EMAIL (link) ─────────────────────────────────────────────────────

router.get("/v1/auth/verify-email-link", async (req, res): Promise<void> => {
  const { token } = req.query as { token?: string };
  if (!token) {
    res.redirect("https://zynum.net/login?error=missing_token");
    return;
  }

  const { valid, record } = await verifyEmailToken({ token, type: "verify_email" });
  if (!valid || !record) {
    res.redirect("https://zynum.net/login?error=invalid_token");
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ emailVerified: true, lastLoginAt: new Date() })
    .where(eq(usersTable.email, record.email))
    .returning();

  if (!user) {
    res.redirect("https://zynum.net/login?error=user_not_found");
    return;
  }

  try {
    await sendWelcomeEmail({ to: user.email, name: user.name });
  } catch (err) {
    console.error("Welcome email error:", err);
  }

  const sessionToken = await createSession(user.id);
  res.redirect(`https://zynum.net/dashboard?auth_token=${sessionToken}`);
});

// ─── RESEND VERIFICATION ─────────────────────────────────────────────────────

router.post("/v1/auth/resend-verification", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Validation error", message: "Email requis" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user || user.emailVerified) {
    res.json({ success: true });
    return;
  }

  const { code, token } = await createEmailCode({ email, userId: user.id, type: "verify_email", expiresInMinutes: 15 });

  try {
    await sendVerificationEmail({ to: email, name: user.name, code, token });
  } catch (err) {
    console.error("Resend verification error:", err);
  }

  res.json({ success: true });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────

router.post("/v1/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Email ou mot de passe incorrect" });
    return;
  }

  const valid = verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Email ou mot de passe incorrect" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: "Forbidden", message: "Votre compte a été suspendu. Contactez le support." });
    return;
  }

  const now = new Date();
  const needsLoginVerification = !user.lastLoginAt || (now.getTime() - user.lastLoginAt.getTime() > THREE_DAYS_MS);

  if (needsLoginVerification) {
    const { code } = await createEmailCode({ email, userId: user.id, type: "login_2fa", expiresInMinutes: 10 });
    try {
      await sendLoginVerificationEmail({ to: email, name: user.name, code });
    } catch (err) {
      console.error("2FA email error:", err);
    }
    res.json({ requires2FA: true, email });
    return;
  }

  await db.update(usersTable).set({ lastLoginAt: now }).where(eq(usersTable.id, user.id));

  const token = await createSession(user.id);
  res.json({
    user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, isBanned: user.isBanned, createdAt: user.createdAt },
    token,
  });
});

// ─── VERIFY LOGIN 2FA ────────────────────────────────────────────────────────

router.post("/v1/auth/verify-login", async (req, res): Promise<void> => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: "Validation error", message: "Email et code requis" });
    return;
  }

  const { valid } = await verifyEmailCode({ email, code, type: "login_2fa" });
  if (!valid) {
    res.status(400).json({ error: "Invalid code", message: "Code invalide ou expiré" });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(usersTable.email, email))
    .returning();

  if (!user) {
    res.status(404).json({ error: "Not found", message: "Utilisateur introuvable" });
    return;
  }

  const token = await createSession(user.id);

  res.json({
    user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, isBanned: user.isBanned, createdAt: user.createdAt },
    token,
  });
});

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────

router.post("/v1/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Validation error", message: "Email requis" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  res.json({ success: true });

  if (!user) return;

  const { code, token } = await createEmailCode({ email, userId: user.id, type: "reset_password", expiresInMinutes: 15 });
  try {
    await sendPasswordResetEmail({ to: email, name: user.name, code, token });
  } catch (err) {
    console.error("Password reset email error:", err);
  }
});

// ─── RESET PASSWORD (link) ───────────────────────────────────────────────────

router.get("/v1/auth/reset-password-link", async (req, res): Promise<void> => {
  const { token } = req.query as { token?: string };
  if (!token) {
    res.redirect("https://zynum.net/forgot-password?error=missing_token");
    return;
  }

  const { valid, record } = await verifyEmailToken({ token, type: "reset_password" });
  if (!valid || !record) {
    res.redirect("https://zynum.net/forgot-password?error=invalid_token");
    return;
  }

  res.redirect(`https://zynum.net/reset-password?email=${encodeURIComponent(record.email)}&verified=1`);
});

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────

router.post("/v1/auth/reset-password", async (req, res): Promise<void> => {
  const { email, code, newPassword } = req.body;
  if (!email || !newPassword) {
    res.status(400).json({ error: "Validation error", message: "Email et nouveau mot de passe requis" });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: "Validation error", message: "Le mot de passe doit contenir au moins 8 caractères" });
    return;
  }

  if (code) {
    const { valid } = await verifyEmailCode({ email, code, type: "reset_password" });
    if (!valid) {
      res.status(400).json({ error: "Invalid code", message: "Code invalide ou expiré" });
      return;
    }
  }

  const passwordHash = hashPassword(newPassword);
  const [user] = await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.email, email))
    .returning();

  if (!user) {
    res.status(404).json({ error: "Not found", message: "Utilisateur introuvable" });
    return;
  }

  res.json({ success: true, message: "Mot de passe réinitialisé avec succès" });
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

router.post("/v1/auth/logout", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const token = req.headers.authorization?.replace("Bearer ", "") ?? "";
  await deleteSession(token);
  res.json({ success: true, message: "Déconnecté avec succès" });
});

// ─── ME ───────────────────────────────────────────────────────────────────────

router.get("/v1/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const user = await getUserById(req.userId!);
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Utilisateur introuvable" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
  });
});

// ─── CHANGE PASSWORD ─────────────────────────────────────────────────────────

router.post("/v1/auth/change-password", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Validation error", message: "Mot de passe actuel et nouveau mot de passe requis" });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: "Validation error", message: "Le nouveau mot de passe doit contenir au moins 8 caractères" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Utilisateur introuvable" });
    return;
  }

  const valid = verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Mot de passe actuel incorrect" });
    return;
  }

  const newHash = hashPassword(newPassword);
  await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, req.userId!));

  res.json({ success: true, message: "Mot de passe modifié avec succès" });
});

export default router;
