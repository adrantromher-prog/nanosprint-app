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
    const pool = process.env.DATABASE_URL
      ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 5000 })
      : new Pool({
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
    // ─── Polla Hípica ───
    await pool.query(`
      CREATE TABLE IF NOT EXISTS polla_config (
        id SERIAL PRIMARY KEY,
        activa BOOLEAN NOT NULL DEFAULT false,
        hipodromo VARCHAR(200) NOT NULL DEFAULT '',
        costo NUMERIC(12,2) NOT NULL DEFAULT 700.00,
        premio_1 NUMERIC(12,2) NOT NULL DEFAULT 0,
        premio_2 NUMERIC(12,2) NOT NULL DEFAULT 0,
        creada_en TIMESTAMP DEFAULT NOW(),
        cerrada_en TIMESTAMP
      )
    `);
    await pool.query(`ALTER TABLE polla_config ADD COLUMN IF NOT EXISTS hipodromo VARCHAR(200) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE polla_config ADD COLUMN IF NOT EXISTS hora_cierre VARCHAR(5) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE polla_config ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMPTZ`);
    await pool.query(`ALTER TABLE polla_config ADD COLUMN IF NOT EXISTS pdf_base64 TEXT`);
    await pool.query(`ALTER TABLE polla_config DROP COLUMN IF EXISTS premio_3`);
    console.log("✅ Tabla polla_config lista");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS polla_carreras (
        id SERIAL PRIMARY KEY,
        polla_id INTEGER NOT NULL REFERENCES polla_config(id) ON DELETE CASCADE,
        orden INTEGER NOT NULL,
        nombre VARCHAR(100) NOT NULL DEFAULT '',
        cantidad_caballos INTEGER NOT NULL,
        UNIQUE(polla_id, orden)
      )
    `);
    await pool.query(`ALTER TABLE polla_carreras ADD COLUMN IF NOT EXISTS cantidad_caballos INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE polla_carreras ADD COLUMN IF NOT EXISTS nombre VARCHAR(100) NOT NULL DEFAULT ''`);
    await pool.query(`ALTER TABLE polla_carreras ADD COLUMN IF NOT EXISTS numero INTEGER DEFAULT NULL`);
    await pool.query(`ALTER TABLE polla_carreras ADD COLUMN IF NOT EXISTS retirados INTEGER[] DEFAULT '{}'`);
    await pool.query(`ALTER TABLE polla_carreras DROP COLUMN IF EXISTS carrera_remate_id`);
    console.log("✅ Tabla polla_carreras lista");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS polla_apuestas (
        id SERIAL PRIMARY KEY,
        polla_id INTEGER NOT NULL REFERENCES polla_config(id) ON DELETE CASCADE,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        ticket INTEGER NOT NULL DEFAULT 1,
        carrera_orden INTEGER NOT NULL,
        caballo_numero INTEGER NOT NULL,
        puntos INTEGER NOT NULL DEFAULT 0,
        fecha TIMESTAMP DEFAULT NOW(),
        UNIQUE(polla_id, usuario_id, ticket, carrera_orden)
      )
    `);
    await pool.query(`ALTER TABLE polla_apuestas ADD COLUMN IF NOT EXISTS carrera_orden INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE polla_apuestas ADD COLUMN IF NOT EXISTS caballo_numero INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE polla_apuestas ADD COLUMN IF NOT EXISTS ticket INTEGER NOT NULL DEFAULT 1`);
    await pool.query(`ALTER TABLE polla_apuestas DROP CONSTRAINT IF EXISTS polla_apuestas_polla_id_usuario_id_carrera_orden_key`);
    await pool.query(`ALTER TABLE polla_apuestas DROP COLUMN IF EXISTS carrera_remate_id`);
    await pool.query(`ALTER TABLE polla_apuestas DROP COLUMN IF EXISTS caballo_id`);
    try { await pool.query(`ALTER TABLE polla_apuestas ADD CONSTRAINT polla_apuestas_ticket_unique UNIQUE (polla_id, usuario_id, ticket, carrera_orden)`); } catch (e) { if (!e.message?.includes('already exists')) throw e; }
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS es_taquilla BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE polla_apuestas ADD COLUMN IF NOT EXISTS vendido_por INTEGER REFERENCES usuarios(id)`);
    await pool.query(`ALTER TABLE polla_apuestas ADD COLUMN IF NOT EXISTS cliente_sobrenombre VARCHAR(200)`);
    await pool.query(`ALTER TABLE polla_apuestas ADD COLUMN IF NOT EXISTS cliente_telefono VARCHAR(20)`);
    await pool.query(`ALTER TABLE polla_apuestas ADD COLUMN IF NOT EXISTS caballo_original INTEGER`);
    console.log("✅ Tabla polla_apuestas lista");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS polla_resultados (
        id SERIAL PRIMARY KEY,
        polla_id INTEGER NOT NULL REFERENCES polla_config(id) ON DELETE CASCADE,
        carrera_orden INTEGER NOT NULL,
        primer_lugar INTEGER,
        segundo_lugar INTEGER,
        tercer_lugar INTEGER,
        UNIQUE(polla_id, carrera_orden)
      )
    `);
    await pool.query(`ALTER TABLE polla_resultados ADD COLUMN IF NOT EXISTS carrera_orden INTEGER NOT NULL DEFAULT 0`);
    await pool.query(`ALTER TABLE polla_resultados DROP COLUMN IF EXISTS carrera_remate_id`);
    try { await pool.query(`ALTER TABLE polla_resultados ADD CONSTRAINT polla_resultados_unique UNIQUE (polla_id, carrera_orden)`); } catch (e) { if (!e.message?.includes('already exists')) throw e; }
    try { await pool.query(`ALTER TABLE polla_resultados DROP CONSTRAINT IF EXISTS polla_resultados_primer_lugar_fkey`); } catch (e) {}
    try { await pool.query(`ALTER TABLE polla_resultados DROP CONSTRAINT IF EXISTS polla_resultados_segundo_lugar_fkey`); } catch (e) {}
    try { await pool.query(`ALTER TABLE polla_resultados DROP CONSTRAINT IF EXISTS polla_resultados_tercer_lugar_fkey`); } catch (e) {}
    await pool.query(`ALTER TABLE polla_resultados ALTER COLUMN primer_lugar TYPE INTEGER[] USING CASE WHEN primer_lugar IS NOT NULL THEN ARRAY[primer_lugar] ELSE '{}'::INTEGER[] END`);
    await pool.query(`ALTER TABLE polla_resultados ALTER COLUMN segundo_lugar TYPE INTEGER[] USING CASE WHEN segundo_lugar IS NOT NULL THEN ARRAY[segundo_lugar] ELSE '{}'::INTEGER[] END`);
    await pool.query(`ALTER TABLE polla_resultados ALTER COLUMN tercer_lugar TYPE INTEGER[] USING CASE WHEN tercer_lugar IS NOT NULL THEN ARRAY[tercer_lugar] ELSE '{}'::INTEGER[] END`);
    console.log("✅ Tabla polla_resultados lista");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS polla_puntos (
        id SERIAL PRIMARY KEY,
        polla_id INTEGER NOT NULL REFERENCES polla_config(id) ON DELETE CASCADE,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
        ticket INTEGER NOT NULL DEFAULT 1,
        puntos INTEGER NOT NULL DEFAULT 0,
        premio NUMERIC(12,2) NOT NULL DEFAULT 0,
        pagado BOOLEAN NOT NULL DEFAULT false,
        UNIQUE(polla_id, usuario_id, ticket)
      )
    `);
    await pool.query(`ALTER TABLE polla_puntos ADD COLUMN IF NOT EXISTS ticket INTEGER NOT NULL DEFAULT 1`);
    await pool.query(`ALTER TABLE polla_puntos DROP CONSTRAINT IF EXISTS polla_puntos_polla_id_usuario_id_key`);
    try { await pool.query(`ALTER TABLE polla_puntos ADD CONSTRAINT polla_puntos_ticket_unique UNIQUE (polla_id, usuario_id, ticket)`); } catch (e) { if (!e.message?.includes('already exists')) throw e; }
    await pool.query(`ALTER TABLE polla_puntos ADD COLUMN IF NOT EXISTS pagado_al_cliente BOOLEAN NOT NULL DEFAULT false`);
    console.log("✅ Tabla polla_puntos lista");

    await pool.end();
  } catch (e) {
    console.log("⚠️ Error en migraciones:", e.message);
  }
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  if (!dev) {
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
  }

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
