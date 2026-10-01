import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";

// NOTE: `vite` and `../../vite.config` (which pulls in vite plugins) are
// dev-only. They MUST stay dynamic imports: the production bundle is built
// with `--packages=external` and the runtime image installs production
// dependencies only, so a static import would crash the server at boot
// with ERR_MODULE_NOT_FOUND.

export async function setupVite(app: Express, server: Server) {
  // All dev-only modules use dynamic BARE imports: with
  // `--packages=external` esbuild leaves those as runtime imports, so the
  // production bundle never statically imports them. The runtime image
  // installs production dependencies only, and a static import would crash
  // the server at boot with ERR_MODULE_NOT_FOUND. (setupVite only ever runs
  // with NODE_ENV=development, via tsx from source.)
  const { createServer: createViteServer } = await import("vite");
  const react = (await import("@vitejs/plugin-react")).default;
  const tailwindcss = (await import("@tailwindcss/vite")).default;
  const { jsxLocPlugin } = await import("@builder.io/vite-plugin-jsx-loc");

  const projectRoot = path.resolve(import.meta.dirname, "..", "..");
  const vite = await createViteServer({
    configFile: false,
    appType: "custom",
    plugins: [react(), tailwindcss(), jsxLocPlugin()],
    resolve: {
      alias: {
        "@": path.resolve(projectRoot, "client", "src"),
        "@shared": path.resolve(projectRoot, "shared"),
        "@assets": path.resolve(projectRoot, "attached_assets"),
      },
    },
    envDir: projectRoot,
    root: path.resolve(projectRoot, "client"),
    publicDir: path.resolve(projectRoot, "client", "public"),
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
    },
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
