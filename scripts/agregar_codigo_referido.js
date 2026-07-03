const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "nanosprint",
  port: Number(process.env.PGPORT) || 5432,
});

async function generarCodigoUnico() {
  while (true) {
    const codigo = String(Math.floor(10000 + Math.random() * 90000));
    const existe = await pool.query("SELECT id FROM usuarios WHERE codigo_referido = $1", [codigo]);
    if (existe.rows.length === 0) return codigo;
  }
}

async function run() {
  try {
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS codigo_referido VARCHAR(5) UNIQUE`);
    console.log("Columna codigo_referido agregada");

    const result = await pool.query("SELECT id, codigo_referido FROM usuarios WHERE codigo_referido IS NULL");
    for (const row of result.rows) {
      const codigo = await generarCodigoUnico();
      await pool.query("UPDATE usuarios SET codigo_referido = $1 WHERE id = $2", [codigo, row.id]);
      console.log(`Usuario ${row.id} -> código ${codigo}`);
    }

    console.log(`✅ ${result.rows.length} usuarios actualizados`);
    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

run();
