// src/pages/TonerMigration.tsx
//
// The screen that folds per-printer toner records into one pool per cartridge
// and colour, and tells every printer which cartridge it takes.
//
// It runs once, against live data, and the database cannot be read from a test
// on this account — so the whole point of this page is that a careful person
// can see exactly what will happen before it happens. Nothing is written until
// the last button on the last stage.
//
// Two rules this file must never break:
//   1. The old `toners` collection is read, never written and never deleted.
//      It is the only rollback that exists.
//   2. `PlannedPool.sources` holds whole old records and is preview-only. The
//      apply step builds its payload field by field so `sources` cannot reach
//      Firestore by accident.

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Layers,
  Merge,
  ShieldAlert,
} from "lucide-react";
import type { Toner, TonerStock } from "../types/toner";
import type { Printer } from "../types/printer";
import { planMigration } from "../toners/migrationPlan";
import { normalizeType, poolKey } from "../toners/pools";
import { getToners, getAllTonerTypes } from "../services/tonerService";
import { getPrinters, updatePrinter } from "../services/printerService";
import { getTonerStock, addTonerStock } from "../services/tonerStockService";

type Stage = "assign" | "merge" | "preview" | "done";

const STAGES: { key: Stage; label: string }[] = [
  { key: "assign", label: "1. Assign cartridges" },
  { key: "merge", label: "2. Merge duplicates" },
  { key: "preview", label: "3. Preview" },
  { key: "done", label: "4. Done" },
];

/**
 * The planner's alias resolution follows exactly one hop, so the same is done
 * here for the printer assignments. The merge stage makes chains impossible to
 * build, which is what keeps one hop correct.
 */
function resolveAliasName(name: string, aliases: Record<string, string>): string {
  const match = Object.keys(aliases).find((from) => normalizeType(from) === normalizeType(name));
  return match && aliases[match] ? aliases[match] : name;
}

