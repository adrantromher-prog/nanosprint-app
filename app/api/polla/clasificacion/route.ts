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
        pp.ticket,
        pp.usuario_id,
        u.sobrenombre,
        pp.puntos,
        pp.premio,
        pp.pagado,
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
      FROM polla_puntos pp
      JOIN usuarios u ON u.id = pp.usuario_id
      LEFT JOIN polla_apuestas pa ON pa.polla_id = pp.polla_id AND pa.usuario_id = pp.usuario_id AND pa.ticket = pp.ticket
      WHERE pp.polla_id = $1
      GROUP BY pp.ticket, pp.usuario_id, u.sobrenombre, pp.puntos, pp.premio, pp.pagado
      ORDER BY pp.puntos DESC, pp.premio DESC`,
      [pollaId]
    );

    return NextResponse.json({ ok: true, clasificacion: participantes.rows });
  } catch (error) {
    console.error("Error obteniendo clasificacion polla:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
