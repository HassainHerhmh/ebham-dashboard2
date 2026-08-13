import type { Plugin } from "vite";

export function createBuildId(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.COMMIT_REF ||
    String(Date.now())
  );
}

/** Emits version.json and injects __APP_BUILD_ID__ for auto-reload after deploy. */
export function versionEmitPlugin(buildId: string): Plugin {
  return {
    name: "emit-version-json",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify(
          {
            buildId,
            builtAt: new Date().toISOString(),
          },
          null,
          0
        ),
      });
    },
  };
}
