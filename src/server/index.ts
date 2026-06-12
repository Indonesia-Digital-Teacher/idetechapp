import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import { initializeDatabase } from "./db/init";
import apiRoutes from "./routes/api";

initializeDatabase();
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

app.route("/api", apiRoutes);

app.use("/assets/*", serveStatic({ root: "./dist" }));
app.get("/landing-idetech-bg.png", serveStatic({ path: "./dist/landing-idetech-bg.png" }));
app.get("*", async (c) => {
  const file = Bun.file("./dist/index.html");
  if (await file.exists()) return c.html(await file.text());
  return c.text("Jalankan `bun run dev` untuk mode development atau `bun run build && bun run start` untuk produksi.");
});

const port = Number(process.env.PORT ?? 2016);

Bun.serve({
  fetch: app.fetch,
  port
});

console.log(`IdeTech API berjalan di http://localhost:${port}/api`);
