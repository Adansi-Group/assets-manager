import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { Member } from "../types/member";
import { normalizeEmail, type MemberLookup } from "../access/members";

export const MEMBERS_COLLECTION = "members";

const memberRef = (email: string) => doc(db, MEMBERS_COLLECTION, normalizeEmail(email));

/**
 * An entry that already exists, by the id it was stored under. An id typed by
 * hand may not be lower case; normalising it would edit or remove a different
 * document, or none.
 */
const storedRef = (id: string) => doc(db, MEMBERS_COLLECTION, id);

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Never throws: the caller turns a failure into "no access", not a default role. */
export async function lookupMember(email: string): Promise<MemberLookup> {
  const id = normalizeEmail(email);
  if (!id) return { status: "missing" };
  try {
    const snap = await getDoc(memberRef(id));
    if (!snap.exists()) return { status: "missing" };
    return { status: "found", member: { ...(snap.data() as Member), email: id } };
  } catch (error) {
    console.error("Could not look up member:", error);
    return { status: "failed" };
  }
}

/** Throws on failure: an empty list would read as "nobody has access". */
export async function getMembers(): Promise<Member[]> {
  const snap = await getDocs(collection(db, MEMBERS_COLLECTION));
  return snap.docs
    .map((d) => {
      const data = d.data() as Member;
      return { ...data, name: typeof data.name === "string" ? data.name : "", email: d.id };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function addMember(
  input: Omit<Member, "createdAt" | "addedBy">,
  addedBy: string
): Promise<void> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();
  if (!email) throw new Error("Enter an email address.");
  if (!name) throw new Error("Enter a name.");
  const ref = memberRef(email);
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists()) throw new Error(`${email} is already on the list.`);
    tx.set(
      ref,
      withoutUndefined({
        email,
        name,
        role: input.role,
        department: input.department?.trim() || undefined,
        createdAt: new Date().toISOString(),
        addedBy: normalizeEmail(addedBy) || undefined,
      })
    );
  });
}

export async function updateMember(
  id: string,
  patch: Pick<Member, "name" | "role"> & { department?: string }
): Promise<void> {
  const name = patch.name.trim();
  if (!name) throw new Error("Enter a name.");
  await updateDoc(storedRef(id), {
    name,
    role: patch.role,
    department: patch.department?.trim() ?? "",
  });
}

export async function removeMember(id: string): Promise<void> {
  await deleteDoc(storedRef(id));
}
