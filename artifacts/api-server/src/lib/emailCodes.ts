import { db, emailCodesTable } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";
import { randomBytes } from "crypto";

export function generateCode(): string {
  const digits = "0123456789";
  let code = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += digits[bytes[i] % 10];
  }
  return code;
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createEmailCode(opts: {
  email: string;
  userId?: number;
  type: "verify_email" | "reset_password" | "login_2fa";
  expiresInMinutes: number;
}): Promise<{ code: string; token: string }> {
  await db.delete(emailCodesTable).where(
    and(
      eq(emailCodesTable.email, opts.email),
      eq(emailCodesTable.type, opts.type),
    )
  );

  const code = generateCode();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + opts.expiresInMinutes * 60 * 1000);

  await db.insert(emailCodesTable).values({
    email: opts.email,
    userId: opts.userId,
    code,
    token,
    type: opts.type,
    expiresAt,
  });

  return { code, token };
}

export async function verifyEmailCode(opts: {
  email: string;
  code?: string;
  token?: string;
  type: "verify_email" | "reset_password" | "login_2fa";
}): Promise<{ valid: boolean; record?: typeof emailCodesTable.$inferSelect }> {
  const conditions = [
    eq(emailCodesTable.email, opts.email),
    eq(emailCodesTable.type, opts.type),
  ];

  const rows = await db.select().from(emailCodesTable).where(and(...conditions));

  const now = new Date();
  const record = rows.find((r) => {
    if (r.usedAt) return false;
    if (r.expiresAt < now) return false;
    if (opts.code && r.code !== opts.code) return false;
    if (opts.token && r.token !== opts.token) return false;
    return true;
  });

  if (!record) return { valid: false };

  await db
    .update(emailCodesTable)
    .set({ usedAt: now })
    .where(eq(emailCodesTable.id, record.id));

  return { valid: true, record };
}

export async function verifyEmailToken(opts: {
  token: string;
  type: "verify_email" | "reset_password" | "login_2fa";
}): Promise<{ valid: boolean; record?: typeof emailCodesTable.$inferSelect }> {
  const [record] = await db
    .select()
    .from(emailCodesTable)
    .where(eq(emailCodesTable.token, opts.token))
    .limit(1);

  if (!record) return { valid: false };
  if (record.type !== opts.type) return { valid: false };
  if (record.usedAt) return { valid: false };
  if (record.expiresAt < new Date()) return { valid: false };

  await db
    .update(emailCodesTable)
    .set({ usedAt: new Date() })
    .where(eq(emailCodesTable.id, record.id));

  return { valid: true, record };
}
