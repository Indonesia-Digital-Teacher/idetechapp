import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { initializeDatabase } from "./db/init";
import apiRoutes from "./routes/api";

await initializeDatabase();
await import("./seed");

const app = new Hono();

app.use(logger());
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:2016", "http://127.0.0.1:2016"],
    credentials: true
  })
);

app.use("/api/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");
});

// Global error handler: logs full error (with stack + errorId) to stderr and
// returns a safe JSON response. Preserves HTTPException (e.g. 401/403/404 from middleware).
app.onError((err, c) => {
  const errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const isDev = process.env.NODE_ENV !== "production";

  console.error(
    `[${errorId}] ${c.req.method} ${c.req.path} -> unhandled:`,
    err instanceof Error ? (err.stack ?? err.message) : err
  );

  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  return c.json(
    {
      message: "Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator.",
      errorId,
      ...(isDev && err instanceof Error ? { detail: err.message } : {})
    },
    500
  );
});

app.route("/api", apiRoutes);

app.use("*", serveStatic({ root: "./dist" }));
app.get("*", async (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ message: "Endpoint API tidak ditemukan." }, 404);
  }

  const file = Bun.file("./dist/index.html");
  if (await file.exists()) {
    c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    c.header("Pragma", "no-cache");
    c.header("Expires", "0");
    return c.html(await file.text());
  }
  return c.text("Jalankan `bun run dev` untuk mode development atau `bun run build && bun run start` untuk produksi.");
});

const port = Number(process.env.PORT ?? 2016);

Bun.serve({
  fetch: app.fetch,
  port,
  // Permintaan administrasi dan AI dapat memerlukan lebih dari batas Bun
  // bawaan (10 detik). Endpoint tetap dioptimalkan agar tidak bergantung pada ini.
  idleTimeout: 30
});

console.log(`IdeTech API berjalan di http://localhost:${port}/api`);
