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
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS referido_por INTEGER REFERENCES usuarios(id)`);
    console.log("✅ Columna referido_por lista");
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS referido_saldo NUMERIC(12,2) DEFAULT 0`);
    console.log("✅ Columna referido_saldo lista");
    await pool.query(`CREATE TABLE IF NOT EXISTS jackpot_remates (id SERIAL PRIMARY KEY, monto NUMERIC(12,2) NOT NULL DEFAULT 0)`);
    await pool.query(`INSERT INTO jackpot_remates (id, monto) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`);
    console.log("✅ Tabla jackpot_remates lista");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS historial (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        monto NUMERIC(12,2) NOT NULL,
        asunto TEXT,
        fecha TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ Tabla historial lista");

    // Generar codigo_referido para usuarios existentes que no tengan uno
    const sinCodigo = await pool.query(`SELECT id FROM usuarios WHERE codigo_referido IS NULL`);
    for (const u of sinCodigo.rows) {
      for (let i = 0; i < 50; i++) {
        const codigo = String(Math.floor(10000 + Math.random() * 90000));
        const existe = await pool.query("SELECT id FROM usuarios WHERE codigo_referido = $1", [codigo]);
        if (existe.rows.length === 0) {
          await pool.query("UPDATE usuarios SET codigo_referido = $1 WHERE id = $2", [codigo, u.id]);
          break;
        }
      }
    }
    if (sinCodigo.rows.length > 0) {
      console.log(`✅ Códigos generados para ${sinCodigo.rows.length} usuarios existentes`);
    }

    // Verificar que las columnas existen
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name IN ('codigo_referido','referido_por','referido_saldo')`
    );
    console.log("📊 Columnas en usuarios:", cols.rows.map(c => c.column_name).join(", "));

    await pool.end();
  } catch (e) {
    console.log("⚠️ Error en migraciones:", e.message);
  }
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ server });
  setWSS(wss);

  wss.on("connection", (ws, req) => {
    const ip = req?.socket?.remoteAddress || "desconocida";
    console.log(`🟢 Cliente WebSocket conectado desde ${ip} (total: ${wss.clients.size})`);
    ws.on("error", () => {});
    ws.on("close", () => {
      console.log(`🔴 Cliente WebSocket desconectado (total: ${wss.clients.size})`);
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
