import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, max: 3
});
if (!pool) { console.error("Falta DATABASE_URL"); process.exit(1); }
(async () => {
  const q = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='usuarios' ORDER BY ordinal_position");
  q.rows.forEach(c => console.log(c.column_name));
  const q2 = await pool.query("SELECT telefono, nombre, rol FROM usuarios ORDER BY id");
  q2.rows.forEach(u => console.log(">>", u.telefono, u.nombre, u.rol));
  await pool.end();
})();
