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
        pp.usuario_id,
        u.sobrenombre,
        pp.puntos,
        pp.premio,
        pp.pagado,
        COALESCE(
          json_agg(
            json_build_object(
              'carrera_remate_id', pa.carrera_remate_id,
              'caballo_id', pa.caballo_id,
              'caballo_numero', cc.numero,
              'caballo_nombre', cc.nombre,
              'puntos', pa.puntos,
              'orden', pc.orden
            ) ORDER BY pc.orden
          ) FILTER (WHERE pa.id IS NOT NULL),
          '[]'::json
        ) as selecciones
      FROM polla_puntos pp
      JOIN usuarios u ON u.id = pp.usuario_id
      LEFT JOIN polla_apuestas pa ON pa.polla_id = pp.polla_id AND pa.usuario_id = pp.usuario_id
      LEFT JOIN carreras_caballos cc ON cc.id = pa.caballo_id
      LEFT JOIN polla_carreras pc ON pc.polla_id = pp.polla_id AND pc.carrera_remate_id = pa.carrera_remate_id
      WHERE pp.polla_id = $1
      GROUP BY pp.usuario_id, u.sobrenombre, pp.puntos, pp.premio, pp.pagado
      ORDER BY pp.puntos DESC, pp.premio DESC`,
      [pollaId]
    );

    return NextResponse.json({ ok: true, clasificacion: participantes.rows });
  } catch (error) {
    console.error("Error obteniendo clasificacion polla:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
