const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "nanosprint",
  port: Number(process.env.PGPORT) || 5432,
});

async function init() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        apellido VARCHAR(100) NOT NULL,
        sobrenombre VARCHAR(100) NOT NULL UNIQUE,
        telefono VARCHAR(15) NOT NULL UNIQUE,
        comida_favorita VARCHAR(100) NOT NULL,
        sexo VARCHAR(20) NOT NULL,
        password TEXT NOT NULL,
        saldo NUMERIC(12,2) NOT NULL DEFAULT 0,
        bloqueado BOOLEAN NOT NULL DEFAULT false,
        razon_bloqueo TEXT,
        rol VARCHAR(20) NOT NULL DEFAULT 'user',
        puntos INTEGER NOT NULL DEFAULT 0,
        puntos_virtuales INTEGER NOT NULL DEFAULT 0,
        creado_en TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Tabla usuarios lista");

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
    console.log("Tabla historial lista");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS carreras_remate (
        id SERIAL PRIMARY KEY,
        hipodromo VARCHAR(100) NOT NULL,
        numero_carrera INTEGER NOT NULL,
        hora_cierre VARCHAR(5) NOT NULL,
        tipo VARCHAR(20) NOT NULL DEFAULT 'nacional',
        estado VARCHAR(20) NOT NULL DEFAULT 'abierta',
        ganador INTEGER,
        imagen TEXT
      )
    `);
    await pool.query(`ALTER TABLE carreras_remate ADD COLUMN IF NOT EXISTS imagen TEXT`);
    console.log("Tabla carreras_remate lista");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS carreras_caballos (
        id SERIAL PRIMARY KEY,
        id_carrera INTEGER NOT NULL REFERENCES carreras_remate(id) ON DELETE CASCADE,
        numero INTEGER NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        retirado BOOLEAN NOT NULL DEFAULT false
      )
    `);
    console.log("Tabla carreras_caballos lista");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS remates_pujas (
        id SERIAL PRIMARY KEY,
        id_remate INTEGER NOT NULL REFERENCES carreras_remate(id) ON DELETE CASCADE,
        id_caballo INTEGER NOT NULL REFERENCES carreras_caballos(id) ON DELETE CASCADE,
        id_usuario INTEGER NOT NULL REFERENCES usuarios(id),
        monto NUMERIC(12,2) NOT NULL,
        fecha TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Tabla remates_pujas lista");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS jackpot_remates (
        id SERIAL PRIMARY KEY,
        monto NUMERIC(12,2) NOT NULL DEFAULT 0
      )
    `);
    await pool.query(`
      INSERT INTO jackpot_remates (id, monto) VALUES (1, 0) ON CONFLICT (id) DO NOTHING
    `);
    console.log("Tabla jackpot_remates lista");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuracion (
        clave VARCHAR(100) PRIMARY KEY,
        valor TEXT NOT NULL
      )
    `);
    await pool.query(`
      INSERT INTO configuracion (clave, valor) VALUES ('mantenimiento', 'false') ON CONFLICT (clave) DO NOTHING
    `);
    console.log("Tabla configuracion lista");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS musica_estado (
        id INTEGER PRIMARY KEY DEFAULT 1,
        track_idx INTEGER NOT NULL DEFAULT 1,
        inicio TIMESTAMP NOT NULL DEFAULT NOW(),
        reproduciendo BOOLEAN NOT NULL DEFAULT true
      )
    `);
    await pool.query(`
      INSERT INTO musica_estado (id, track_idx, inicio, reproduciendo)
      VALUES (1, 1, NOW(), true)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log("Tabla musica_estado lista");

    console.log("Base de datos inicializada correctamente");
    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

init();
