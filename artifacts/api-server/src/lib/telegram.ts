import { db, usersTable, ordersTable, transactionsTable, adminSettingsTable } from "@workspace/db";
import { eq, and, gte, sum, count, sql } from "drizzle-orm";

const TELEGRAM_API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN ?? ""}`;

function pad(n: number): string { return String(n).padStart(2, "0"); }
function fmtDate(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtNum(n: number): string { return n.toLocaleString("fr-FR"); }

// ─── Chat ID resolution ───────────────────────────────────────────────────────

export async function getChatId(): Promise<string | null> {
  try {
    const [row] = await db
      .select({ value: adminSettingsTable.value })
      .from(adminSettingsTable)
      .where(eq(adminSettingsTable.key, "telegram_chat_id"))
      .limit(1);
    if (row?.value) return row.value;
  } catch {}
  return process.env.TELEGRAM_CHAT_ID ?? null;
}

export async function saveChatId(chatId: string): Promise<void> {
  await db
    .insert(adminSettingsTable)
    .values({ key: "telegram_chat_id", value: chatId })
    .onConflictDoUpdate({ target: adminSettingsTable.key, set: { value: chatId } });
}

// ─── Core send ────────────────────────────────────────────────────────────────

export async function sendMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`${TELEGRAM_API()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const data = await res.json() as { ok: boolean; description?: string };
    if (!data.ok) console.error("[Telegram] sendMessage error:", data.description);
    return data.ok;
  } catch (err) {
    console.error("[Telegram] sendMessage fetch error:", err);
    return false;
  }
}

// ─── Bot updates / detect ─────────────────────────────────────────────────────

export async function detectGroupChats(): Promise<{ chatId: string | null; chats: { id: string; type: string; title: string }[] }> {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  if (!token) return { chatId: null, chats: [] };
  try {
    const res = await fetch(`${TELEGRAM_API()}/getUpdates?limit=50`);
    const data = await res.json() as { ok: boolean; result: any[] };
    if (!data.ok) return { chatId: null, chats: [] };
    const seen = new Set<string>();
    const chats: { id: string; type: string; title: string }[] = [];
    for (const u of data.result) {
      const c = u.message?.chat ?? u.channel_post?.chat;
      if (!c) continue;
      const id = String(c.id);
      if (seen.has(id)) continue;
      seen.add(id);
      const nameParts = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
      const title = c.title ?? (nameParts || c.username || id);
      chats.push({ id, type: c.type, title: String(title) });
    }
    return { chatId: chats[0]?.id ?? null, chats };
  } catch (err) {
    console.error("[Telegram] detectGroupChats error:", err);
    return { chatId: null, chats: [] };
  }
}

export async function getBotInfo(): Promise<{ ok: boolean; username?: string; firstName?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  if (!token) return { ok: false };
  try {
    const res = await fetch(`${TELEGRAM_API()}/getMe`);
    const data = await res.json() as { ok: boolean; result?: { username: string; first_name: string } };
    if (data.ok && data.result) return { ok: true, username: data.result.username, firstName: data.result.first_name };
    return { ok: false };
  } catch {
    return { ok: false };
  }
}

// ─── Notification helpers ─────────────────────────────────────────────────────

export async function notifyDeposit(opts: {
  userId: number;
  userName: string;
  amountFcfa: number;
  amountUsd: number;
  reference: string;
  method: string;
  operator?: string;
  phone?: string;
}): Promise<void> {
  const chatId = await getChatId();
  if (!chatId) return;
  const now = fmtDate(new Date());
  const lines = [
    `💰 <b>DÉPÔT REÇU</b>`,
    ``,
    `👤 Utilisateur: <b>${opts.userName}</b> (#${opts.userId})`,
    `💵 Montant: <b>${fmtNum(opts.amountFcfa)} XOF</b>`,
  ];
  if (opts.phone)    lines.push(`📱 Téléphone: ${opts.phone}`);
  if (opts.operator) lines.push(`🏦 Opérateur: ${opts.operator}`);
  lines.push(`🔖 Référence: <code>${opts.reference}</code>`);
  lines.push(`📅 Date: ${now}`);
  await sendMessage(chatId, lines.join("\n")).catch(() => {});
}

export async function notifyPurchase(opts: {
  userId: number;
  userName: string;
  orderId: string;
  serviceName: string;
  countryName: string;
  phone: string;
  priceFcfa: number;
  priceUsd: number;
}): Promise<void> {
  const chatId = await getChatId();
  if (!chatId) return;
  const now = fmtDate(new Date());
  const text = [
    `📲 <b>ACHAT DE NUMÉRO</b>`,
    ``,
    `👤 Utilisateur: <b>${opts.userName}</b> (#${opts.userId})`,
    `🌐 Service: <b>${opts.serviceName}</b>`,
    `🌍 Pays: ${opts.countryName}`,
    `📞 Numéro: <code>${opts.phone}</code>`,
    `💵 Prix: <b>${fmtNum(opts.priceFcfa)} FCFA</b> ($${opts.priceUsd.toFixed(2)})`,
    `🔖 Commande: #${opts.orderId}`,
    `📅 Date: ${now}`,
  ].join("\n");
  await sendMessage(chatId, text).catch(() => {});
}

