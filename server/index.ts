import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { createServer as createViteServer } from "vite";
import { resolve } from "node:path";
import { loadConfig, saveConfig } from "./config.ts";
import { createApi } from "./api.ts";
const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT) || 4178;
const production = process.env.NODE_ENV === "production";
app.disable("x-powered-by");
app.use((req, res, next) => {
  const hostname = req.hostname;
  if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname)) {
    res.status(403).send("Local access only");
    return;
  }
  if (req.path.startsWith("/api/") && req.headers.origin) {
    try {
      const origin = new URL(req.headers.origin);
      if (
        origin.host !== req.headers.host ||
        !["http:", "https:"].includes(origin.protocol)
      )
        throw new Error("origin");
    } catch {
      res.status(403).json({ error: "不允许跨站请求" });
      return;
    }
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(
  "/api",
  express.json({ limit: "512kb" }),
  createApi({
    initialConfig: await loadConfig(),
    editable: !production,
    persist: saveConfig,
  }),
);
if (production) {
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true, ws: { server: httpServer } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? Number(err.status)
        : 500;
    res
      .status(status === 413 ? 413 : 400)
      .json({ error: status === 413 ? "输入内容过长" : "请求格式不正确" });
  },
);
httpServer.on("error", () => {
  console.error("无法启动本地服务，请通过 PORT 选择空闲端口");
  process.exit(1);
});
httpServer.listen(port, "127.0.0.1", () =>
  console.log(`\n  月见 MOONLIT  →  http://127.0.0.1:${port}\n`),
);
