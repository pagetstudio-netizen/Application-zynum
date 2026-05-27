import { db, ordersTable, usersTable } from "@workspace/db";
import { eq, and, isNull, inArray, lt, sql } from "drizzle-orm";
import { cancelOrder } from "./fivesim.js";

const SIX_MIN_MS = 6 * 60 * 1000;

async function cancelExpiredOrders() {
  try {
    const cutoff = new Date(Date.now() - SIX_MIN_MS);

    const expired = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          inArray(ordersTable.status, ["PENDING", "RECEIVED"]),
          isNull(ordersTable.smsCode),
          lt(ordersTable.createdAt, cutoff),
        ),
      );

    if (expired.length === 0) return;

    console.log(`[Scheduler] ${expired.length} commande(s) expirée(s) à annuler`);

    for (const order of expired) {
      try {
        await cancelOrder(parseInt(order.externalId, 10));
      } catch {
        // 5sim error ignored — still refund in DB
      }

      await db.transaction(async (tx) => {
        await tx
          .update(usersTable)
          .set({ balanceUsd: sql`${usersTable.balanceUsd} + ${order.priceUsd}` })
          .where(eq(usersTable.id, order.userId));

        await tx
          .update(ordersTable)
          .set({ status: "CANCELED" })
          .where(eq(ordersTable.id, order.id));
      });

      console.log(`[Scheduler] Commande ${order.id} annulée + remboursement user ${order.userId}`);
    }
  } catch (err) {
    console.error("[Scheduler] Erreur auto-cancel:", err);
  }
}

export function scheduleAutoCancel() {
  // Run immediately on startup, then every 60 seconds
  cancelExpiredOrders();
  setInterval(cancelExpiredOrders, 60_000);
  console.log("[Scheduler] Auto-cancel des commandes expirées activé (toutes les 60s)");
}
