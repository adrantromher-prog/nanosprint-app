import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  try {
    const { carrera_ids } = await req.json();

    if (!carrera_ids || carrera_ids.length !== 6) {
      return NextResponse.json({ ok: false, error: "Debes seleccionar exactamente 6 carreras" }, { status: 400 });
    }

    const carreras = await pool.query(
      `SELECT id, hipodromo, numero_carrera FROM carreras_remate WHERE id = ANY($1)`,
      [carrera_ids]
    );
    if (carreras.rows.length !== 6) {
      return NextResponse.json({ ok: false, error: "Alguna(s) carrera(s) no existen" }, { status: 400 });
    }

    await pool.query("BEGIN");

    const result = await pool.query(
      `INSERT INTO polla_config (activa, costo) VALUES (true, 700.00) RETURNING id`
    );
    const pollaId = result.rows[0].id;

    for (let i = 0; i < carrera_ids.length; i++) {
      await pool.query(
        `INSERT INTO polla_carreras (polla_id, carrera_remate_id, orden) VALUES ($1, $2, $3)`,
        [pollaId, carrera_ids[i], i + 1]
      );
    }

    await pool.query("COMMIT");

    broadcast({ type: "polla_creada", polla_id: pollaId });

    return NextResponse.json({ ok: true, polla_id: pollaId });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error creando polla:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
