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

    const participantes = await pool.query(
      `SELECT
        t.ticket,
        t.usuario_id,
        u.sobrenombre,
        COALESCE(pp.puntos, 0) as puntos,
        COALESCE(pp.premio, 0) as premio,
        COALESCE(pp.pagado, false) as pagado,
        COALESCE(
          json_agg(
            json_build_object(
              'carrera_orden', pa.carrera_orden,
              'caballo_numero', pa.caballo_numero,
              'puntos', pa.puntos
            ) ORDER BY pa.carrera_orden
          ) FILTER (WHERE pa.id IS NOT NULL),
          '[]'::json
        ) as selecciones
      FROM (
        SELECT DISTINCT usuario_id, ticket FROM polla_apuestas WHERE polla_id = $1
      ) t
      JOIN usuarios u ON u.id = t.usuario_id
      LEFT JOIN polla_puntos pp ON pp.polla_id = $1 AND pp.usuario_id = t.usuario_id AND pp.ticket = t.ticket
      LEFT JOIN polla_apuestas pa ON pa.polla_id = $1 AND pa.usuario_id = t.usuario_id AND pa.ticket = t.ticket
      GROUP BY t.ticket, t.usuario_id, u.sobrenombre, pp.puntos, pp.premio, pp.pagado
      ORDER BY COALESCE(pp.puntos, 0) DESC, COALESCE(pp.premio, 0) DESC`,
      [pollaId]
    );

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

    return NextResponse.json({ ok: true, clasificacion: participantes.rows, carreras: carreras.rows, resultados: resultados.rows });
  } catch (error) {
    console.error("Error obteniendo clasificacion polla:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
