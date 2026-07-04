import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  try {
    const { polla_id, carrera_remate_id, primer_lugar, segundo_lugar, tercer_lugar } = await req.json();

    const polla = await pool.query(`SELECT id, activa FROM polla_config WHERE id = $1`, [polla_id]);
    if (polla.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Polla no encontrada" }, { status: 404 });
    }

    await pool.query("BEGIN");

    await pool.query(
      `INSERT INTO polla_resultados (polla_id, carrera_remate_id, primer_lugar, segundo_lugar, tercer_lugar)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (polla_id, carrera_remate_id)
       DO UPDATE SET primer_lugar = EXCLUDED.primer_lugar, segundo_lugar = EXCLUDED.segundo_lugar, tercer_lugar = EXCLUDED.tercer_lugar`,
      [polla_id, carrera_remate_id, primer_lugar, segundo_lugar, tercer_lugar]
    );

    await pool.query(
      `UPDATE polla_apuestas SET puntos = 0 WHERE polla_id = $1 AND carrera_remate_id = $2`,
      [polla_id, carrera_remate_id]
    );

    const apuestas = await pool.query(
      `SELECT id, usuario_id, caballo_id FROM polla_apuestas WHERE polla_id = $1 AND carrera_remate_id = $2`,
      [polla_id, carrera_remate_id]
    );

    for (const apuesta of apuestas.rows) {
      let puntos = 0;
      if (apuesta.caballo_id === primer_lugar) puntos = 5;
      else if (apuesta.caballo_id === segundo_lugar) puntos = 3;
      else if (apuesta.caballo_id === tercer_lugar) puntos = 1;

      if (puntos > 0) {
        await pool.query(
          `UPDATE polla_apuestas SET puntos = $1 WHERE id = $2`,
          [puntos, apuesta.id]
        );
      }
    }

    const totales = await pool.query(
      `SELECT usuario_id, SUM(puntos) as total_puntos
       FROM polla_apuestas WHERE polla_id = $1
       GROUP BY usuario_id`,
      [polla_id]
    );

    for (const t of totales.rows) {
      await pool.query(
        `INSERT INTO polla_puntos (polla_id, usuario_id, puntos, premio)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (polla_id, usuario_id)
         DO UPDATE SET puntos = EXCLUDED.puntos`,
        [polla_id, t.usuario_id, Number(t.total_puntos)]
      );
    }

    await pool.query("COMMIT");

    broadcast({ type: "polla_resultados", polla_id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await pool.query("ROLLBACK");
    console.error("Error registrando resultados polla:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
