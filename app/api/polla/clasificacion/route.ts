import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pollaId = url.searchParams.get("polla_id");

    if (!pollaId) {
      return NextResponse.json({ ok: false, error: "Falta polla_id" }, { status: 400 });
    }

    const tickets = await pool.query(
      `SELECT DISTINCT pa.usuario_id, pa.ticket,
              COALESCE(pa.cliente_sobrenombre, u.sobrenombre) as sobrenombre,
              pa.cliente_telefono
       FROM polla_apuestas pa
       JOIN usuarios u ON u.id = pa.usuario_id
       WHERE pa.polla_id = $1`,
      [pollaId]
    );

    const clasificacion = [];
    for (const t of tickets.rows) {
      const selecciones = await pool.query(
        `SELECT carrera_orden, caballo_numero, puntos
         FROM polla_apuestas
         WHERE polla_id = $1 AND usuario_id = $2 AND ticket = $3
         ORDER BY carrera_orden`,
        [pollaId, t.usuario_id, t.ticket]
      );

      const puntos = await pool.query(
        `SELECT COALESCE(puntos, 0) as puntos, COALESCE(premio, 0) as premio, COALESCE(pagado, false) as pagado
         FROM polla_puntos
         WHERE polla_id = $1 AND usuario_id = $2 AND ticket = $3`,
        [pollaId, t.usuario_id, t.ticket]
      );

      clasificacion.push({
        usuario_id: t.usuario_id,
        ticket: t.ticket,
        sobrenombre: t.sobrenombre,
        cliente_telefono: t.cliente_telefono,
        puntos: Number(puntos.rows[0]?.puntos || 0),
        premio: Number(puntos.rows[0]?.premio || 0),
        pagado: puntos.rows[0]?.pagado || false,
        selecciones: selecciones.rows,
      });
    }

    clasificacion.sort((a, b) => b.puntos - a.puntos || b.premio - a.premio);

    const carreras = await pool.query(
      `SELECT orden, nombre FROM polla_carreras WHERE polla_id = $1 ORDER BY orden`,
      [pollaId]
    );

    const resultados = await pool.query(
      `SELECT carrera_orden, primer_lugar, segundo_lugar, tercer_lugar
       FROM polla_resultados WHERE polla_id = $1
       ORDER BY carrera_orden`,
      [pollaId]
    );

    return NextResponse.json({
      ok: true,
      debug_count: tickets.rows.length,
      clasificacion,
      carreras: carreras.rows,
      resultados: resultados.rows,
    });
  } catch (error) {
    console.error("Error obteniendo clasificacion polla:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
