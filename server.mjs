import { createServer } from "http";
import { parse } from "url";
import { WebSocketServer } from "ws";
import next from "next";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { setWSS } = require("./lib/ws.js");

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  try {
    const { Pool } = require("pg");
    const pool = new Pool({
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      port: Number(process.env.PGPORT),
      connectionTimeoutMillis: 5000,
    });
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS codigo_referido VARCHAR(5) UNIQUE`);
    console.log("✅ Columna codigo_referido lista");
    await pool.end();
  } catch (e) {
    console.log("⚠️ No se pudo migrar codigo_referido:", e.message);
  }
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ server });
  setWSS(wss);

  wss.on("connection", (ws) => {
    ws.on("error", () => {});
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
