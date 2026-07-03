import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  try {
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
    await pool.query(`
      ALTER TABLE carreras_remate ADD COLUMN IF NOT EXISTS imagen TEXT
    `);

    const body = await req.json();
    const { hipodromo, numeroCarrera, horaCierre, tipoCarrera, caballos, imagen } = body;

    if (!horaCierre || horaCierre.trim() === "") {
      return NextResponse.json({ ok: false, error: "La hora de cierre es obligatoria" }, { status: 400 });
    }
    if (!hipodromo || hipodromo.trim() === "") {
      return NextResponse.json({ ok: false, error: "El hipódromo es obligatorio" }, { status: 400 });
    }
    if (!caballos || caballos.length === 0 || caballos.some((c: string) => !c.trim())) {
      return NextResponse.json({ ok: false, error: "Debes ingresar al menos un caballo con nombre" }, { status: 400 });
    }

    // 1. Insertar la carrera
    const resultado = await pool.query(
      `INSERT INTO carreras_remate (hipodromo, numero_carrera, hora_cierre, tipo, estado, imagen)
       VALUES ($1, $2, $3, $4, 'abierta', $5)
       RETURNING id`,
      [hipodromo, numeroCarrera, horaCierre, tipoCarrera, imagen || null]
    );

    const carreraId = resultado.rows[0].id;

    // 2. Insertar cada caballo
    for (let i = 0; i < caballos.length; i++) {
      await pool.query(
        `INSERT INTO carreras_caballos (id_carrera, numero, nombre, retirado)
         VALUES ($1, $2, $3, false)`,
        [carreraId, i + 1, caballos[i]]
      );
    }

    return NextResponse.json({ ok: true, carreraId });
  } catch (error) {
    console.error("Error creando carrera:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}