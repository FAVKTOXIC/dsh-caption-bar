/** What every applier hands back so the host can retract it. */
type Disposer = () => void;
/** Services this half waits for before `apply` runs. */
export declare const inject: string[];
/**
 * Client plugin body, and the reason this plugin can be uninstalled live.
 *
 * The disposer is RETURNED rather than dropped: cordis treats a function returned
 * from a plugin's `apply` as its teardown — `Fiber._execute` runs
 * `if (typeof effect === "function") return runner.collect(effect)` — and the client
 * runner passes that value straight through. Returning `undefined` (which is what a
 * `: void` signature amounts to here) left the style element, the body class, the
 * Codex UI marker and every timer in place when the plugin was disabled or the fiber
 * restarted.
 */
export declare function apply(ctx: unknown): Disposer | undefined;
export {};
