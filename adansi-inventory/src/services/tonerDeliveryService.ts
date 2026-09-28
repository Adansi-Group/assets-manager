// src/services/tonerDeliveryService.ts
//
// Firestore access for toner deliveries: cartridges received into the central
// store, each with the date it arrived.
//
// Thin on purpose: what a delivery writes is decided by planDelivery() in
// src/toners/deliveries.ts, which is tested; this file only runs that plan
// inside one transaction.

import { collection, doc, getDocs, runTransaction } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { TonerDelivery } from "../types/toner";
import {
  deliveryPool,
  deliveryProblem,
  planDelivery,
  type DeliveryInput,
} from "../toners/deliveries";
import { TONER_STOCK_COLLECTION } from "./tonerStockService";

export const TONER_DELIVERIES_COLLECTION = "toner_deliveries";

/**
 * Every recorded delivery. Throws on failure — an empty list would read as
 * "nothing was received", which is a claim, not an absence of data.
 */
export async function getTonerDeliveries(): Promise<TonerDelivery[]> {
  const snapshot = await getDocs(collection(db, TONER_DELIVERIES_COLLECTION));
  return snapshot.docs.map((d) => ({
    ...(d.data() as Omit<TonerDelivery, "id">),
    id: d.id,
  }));
}

/**
 * Record cartridges received: add them to the pool for this cartridge and
 * colour (creating it if there is none) and write the dated delivery, in one
 * transaction — so the stock never moves without the record, nor the reverse.
 */
export async function recordTonerDelivery(input: DeliveryInput): Promise<void> {
  // Same "today" as the page's date default: the ISO (UTC) date, which is
  // local time in Ghana.
  const today = new Date().toISOString().split("T")[0];

  // Refuse before touching Firestore; planDelivery re-checks inside.
  const problem = deliveryProblem(today, input);
  if (problem) throw new Error(problem);

  // Firestore transactions cannot query, so the pool is located first with
  // the same normalization every other screen uses, then re-read inside the
  // transaction. A new pool is only created when no existing one matches, so
  // a delivery cannot open a second pool for a cartridge that has one.
  const stockSnapshot = await getDocs(collection(db, TONER_STOCK_COLLECTION));
  const pools = stockSnapshot.docs.map((d) => ({
    ref: d.ref,
    ...(d.data() as { tonerType: string; colorType: string }),
  }));
  const existing = deliveryPool(pools, input);

  const poolRef = existing?.ref ?? doc(collection(db, TONER_STOCK_COLLECTION));
  const deliveryRef = doc(collection(db, TONER_DELIVERIES_COLLECTION));

  await runTransaction(db, async (transaction) => {
    let current: { quantity?: unknown; lastCheckedDate?: unknown } | undefined;
    if (existing) {
      const poolSnapshot = await transaction.get(poolRef);
      if (!poolSnapshot.exists()) {
        throw new Error(
          `The ${input.colorType} ${input.tonerType} stock record was deleted while saving. ` +
            "Reload the page and record the delivery again."
        );
      }
      current = poolSnapshot.data();
    }

    const plan = planDelivery(today, current, input);
    if (plan.pool.kind === "increment") {
      transaction.update(poolRef, plan.pool.fields);
    } else {
      transaction.set(poolRef, plan.pool.fields);
    }
    transaction.set(deliveryRef, plan.delivery);
  });
}