/** Distinct cartridge names, compared the way a person would, first spelling wins. */
function distinctNames(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const key = normalizeType(value);
    if (key && !seen.has(key)) seen.set(key, value);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * What actually landed when apply stopped part way.
 *
 * Kept as numbers rather than a formatted string because the panel, the Swal
 * and the recovery advice all have to agree about the same two phases, and
 * because the user is being told what happened to their live data.
 */
type Failure = {
  phase: "pools" | "printers";
  written: number;
  totalPools: number;
  assigned: number;
  totalPrinters: number;
  detail: string;
};

/**
 * An honest account of a partial migration, in the order a stranded person
 * needs it: what landed, what the error said, the likely cause, what to do now.
 */
function failureParagraphs(failure: Failure): string[] {
  const { phase, written, totalPools, assigned, totalPrinters, detail } = failure;

  const landed =
    phase === "pools"
      ? `${written} of ${totalPools} stock ${totalPools === 1 ? "pool" : "pools"} ` +
        `${written === 1 ? "was" : "were"} created before this stopped. ` +
        `No printer assignments were saved.`
      : `All ${totalPools} stock ${totalPools === 1 ? "pool was" : "pools were"} created. ` +
        `${assigned} of ${totalPrinters} ${totalPrinters === 1 ? "printer" : "printers"} ` +
        `had their cartridge saved.`;

  const nextStep =
    phase === "pools"
      ? `Reload this page. The already-run guard will show you exactly which pools exist, and ` +
        `a pool that was written cannot be created again.`
      : `You do not need to run this screen again, and cannot — the already-run guard will ` +
        `refuse now that the pools exist. The remaining ` +
        `${totalPrinters - assigned} ${totalPrinters - assigned === 1 ? "printer" : "printers"} ` +
        `can have their Toner Type set one at a time on the Printers page, using Edit.`;

  return [
    landed,
    `The error was: ${detail}`,
    `If that is a permissions error, the toner_stock collection needs a rule in the Firebase ` +
      `console before the migration can write.`,
    nextStep,
  ];
}

export default function TonerMigration() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [oldStock, setOldStock] = useState<Toner[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [existingPools, setExistingPools] = useState<TonerStock[]>([]);
  const [knownTypes, setKnownTypes] = useState<string[]>([]);

  const [stage, setStage] = useState<Stage>("assign");
  /** Old cartridge name -> the name it merges into. */
  const [aliases, setAliases] = useState<Record<string, string>>({});
  /** poolKey values the user ticked to discard. */
  const [dropped, setDropped] = useState<string[]>([]);
  /** Only the printers the user picked for by hand; everything else follows the plan. */
  const [chosen, setChosen] = useState<Record<string, string>>({});

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  // Terminal for this mount: once set it is never cleared, so the apply button
  // cannot restart a half-finished migration and then report `written = 0`
  // while pools are sitting in the database.
  const [failure, setFailure] = useState<Failure | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [stock, printerList, pools, types] = await Promise.all([
          getToners(),
          getPrinters(),
          // If this throws, the toner_stock collection cannot be read, and an
          // empty list would be a lie that lets a second migration run.
          getTonerStock(),
          getAllTonerTypes(),
        ]);

        setOldStock(stock);
        setPrinters(printerList);
        setExistingPools(pools);
        setKnownTypes(types);

        // Suggested, not imposed: 222A-CEO is the CEO's office copy of 222A.
        // The user can clear it on the merge stage.
        const source = stock.find((t) => normalizeType(t.tonerType) === "222a-ceo");
        const target = stock.find((t) => normalizeType(t.tonerType) === "222a");
        if (source && target) setAliases({ [source.tonerType]: target.tonerType });
      } catch (error) {
        setLoadError((error as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // planMigration is pure and cheap, so the plan is recomputed from the current
  // choices rather than kept in state where it could drift out of step.
  const plan = useMemo(
    () => planMigration({ oldStock, printers, aliases, dropped }),
    [oldStock, printers, aliases, dropped]
  );

  // The same plan with nothing discarded. Dropping a pool removes it — and with
  // it the warning that offered the checkbox — so the warning list is rendered
  // from here, and the checkbox stays on screen to be unticked.
  const fullPlan = useMemo(
    () => planMigration({ oldStock, printers, aliases }),
    [oldStock, printers, aliases]
  );

  /** Every printer's cartridge: the user's pick if there is one, else the plan's. */
  const assignments = useMemo(() => {
    const out: Record<string, string> = {};
    for (const printer of printers) {
      const explicit = chosen[printer.id];
      if (explicit === undefined) {
        out[printer.id] = plan.printerTypes[printer.id] ?? "";
      } else {
        // An explicit blank stays blank: clearing a suggestion has to be
        // possible, and it is what stops the assign stage advancing.
        out[printer.id] = explicit ? resolveAliasName(explicit, aliases) : "";
      }
    }
    return out;
  }, [printers, chosen, aliases, plan]);

  const unassigned = printers.filter((printer) => !assignments[printer.id]);

  /** Cartridge names to choose from: what the pools are called, plus the catalogue. */
  const cartridgeOptions = useMemo(
    () => distinctNames([...fullPlan.pools.map((pool) => pool.tonerType), ...knownTypes]),
    [fullPlan, knownTypes]
  );

  /** The cartridge names as the old records spell them. */
  const cartridgeNames = useMemo(
    () => distinctNames(oldStock.map((record) => record.tonerType)),
    [oldStock]
  );

  // A chained alias (A -> B, B -> C) would resolve A to B and lose C, because
  // the planner follows one hop. Rather than make the planner cleverer, a chain
  // is made impossible to express: a name that is already a source cannot be
  // offered as a target, and a name that is already a target cannot be given a
  // source of its own.
  const aliasSources = useMemo(
    () =>
      new Set(
        Object.entries(aliases)
          .filter(([, to]) => to)
          .map(([from]) => normalizeType(from))
      ),
    [aliases]
  );
  const aliasTargets = useMemo(
    () => new Set(Object.values(aliases).filter(Boolean).map((to) => normalizeType(to))),
    [aliases]
  );

  function mergeTargetsFor(name: string): string[] {
    return cartridgeNames.filter(
      (candidate) =>
        normalizeType(candidate) !== normalizeType(name) &&
        !aliasSources.has(normalizeType(candidate))
    );
  }

  function setAlias(name: string, target: string) {
    setAliases((prev) => {
      const next: Record<string, string> = {};
      // Drop any key spelled differently but naming the same cartridge.
      for (const [from, to] of Object.entries(prev)) {
        if (normalizeType(from) !== normalizeType(name)) next[from] = to;
      }
      if (target) next[name] = target;
      return next;
    });
  }

  function toggleDropped(ref: string) {
    setDropped((prev) => (prev.includes(ref) ? prev.filter((key) => key !== ref) : [...prev, ref]));
  }

  async function apply() {
    // A stop is terminal. Restarting would begin at pool #1, be refused by
    // addTonerStock for the pools that already exist, and then report that
    // nothing was written — the exact opposite of the truth.
    if (failure || busy) return;

    const confirmation = await Swal.fire({
      title: "Write the pooled stock?",
      html: `
        <p style="text-align:left">This writes <strong>${plan.pools.length}</strong> stock
        ${plan.pools.length === 1 ? "pool" : "pools"} and sets the cartridge on
        <strong>${printers.length}</strong> ${printers.length === 1 ? "printer" : "printers"}.</p>
        <p style="text-align:left; margin-top:0.75rem">Nothing in the old toner list is changed or
        deleted &mdash; it stays exactly as it is, as the only way back.</p>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, migrate",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
    });
    if (!confirmation.isConfirmed) return;

    setBusy(true);
    setProgress(0);

    // Counted in locals as well as state: the catch block runs in the closure
    // this function was created in, where the state value is still whatever it
    // was before the first write. A stranded user needs the real number.
    let written = 0;
    let assigned = 0;
    const entries = Object.entries(assignments);

    try {
      for (const pool of plan.pools) {
        // Field by field, so `sources` cannot reach Firestore.
        await addTonerStock({
          tonerType: pool.tonerType,
          colorType: pool.colorType,
          quantity: pool.quantity,
          ...(pool.initialQuantity === undefined ? {} : { initialQuantity: pool.initialQuantity }),
          dateBrought: pool.dateBrought,
        });
        written += 1;
        setProgress(written);
      }

      for (const [printerId, tonerType] of entries) {
        const printer = printers.find((x) => x.id === printerId);
        if (printer) await updatePrinter({ ...printer, tonerType });
        assigned += 1;
      }

      setStage("done");
      Swal.fire({
        icon: "success",
        title: "Migration complete",
        text: `${written} ${written === 1 ? "pool" : "pools"} written, ${assigned} ${
          assigned === 1 ? "printer" : "printers"
        } assigned.`,
      });
    } catch (error) {
      // Stop where it failed, and stop for good. Whatever was written stays
      // written, a second run is refused by the already-run guard, so all this
      // screen can still do is give an exact account of what landed.
      const stopped: Failure = {
        phase: written < plan.pools.length ? "pools" : "printers",
        written,
        totalPools: plan.pools.length,
        assigned,
        totalPrinters: entries.length,
        detail: (error as Error).message,
      };

      setFailure(stopped);
      Swal.fire({
        icon: "error",
        title: "Migration stopped",
        text: failureParagraphs(stopped).join(" "),
      });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Reading the current stock...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <Shell>
        <Panel tone="red" icon={<ShieldAlert className="text-red-600 dark:text-red-400" size={22} />}>
          <p className="font-bold text-red-800 dark:text-red-300">
            The current stock could not be read, so the migration cannot start.
          </p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-1">{loadError}</p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-2">
            If this is a permissions error, the <span className="font-mono">toner_stock</span>{" "}
            collection needs a rule in the Firebase console. Until this page can read that
            collection it cannot tell whether the migration has already run, and running it blind
            would duplicate every pool.
          </p>
        </Panel>
      </Shell>
    );
  }

  // The only protection against a double run. Two pools for one cartridge split
  // the count silently, which is the bug this whole change exists to remove.
  if (existingPools.length > 0) {
    return (
      <Shell>
        <Panel tone="amber" icon={<ShieldAlert className="text-amber-600 dark:text-amber-400" size={22} />}>
          <p className="font-bold text-amber-800 dark:text-amber-300">
            Migration has already run — {existingPools.length}{" "}
            {existingPools.length === 1 ? "pool exists" : "pools exist"}. Re-running would duplicate
            them.
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            Pooled stock is edited on the Toners page from here on. Nothing on this screen will
            write anything.
          </p>
          <ul className="mt-3 space-y-1">
            {existingPools.map((pool) => (
              <li key={pool.id} className="text-sm text-amber-900 dark:text-amber-200">
                <span className="font-semibold">
                  {pool.colorType} {pool.tonerType}
                </span>{" "}
                — {pool.quantity} {pool.quantity === 1 ? "cartridge" : "cartridges"}
              </li>
            ))}
          </ul>
          <button
            onClick={() => navigate("/toners")}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Back to Toners
          </button>
        </Panel>
      </Shell>
    );
  }

  // Printers load the same way stock does — getPrinters() also swallows its
  // own errors and returns []. An empty table here would leave the assign
  // stage with nothing to assign, which empties `unassigned`, which enables
  // Next, which lets Apply write every pool with zero printer assignments —
  // and the already-run guard then locks the screen before it can be fixed
  // from here. So, like a failed stock read, this refuses to start.
  if (printers.length === 0) {
    return (
      <Shell>
        <Panel tone="red" icon={<ShieldAlert className="text-red-600 dark:text-red-400" size={22} />}>
          <p className="font-bold text-red-800 dark:text-red-300">
            No printers could be loaded, so the migration cannot run.
          </p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-1">
            This usually means the printer read failed, not that there are genuinely no printers.
            Running the migration without any printers would write every stock pool with zero
            printer assignments, and the already-run guard would then lock the screen before that
            could be fixed here.
          </p>
          <p className="text-sm text-red-700 dark:text-red-400 mt-2">
            Reload this page. If it still shows no printers, check that the{" "}
            <span className="font-mono">printers</span> collection can be read before trying again.
          </p>
        </Panel>
      </Shell>
    );
  }

  if (oldStock.length === 0) {
    return (
      <Shell>
        <Panel tone="amber" icon={<AlertTriangle className="text-amber-600 dark:text-amber-400" size={22} />}>
          <p className="font-bold text-amber-800 dark:text-amber-300">
            No toner records were found.
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            If records are expected, this may mean the read failed rather than that there are
            genuinely none. Otherwise, add stock on the Toners page first.
          </p>
        </Panel>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* STAGE BAR */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4">
        <div className="flex flex-wrap items-center gap-2">
          {STAGES.map((item, index) => {
            const current = STAGES.findIndex((s) => s.key === stage);
            const state = index === current ? "current" : index < current ? "past" : "future";
            return (
              <span
                key={item.key}
                className={
                  "px-3 py-1.5 rounded-lg text-sm font-medium " +
                  (state === "current"
                    ? "bg-green-600 text-white"
                    : state === "past"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400")
                }
              >
                {item.label}
              </span>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
          Nothing is written until you confirm on the preview. The old toner records are read only —
          they are never changed or deleted, and they are the only way back.
        </p>
      </div>

      {failure && (
        <Panel tone="red" icon={<AlertTriangle className="text-red-600 dark:text-red-400" size={22} />}>
          <p className="font-bold text-red-800 dark:text-red-300">
            The migration stopped part way. This is what landed:
          </p>
          {failureParagraphs(failure).map((line) => (
            <p key={line} className="text-sm text-red-700 dark:text-red-400 mt-2">
              {line}
            </p>
          ))}
        </Panel>
      )}

      {/* ---------------------------------------------------------------- */}
      {stage === "assign" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Layers className="text-green-600" size={24} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Which cartridge does each printer take?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Suggested from the stock currently filed against each printer. A printer with no
                cartridge cannot have its toner replaced, so every row needs one.
              </p>
            </div>
          </div>

          {unassigned.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded-r-lg p-4">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {unassigned.length} {unassigned.length === 1 ? "printer has" : "printers have"} no
                cartridge yet. Choose one on each highlighted row.
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  {["Location", "Room", "Model", "Cartridge"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-gray-900 dark:text-white whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {printers.map((printer) => {
                  const value = assignments[printer.id] ?? "";
                  const missing = !value;
                  const options = cartridgeOptions.includes(value)
                    ? cartridgeOptions
                    : [value, ...cartridgeOptions].filter(Boolean);
                  return (
                    <tr
                      key={printer.id}
                      className={
                        "border-t border-gray-200 dark:border-gray-700 " +
                        (missing ? "bg-amber-50 dark:bg-amber-950/30" : "")
                      }
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                        {printer.location}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {printer.room || <span className="text-gray-400">no room</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{printer.model}</td>
                      <td className="px-4 py-3">
                        <select
                          value={value}
                          onChange={(e) => setChosen({ ...chosen, [printer.id]: e.target.value })}
                          className={
                            "border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white " +
                            (missing
                              ? "border-amber-500"
                              : "border-gray-300 dark:border-gray-600")
                          }
                        >
                          <option value="">— choose a cartridge —</option>
                          {options.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStage("merge")}
              disabled={unassigned.length > 0}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
              title={
                unassigned.length > 0
                  ? "Every printer needs a cartridge before you can continue"
                  : undefined
              }
            >
              Next: merge duplicates
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {stage === "merge" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Merge className="text-green-600" size={24} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Are any of these the same cartridge?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Two names for one cartridge become one pool. Leave a row blank if its name stands on
                its own.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-900 dark:text-blue-300">
              A cartridge that already merges into another cannot itself be a merge target, and one
              that others merge into cannot be merged away — so a merge is always one step, never a
              chain.
            </p>
          </div>

          <div className="space-y-2">
            {cartridgeNames.map((name) => {
              const isTarget = aliasTargets.has(normalizeType(name));
              const mergedIn = cartridgeNames.filter(
                (other) => normalizeType(aliases[other] ?? "") === normalizeType(name)
              );
              const current = aliases[name] ?? "";
              return (
                <div
                  key={name}
                  className="flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg"
                >
                  <span className="font-semibold text-gray-900 dark:text-white w-40">{name}</span>

                  {isTarget ? (
                    <span className="text-sm text-green-700 dark:text-green-400">
                      {mergedIn.join(", ")} {mergedIn.length === 1 ? "merges" : "merge"} into this
                      one, so it cannot be merged away itself.
                    </span>
                  ) : (
                    <>
                      <span className="text-sm text-gray-500 dark:text-gray-400">same as</span>
                      <select
                        value={current}
                        onChange={(e) => setAlias(name, e.target.value)}
                        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">— on its own —</option>
                        {mergeTargetsFor(name).map((target) => (
                          <option key={target} value={target}>
                            {target}
                          </option>
                        ))}
                      </select>
                      {current && (
                        <span className="text-xs text-green-700 dark:text-green-400">
                          Its stock will be counted as {current}.
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStage("assign")}
              className="border border-gray-300 dark:border-gray-600 px-5 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <button
              onClick={() => setStage("preview")}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              Next: preview
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {stage === "preview" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-4">
            <div className="flex items-center gap-4">
              <Layers className="text-green-600" size={24} />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  What will be written
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {plan.pools.length} {plan.pools.length === 1 ? "pool" : "pools"} from{" "}
                  {oldStock.length} old {oldStock.length === 1 ? "record" : "records"}, and the
                  cartridge on {printers.length} {printers.length === 1 ? "printer" : "printers"}.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    {["Cartridge", "Colour", "Qty", "Of", "Date brought", "Folded from"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-gray-900 dark:text-white whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.pools.map((pool) => {
                    const key = poolKey(pool.tonerType, pool.colorType);
                    const merged = pool.sources.length > 1;
                    return (
                      <tr
                        key={key}
                        className={
                          "border-t border-gray-200 dark:border-gray-700 align-top " +
                          (merged
                            ? "bg-indigo-50 dark:bg-indigo-950/30 border-l-4 border-l-indigo-500"
                            : "")
                        }
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                          {pool.tonerType}
                          {merged && (
                            <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">
                              merged
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {pool.colorType}
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                          {pool.quantity}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {pool.initialQuantity === undefined ? (
                            <span className="text-gray-400" title="Not every old record had one">
                              not known
                            </span>
                          ) : (
                            pool.initialQuantity
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {pool.dateBrought}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={
                              "text-xs font-semibold " +
                              (merged
                                ? "text-indigo-700 dark:text-indigo-300"
                                : "text-gray-500 dark:text-gray-400")
                            }
                          >
                            {pool.sources.length}{" "}
                            {pool.sources.length === 1 ? "old record" : "old records"}
                          </div>
                          <ul className="mt-1 space-y-0.5">
                            {pool.sources.map((source) => (
                              <li
                                key={source.id}
                                className="text-xs text-gray-600 dark:text-gray-400"
                              >
                                {source.location}
                                {source.room ? ` (${source.room})` : " (no room)"} ·{" "}
                                {source.printerType} ·{" "}
                                <span className="font-mono">{source.tonerType}</span> ·{" "}
                                {source.quantity}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* The printers are written too, so they are previewed too. */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Cartridge on each printer
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Written onto the printer record, which is how a replacement finds the right pool.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    {["Location", "Room", "Model", "Cartridge"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-gray-900 dark:text-white whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {printers.map((printer) => (
                    <tr key={printer.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-4 py-2 font-semibold text-gray-900 dark:text-white">
                        {printer.location}
                      </td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                        {printer.room || <span className="text-gray-400">no room</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{printer.model}</td>
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                        {assignments[printer.id]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* WARNINGS */}
          {fullPlan.warnings.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 space-y-3">
              <div className="flex items-center gap-4">
                <AlertTriangle className="text-amber-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {fullPlan.warnings.length}{" "}
                  {fullPlan.warnings.length === 1 ? "thing" : "things"} worth a look
                </h2>
              </div>

              <ul className="space-y-2">
                {fullPlan.warnings.map((warning) => {
                  const isDropped = dropped.includes(warning.ref);
                  const printerChoice =
                    warning.kind === "printer-without-cartridge"
                      ? assignments[warning.ref]
                      : undefined;
                  return (
                    <li
                      key={`${warning.kind}:${warning.ref}`}
                      className={
                        "rounded-lg p-3 text-sm " +
                        (warning.kind === "impossible-colour"
                          ? "bg-red-50 dark:bg-red-950/40 text-red-900 dark:text-red-200"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200")
                      }
                    >
                      <div>{warning.message}</div>

                      {warning.kind === "impossible-colour" && (
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isDropped}
                            onChange={() => toggleDropped(warning.ref)}
                            className="h-4 w-4"
                          />
                          <span className="font-medium">
                            {isDropped
                              ? "Discarded — this pool will not be written."
                              : "Discard this record instead of writing it."}
                          </span>
                        </label>
                      )}

                      {warning.kind === "printer-without-cartridge" && (
                        <div className="mt-1 text-xs">
                          You chose <span className="font-semibold">{printerChoice}</span> for it.
                        </div>
                      )}

                      {warning.kind === "empty-pool" && (
                        <div className="mt-1 text-xs">
                          It will still be written, at zero, so it shows up for reordering.
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
            {busy && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Writing pool {Math.min(progress + 1, plan.pools.length)} of {plan.pools.length}...
              </p>
            )}
            <div className="flex justify-between">
              <button
                onClick={() => setStage("merge")}
                disabled={busy || failure !== null}
                className="border border-gray-300 dark:border-gray-600 px-5 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <button
                onClick={apply}
                disabled={busy || failure !== null || plan.pools.length === 0}
                title={
                  failure
                    ? "The migration stopped part way and cannot be restarted from here"
                    : undefined
                }
                className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {failure ? "Migration stopped" : busy ? "Migrating..." : "Migrate now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {stage === "done" && (
        <Panel tone="green" icon={<CheckCircle2 className="text-green-600 dark:text-green-400" size={22} />}>
          <p className="font-bold text-green-800 dark:text-green-300">
            Migration complete — {progress} {progress === 1 ? "pool" : "pools"} written and{" "}
            {printers.length} {printers.length === 1 ? "printer" : "printers"} assigned.
          </p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-1">
            The old toner records are untouched. Check the numbers on the Toners page against what
            is actually in the store before anything else is changed.
          </p>
          <button
            onClick={() => navigate("/toners")}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Go to Toners
          </button>
        </Panel>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Consolidate toner stock
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Combine per-printer toner records into one shared set per cartridge.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

function Panel({
  tone,
  icon,
  children,
}: {
  tone: "red" | "amber" | "green";
  icon: ReactNode;
  children: ReactNode;
}) {
  const tones = {
    red: "bg-red-50 dark:bg-red-950/40 border-red-500",
    amber: "bg-amber-50 dark:bg-amber-950/40 border-amber-500",
    green: "bg-green-50 dark:bg-green-950/40 border-green-500",
  };
  return (
    <div role="alert" className={`${tones[tone]} border-l-4 rounded-r-lg p-5`}>
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
