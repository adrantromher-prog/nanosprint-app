import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

function calcPtsPorCaballo(primeros: number[], segundos: number[], terceros: number[], caballo: number) {
  if (primeros.includes(caballo)) {
    if (primeros.length === 1) return 5;
    const pool = 5 + (primeros.length >= 2 ? 3 : 0) + (primeros.length >= 3 ? 1 : 0);
    return Math.floor(pool / primeros.length);
  }
  if (primeros.length > 1) {
    if (segundos.includes(caballo)) return 1;
    return 0;
  }
  if (segundos.includes(caballo)) {
    if (segundos.length === 1) return 3;
    return Math.floor((3 + 1) / segundos.length);
  }
  if (segundos.length > 0) return 0;
  if (terceros.includes(caballo)) return 1;
  return 0;
}

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  const client = await pool.connect();
  try {
    const { polla_id, resultados } = await req.json();
    // resultados: [{ carrera_orden, primeros: number[], segundos: number[], terceros: number[] }]

    const polla = await client.query(`SELECT id, activa FROM polla_config WHERE id = $1`, [polla_id]);
    if (polla.rows.length === 0) {
      client.release();
      return NextResponse.json({ ok: false, error: "Polla no encontrada" }, { status: 404 });
    }

    await client.query("BEGIN");

    for (const r of resultados) {
      const { carrera_orden, primeros, segundos, terceros } = r;
      const primerosArr = (primeros || []).map(Number).filter((n: number) => n > 0);
      const segundosArr = (segundos || []).map(Number).filter((n: number) => n > 0);
      const tercerosArr = (terceros || []).map(Number).filter((n: number) => n > 0);

      await client.query(
        `INSERT INTO polla_resultados (polla_id, carrera_orden, primer_lugar, segundo_lugar, tercer_lugar)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (polla_id, carrera_orden)
         DO UPDATE SET primer_lugar = EXCLUDED.primer_lugar, segundo_lugar = EXCLUDED.segundo_lugar, tercer_lugar = EXCLUDED.tercer_lugar`,
        [polla_id, carrera_orden, primerosArr, segundosArr, tercerosArr]
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
        const pts = calcPtsPorCaballo(primerosArr, segundosArr, tercerosArr, Number(apuesta.caballo_numero));
        if (pts > 0) {
          await client.query(
            `UPDATE polla_apuestas SET puntos = $1 WHERE id = $2`,
            [pts, apuesta.id]
          );
        }
      }
    }

    const totales = await client.query(
      `SELECT usuario_id, ticket, SUM(puntos) as total_puntos
       FROM polla_apuestas WHERE polla_id = $1
       GROUP BY usuario_id, ticket`,
      [polla_id]
    );

    for (const t of totales.rows) {
      await client.query(
        `INSERT INTO polla_puntos (polla_id, usuario_id, ticket, puntos, premio)
         VALUES ($1, $2, $3, $4, 0)
         ON CONFLICT (polla_id, usuario_id, ticket)
         DO UPDATE SET puntos = EXCLUDED.puntos`,
        [polla_id, t.usuario_id, t.ticket, Number(t.total_puntos)]
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