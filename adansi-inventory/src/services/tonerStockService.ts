// src/services/tonerStockService.ts
//
// Firestore access for the pooled toner stock.
//
// Thin on purpose: every decision worth testing lives in src/toners/, because
// Firestore cannot be reached from a test on this account.

import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { TonerStock } from "../types/toner";
import { findPool } from "../toners/pools";
import { tonerStatus } from "../toners/stockLevel";
import { getTonerReorderLevel } from "./notificationService";

export const TONER_STOCK_COLLECTION = "toner_stock";

/** Every pool, with status derived on read as the old service did. */
export async function getTonerStock(): Promise<TonerStock[]> {
  const [snapshot, reorderLevel] = await Promise.all([
    getDocs(collection(db, TONER_STOCK_COLLECTION)),
    getTonerReorderLevel(),
  ]);

  return snapshot.docs.map((d) => {
    const data = d.data() as Omit<TonerStock, "id">;
    return {
      ...data,
      id: d.id,
      status: tonerStatus(Number(data.quantity) || 0, reorderLevel),
    };
  });
}

/**
 * Add a pool, refusing a second one for a cartridge and colour that already
 * has one — two pools for the same cartridge would split the count silently,
 * which is the class of bug this whole change exists to remove.
 */
export async function addTonerStock(pool: Omit<TonerStock, "id">): Promise<string> {
  const existing = await getTonerStock();
  if (findPool(existing, pool.tonerType, pool.colorType)) {
    throw new Error(
      `${pool.colorType} ${pool.tonerType} already has a stock record. Edit that one instead.`
    );
  }
  const ref = await addDoc(collection(db, TONER_STOCK_COLLECTION), pool);
  return ref.id;
}

export async function updateTonerStock(pool: TonerStock): Promise<void> {
  const { id, status: _status, ...data } = pool;
  await updateDoc(doc(db, TONER_STOCK_COLLECTION, id), data);
}

export async function deleteTonerStock(id: string): Promise<void> {
  await deleteDoc(doc(db, TONER_STOCK_COLLECTION, id));
}
