import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pollaId = searchParams.get("polla_id");
    let query;
    if (pollaId) {
      query = pool.query(
        `SELECT id, activa, hipodromo, costo, premio_1, premio_2, creada_en, cerrada_en, hora_cierre, fecha_cierre,
                CASE WHEN pdf_base64 IS NOT NULL THEN true ELSE false END as pdf_disponible
         FROM polla_config WHERE id = $1`,
        [pollaId]
      );
    } else {
      query = pool.query(
        `SELECT id, activa, hipodromo, costo, premio_1, premio_2, creada_en, cerrada_en, hora_cierre, fecha_cierre,
                CASE WHEN pdf_base64 IS NOT NULL THEN true ELSE false END as pdf_disponible
         FROM polla_config ORDER BY id DESC LIMIT 1`
      );
    }
    const polla = await query;

    if (polla.rows.length === 0) {
      return NextResponse.json({ ok: true, hayPolla: false });
    }

    const p = polla.rows[0];

    const totalParticipantes = await pool.query(
      `SELECT COUNT(*) as count FROM (SELECT 1 FROM polla_apuestas WHERE polla_id = $1 GROUP BY usuario_id, ticket) sub`,
      [p.id]
    );

    const totalCarrerasConResultado = await pool.query(
      `SELECT COUNT(*) as count FROM polla_resultados WHERE polla_id = $1`,
      [p.id]
    );

    const resultadosCompletos = Number(totalCarrerasConResultado.rows[0].count) >= 6;

    return NextResponse.json({
      ok: true,
      hayPolla: true,
      polla: {
        id: p.id,
        activa: p.activa,
        hipodromo: p.hipodromo,
        costo: Number(p.costo),
        premio_1: Number(p.premio_1),
        premio_2: Number(p.premio_2),
        creada_en: p.creada_en,
        cerrada_en: p.cerrada_en,
        hora_cierre: p.hora_cierre,
        fecha_cierre: p.fecha_cierre,
        pdf_disponible: p.pdf_disponible,
        total_participantes: Number(totalParticipantes.rows[0].count),
        resultados_completos: resultadosCompletos,
      }
    });
  } catch (error) {
    console.error("Error obteniendo estado polla:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
