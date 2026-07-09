import pg from "pg";

const railwayUrl = process.env.ORIGIN_DATABASE_URL;
const neonUrl = process.env.DATABASE_URL;
if (!railwayUrl || !neonUrl) {
  console.error("Falta ORIGIN_DATABASE_URL (Railway) o DATABASE_URL (Neon) en las variables de entorno");
  process.exit(1);
}

const rail = new pg.Pool({ connectionString: railwayUrl, ssl: { rejectUnauthorized: false }, max: 5 });
const neon = new pg.Pool({ connectionString: neonUrl, ssl: { rejectUnauthorized: false }, max: 5 });

function mapType(dataType, udtName, colDefault) {
  if (udtName === "_int4") return "INTEGER[]";
  if (udtName === "int4") return colDefault?.includes("nextval") ? "SERIAL" : "INTEGER";
  if (udtName === "int2") return "SMALLINT";
  if (udtName === "numeric") return "NUMERIC(12,2)";
  if (udtName === "float8") return "DOUBLE PRECISION";
  if (udtName === "float4") return "REAL";
  if (udtName === "bool") return "BOOLEAN";
  if (udtName === "text") return "TEXT";
  if (udtName === "varchar") return "VARCHAR(200)";
  if (udtName === "timestamp") return "TIMESTAMP";
  if (udtName === "timestamptz") return "TIMESTAMPTZ";
  if (udtName === "date") return "DATE";
  if (udtName === "time") return "TIME";
  if (udtName === "bytea") return "BYTEA";
  if (udtName === "json") return "JSON";
  if (udtName === "jsonb") return "JSONB";
  return dataType.toUpperCase();
}

async function main() {
  // 1. Obtener todas las tablas de Railway
  const tablas = (await rail.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name"
  )).rows.map(r => r.table_name);

  console.log("Tablas:", tablas.join(", "));

  // 2. Dropear todo en Neon
  for (const t of tablas) {
    try { await neon.query(`DROP TABLE IF EXISTS "${t}" CASCADE`); } catch {}
  }

  // 3. Crear tablas con la misma estructura
  for (const table of tablas) {
    const cols = (await rail.query(
      `SELECT column_name, data_type, is_nullable, column_default, udt_name, character_maximum_length
       FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1
       ORDER BY ordinal_position`, [table]
    )).rows;

    const pk = (await rail.query(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_schema='public' AND tc.table_name=$1 AND tc.constraint_type='PRIMARY KEY'
       ORDER BY kcu.ordinal_position`, [table]
    )).rows.map(r => r.column_name);

    const uniqueConstraints = (await rail.query(
      `SELECT tc.constraint_name, kcu.column_name, kcu.ordinal_position
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
       WHERE tc.table_schema='public' AND tc.table_name=$1 AND tc.constraint_type='UNIQUE'
       ORDER BY tc.constraint_name, kcu.ordinal_position`, [table]
    )).rows;

    const parts = [];
    for (const c of cols) {
      let tipo = mapType(c.data_type, c.udt_name, c.column_default);
      let line;
      if (tipo === "SERIAL") {
        line = `  "${c.column_name}" SERIAL`;
      } else {
        line = `  "${c.column_name}" ${tipo}`;
        if (c.is_nullable === "NO") line += " NOT NULL";
        if (c.column_default && !c.column_default.includes("nextval")) {
          let def = c.column_default;
          if (def.startsWith("'") && def.endsWith("'::character varying")) def = def.substring(0, def.indexOf("::"));
          else if (def === "false") def = "false";
          else if (def === "true") def = "true";
          else if (def === "0") def = "0";
          else if (def === "0.00") def = "0.00";
          else if (def === "'{}'::integer[]") def = "'{}'";
          line += ` DEFAULT ${def}`;
        }
      }
      parts.push(line);
    }

    if (pk.length > 0) parts.push(`  PRIMARY KEY (${pk.map(p => `"${p}"`).join(", ")})`);

    // Unique constraints (agrupar por nombre de constraint)
    const uniqByName = {};
    for (const u of uniqueConstraints) {
      if (!uniqByName[u.constraint_name]) uniqByName[u.constraint_name] = [];
      uniqByName[u.constraint_name].push(u.column_name);
    }
    for (const [name, cols2] of Object.entries(uniqByName)) {
      const colStr = cols2.map(c => `"${c}"`).join(", ");
      if (cols2.join(",") !== pk.join(",")) parts.push(`  UNIQUE (${colStr})`);
    }

    const sql = `CREATE TABLE "${table}" (\n${parts.join(",\n")}\n);`;
    try {
      await neon.query(sql);
      console.log(`✓ Creada ${table}`);
    } catch (e) {
      console.log(`✗ Error creando ${table}: ${e.message.slice(0, 100)}`);
      return;
    }

    // 4. Migrar datos
    const data = await rail.query(`SELECT * FROM "${table}" ORDER BY 1`);
    if (data.rows.length === 0) { console.log(`  ${table}: 0 filas`); continue; }

    const colNames = cols.map(c => c.column_name);
    const ph = colNames.map((_, i) => `$${i + 1}`).join(", ");
    const cl = colNames.map(c => `"${c}"`).join(", ");

    let ok = 0, err = 0;
    for (const row of data.rows) {
      try {
        const vals = colNames.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return null;
          return v;
        });
        await neon.query(`INSERT INTO "${table}" (${cl}) VALUES (${ph}) ON CONFLICT DO NOTHING`, vals);
        ok++;
      } catch (e) {
        if (err < 3) console.log(`  error id=${row.id||row[colNames[0]]}: ${e.message.slice(0, 120)}`);
        err++;
      }
    }
    console.log(`  ${table}: ${ok} insertadas, ${err} errores`);
  }

  // 5. Actualizar secuencias
  console.log("Actualizando secuencias...");
  const seqs = await rail.query(
    `SELECT s.relname as seq, t.relname as tbl, a.attname as col
     FROM pg_class s JOIN pg_depend d ON s.oid = d.objid
     JOIN pg_class t ON d.refobjid = t.oid
     JOIN pg_attribute a ON a.attnum = d.refobjsubid AND a.attrelid = t.oid
     WHERE s.relkind = 'S'`
  );
  for (const s of seqs.rows) {
    try {
      await neon.query(`SELECT setval('"${s.seq}"', (SELECT COALESCE(MAX("${s.col}"), 0) FROM "${s.tbl}"))`);
    } catch (e) { console.log(`  aviso seq ${s.seq}: ${e.message.slice(0, 60)}`); }
  }

  await rail.end();
  await neon.end();
  console.log("Migración completada");
}
main();
