import crypto from "crypto";
import { db, usersTable, sessionsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const inputHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(inputHash, "hex"));
}

export function generateToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function generateApiKey(): string {
  return `zyn_${crypto.randomBytes(32).toString("hex")}`;
}

export async function createSession(userId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(sessionsTable).values({ userId, token, expiresAt });
  return token;
}

export async function validateToken(token: string): Promise<number | null> {
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.token, token),
        gt(sessionsTable.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session) return null;
  return session.userId;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

export async function getUserById(id: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  return user ?? null;
}
