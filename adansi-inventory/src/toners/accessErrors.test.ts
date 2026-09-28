import { describe, expect, it } from "vitest";
import { accessErrorMessage } from "./accessErrors";

/** Shaped like a FirestoreError without importing Firestore. */
const firestoreError = (code: string, message = "Missing or insufficient permissions.") =>
  Object.assign(new Error(message), { code });

describe("accessErrorMessage", () => {
  it("names the collection and who to ask when Firestore refuses access", () => {
    expect(accessErrorMessage(firestoreError("permission-denied"), "toner_deliveries")).toBe(
      "You don't have permission to change or read toner_deliveries. " +
        "If you think you should, ask an administrator to check your role."
    );
  });

  it("recognises a prefixed code", () => {
    expect(accessErrorMessage(firestoreError("firestore/permission-denied"), "toner_stock")).toMatch(
      /permission to change or read toner_stock/
    );
  });

  it("names every likely collection when it cannot tell which one failed", () => {
    const message = accessErrorMessage(firestoreError("permission-denied"), [
      "toner_stock",
      "toner_deliveries",
      "toner_replacements",
    ]);
    expect(message).toBe(
      "You don't have permission to read one of toner_stock, toner_deliveries or toner_replacements. " +
        "If you think you should, ask an administrator to check your role."
    );
  });

  it("treats a one-item list like a single name", () => {
    expect(accessErrorMessage(firestoreError("permission-denied"), ["toner_stock"])).toMatch(
      /^You don't have permission to change or read toner_stock\. /
    );
  });

  it("still says who to ask when no collection is named", () => {
    expect(accessErrorMessage(firestoreError("permission-denied"), [])).toBe(
      "You don't have permission to do that. If you think you should, ask an administrator to check your role."
    );
  });

  it("does not hide Firestore's raw permission text behind nothing", () => {
    expect(accessErrorMessage(firestoreError("permission-denied"), "toner_stock")).not.toMatch(
      /Missing or insufficient/
    );
  });

  it("passes any other error's own message through", () => {
    expect(accessErrorMessage(firestoreError("unavailable", "Offline."), "toner_stock")).toBe("Offline.");
  });

  it("uses the fallback when there is no message to show", () => {
    expect(accessErrorMessage("boom", "toner_stock", "Could not load toner stock.")).toBe(
      "Could not load toner stock."
    );
    expect(accessErrorMessage(null, "toner_stock", "Could not load toner stock.")).toBe(
      "Could not load toner stock."
    );
  });
});
