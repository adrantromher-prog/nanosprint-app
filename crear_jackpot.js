const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "nanosprint",
  port: Number(process.env.PGPORT) || 5432,
});
pool
  .query(
    "CREATE TABLE IF NOT EXISTS jackpot_remates (id SERIAL PRIMARY KEY, monto NUMERIC(12,2) NOT NULL DEFAULT 0); INSERT INTO jackpot_remates (id, monto) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;"
  )
  .then(() => {
    console.log("Tabla jackpot_remates creada correctamente");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  });
