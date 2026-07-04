import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  const client = await pool.connect();
  try {
    const { polla_id, resultados } = await req.json();
    // resultados: [{ carrera_orden, primer_lugar, segundo_lugar, tercer_lugar }]

    const polla = await client.query(`SELECT id, activa FROM polla_config WHERE id = $1`, [polla_id]);
    if (polla.rows.length === 0) {
      client.release();
      return NextResponse.json({ ok: false, error: "Polla no encontrada" }, { status: 404 });
    }

    await client.query("BEGIN");

    for (const r of resultados) {
      const { carrera_orden, primer_lugar, segundo_lugar, tercer_lugar } = r;

      await client.query(
        `INSERT INTO polla_resultados (polla_id, carrera_orden, primer_lugar, segundo_lugar, tercer_lugar)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (polla_id, carrera_orden)
         DO UPDATE SET primer_lugar = EXCLUDED.primer_lugar, segundo_lugar = EXCLUDED.segundo_lugar, tercer_lugar = EXCLUDED.tercer_lugar`,
        [polla_id, carrera_orden, primer_lugar, segundo_lugar, tercer_lugar]
      );

      await client.query(
        `UPDATE polla_apuestas SET puntos = 0 WHERE polla_id = $1 AND carrera_orden = $2`,
        [polla_id, carrera_orden]
      );

      const apuestas = await client.query(
        `SELECT id, usuario_id, caballo_numero FROM polla_apuestas WHERE polla_id = $1 AND carrera_orden = $2`,
        [polla_id, carrera_orden]
      );

      for (const apuesta of apuestas.rows) {
        let puntos = 0;
        if (apuesta.caballo_numero === primer_lugar) puntos = 5;
        else if (apuesta.caballo_numero === segundo_lugar) puntos = 3;
        else if (apuesta.caballo_numero === tercer_lugar) puntos = 1;

        if (puntos > 0) {
          await client.query(
            `UPDATE polla_apuestas SET puntos = $1 WHERE id = $2`,
            [puntos, apuesta.id]
          );
        }
      }
    }

    const totales = await client.query(
      `SELECT usuario_id, SUM(puntos) as total_puntos
       FROM polla_apuestas WHERE polla_id = $1
       GROUP BY usuario_id`,
      [polla_id]
    );

    for (const t of totales.rows) {
      await client.query(
        `INSERT INTO polla_puntos (polla_id, usuario_id, puntos, premio)
         VALUES ($1, $2, $3, 0)
         ON CONFLICT (polla_id, usuario_id)
         DO UPDATE SET puntos = EXCLUDED.puntos`,
        [polla_id, t.usuario_id, Number(t.total_puntos)]
      );
    }

    await client.query("COMMIT");
    client.release();

    try { broadcast({ type: "polla_resultados", polla_id }); } catch {}

    return NextResponse.json({ ok: true });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    try { client.release(); } catch {}
    console.error("Error registrando resultados polla:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
