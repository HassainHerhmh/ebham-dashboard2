declare const __APP_BUILD_ID__: string;

/**
 * After a new deploy, hash-named JS stays cached until refresh.
 * Poll version.json and reload automatically when the build changes.
 * Skips Vite dev (HMR already updates).
 */
export function startVersionWatcher(options?: {
  intervalMs?: number;
  baseUrl?: string;
}) {
  if (import.meta.env.DEV) return;

  const currentBuildId =
    typeof __APP_BUILD_ID__ !== "undefined" ? String(__APP_BUILD_ID__) : "";
  if (!currentBuildId) return;

  const intervalMs = options?.intervalMs ?? 20_000;
  const base = (options?.baseUrl || "").replace(/\/$/, "");
  let reloading = false;

  const check = async () => {
    if (reloading) return;
    try {
      const res = await fetch(`${base}/version.json?_=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { buildId?: string };
      if (data.buildId && data.buildId !== currentBuildId) {
        reloading = true;
        window.location.reload();
      }
    } catch {
      // offline / CORS — ignore
    }
  };

  void check();
  window.setInterval(check, intervalMs);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void check();
  });
  window.addEventListener("focus", () => {
    void check();
  });
}