export async function notifyAffiliateWithdrawal(opts: {
  withdrawalId: number;
  userName: string;
  userEmail: string;
  amountUsd: number;
  phone: string;
  country: string;
}): Promise<void> {
  const chatId = await getChatId();
  if (!chatId) return;
  const now = fmtDate(new Date());
  const text = [
    `💸 <b>RETRAIT AFFILIÉ — NOUVELLE DEMANDE</b>`,
    ``,
    `🔖 Référence: <b>#${opts.withdrawalId}</b>`,
    `👤 Utilisateur: <b>${opts.userName}</b>`,
    `📧 Email: ${opts.userEmail}`,
    `💵 Montant: <b>$${opts.amountUsd.toFixed(2)}</b>`,
    `📱 Numéro de réception: <code>${opts.phone}</code>`,
    `🌍 Pays: ${opts.country}`,
    `📅 Date: ${now}`,
    ``,
    `⚙️ Traitez cette demande dans le panneau admin → Affiliations`,
  ].join("\n");
  await sendMessage(chatId, text).catch(() => {});
}

export async function notifyContact(opts: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const chatId = await getChatId();
  if (!chatId) return;
  const now  = fmtDate(new Date());
  const preview = opts.message.length > 200 ? opts.message.slice(0, 200) + "…" : opts.message;
  const text = [
    `✉️ <b>NOUVEAU MESSAGE DE CONTACT</b>`,
    ``,
    `👤 Nom: <b>${opts.name}</b>`,
    `📧 Email: <code>${opts.email}</code>`,
    `📌 Sujet: <b>${opts.subject}</b>`,
    ``,
    `💬 Message:`,
    preview,
    ``,
    `📅 Date: ${now}`,
    ``,
    `⚙️ Consultez ce message dans le panneau admin → Contact`,
  ].join("\n");
  await sendMessage(chatId, text).catch(() => {});
}

// ─── Daily report ─────────────────────────────────────────────────────────────

export async function sendDailyReport(): Promise<void> {
  const chatId = await getChatId();
  if (!chatId) return;
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    const [usersRow] = await db.select({ total: count() }).from(usersTable);
    const usersCount = Number(usersRow?.total ?? 0);

    const [depRow] = await db
      .select({ totalFcfa: sum(transactionsTable.amountFcfa), totalCount: count() })
      .from(transactionsTable)
      .where(and(eq(transactionsTable.type, "recharge"), eq(transactionsTable.status, "completed"), gte(transactionsTable.createdAt, today)));
    const depFcfa  = Number(depRow?.totalFcfa  ?? 0);
    const depCount = Number(depRow?.totalCount ?? 0);

    const [buyRow] = await db
      .select({ totalFcfa: sum(ordersTable.priceFcfa), totalCount: count() })
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, today));
    const buyFcfa  = Number(buyRow?.totalFcfa  ?? 0);
    const buyCount = Number(buyRow?.totalCount ?? 0);

    const [balRow] = await db.select({ totalUsd: sum(usersTable.balanceUsd) }).from(usersTable);
    const platformFcfa = Math.round(Number(balRow?.totalUsd ?? 0) * 620);

    const totalFcfa  = depFcfa + buyFcfa;
    const totalCount = depCount + buyCount;
    const commFcfa   = Math.round(buyFcfa * 0.15);

    const dateStr = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const text = [
      `📊 <b>RAPPORT QUOTIDIEN - ${dateStr}</b>`,
      ``,
      `👥 Utilisateurs: ${fmtNum(usersCount)}`,
      ``,
      `💰 Volume dépôts: ${fmtNum(depFcfa)} FCFA`,
      `🛒 Volume achats: ${fmtNum(buyFcfa)} FCFA`,
      ``,
      `📈 Total transactions: ${fmtNum(totalCount)}`,
      `Volume total: ${fmtNum(totalFcfa)} FCFA`,
      ``,
      `💼 Commissions: ${fmtNum(commFcfa)} FCFA`,
      `🏦 Solde plateforme: ${fmtNum(platformFcfa)} FCFA`,
      ``,
      `🕐 Heure: ${dateStr} ${timeStr}`,
    ].join("\n");

    await sendMessage(chatId, text);
  } catch (err) {
    console.error("[Telegram] sendDailyReport error:", err);
  }
}

// ─── Cron scheduler ───────────────────────────────────────────────────────────

export function scheduleDailyReport(): void {
  function msUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return midnight.getTime() - now.getTime();
  }
  function scheduleNext() {
    const ms = msUntilMidnight();
    console.log(`[Telegram] Rapport quotidien planifié dans ${Math.round(ms / 60000)} min`);
    setTimeout(async () => {
      await sendDailyReport();
      scheduleNext();
    }, ms);
  }
  scheduleNext();
}
