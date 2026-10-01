/**
 * Runtime config for the web client.
 *
 * Values baked at build time (import.meta.env.VITE_*) are used as a fallback.
 * On Docker/Render deploys, `entrypoint.sh` writes `/config.js` at container
 * start, which sets `window.__APP_CONFIG__` — those values win, so the same
 * image works with any Firebase project without rebuilding.
 */
declare global {
  interface Window {
    __APP_CONFIG__?: Record<string, string | undefined>;
  }
}

export function runtimeEnv(key: string): string | undefined {
  if (typeof window !== "undefined") {
    const v = window.__APP_CONFIG__?.[key];
    if (v) return v;
  }
  try {
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    return env?.[key];
  } catch {
    return undefined;
  }
}
