const { Pool } = require("pg");
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "nanosprint",
  port: Number(process.env.PGPORT) || 5432,
});

pool
  .query("ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS puntos_virtuales INTEGER NOT NULL DEFAULT 0;")
  .then(() => {
    console.log("Columna puntos_virtuales agregada correctamente");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  });
