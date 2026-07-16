const { Client } = require("pg");
const c = new Client({
  host: "45.91.108.10",
  port: 5432,
  user: "nanosprint",
  password: "Isafano18833865",
  database: "db_nanosprint",
});
c.connect().then(async () => {
  const tables = ["historial", "polla_apuestas", "apuestas", "remates_pujas", "carrerasvirtuales_tickets"];
  for (const t of tables) {
    const r = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position", [t]);
    console.log("\n=== " + t + " ===");
    console.log(r.rows.map(col => "  " + col.column_name + " (" + col.data_type + ")").join("\n"));
  }
  await c.end();
}).catch(e => { console.error(e); process.exit(1); });