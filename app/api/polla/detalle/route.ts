import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pollaId = searchParams.get("id");
    if (!pollaId) {
      return NextResponse.json({ ok: false, error: "Falta id" }, { status: 400 });
    }

    const polla = await pool.query(
      `SELECT id, activa, hipodromo, costo, premio_1, premio_2, creada_en, cerrada_en, hora_cierre, fecha_cierre,
               CASE WHEN pdf_base64 IS NOT NULL THEN true ELSE false END as pdf_disponible
       FROM polla_config WHERE id = $1`,
      [pollaId]
    );

    if (polla.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Polla no encontrada" }, { status: 404 });
    }

    const p = polla.rows[0];

    const carreras = await pool.query(
      `SELECT id, orden, nombre, cantidad_caballos, numero, retirados
       FROM polla_carreras WHERE polla_id = $1
       ORDER BY orden ASC`,
      [p.id]
    );

    const resultados = await pool.query(
      `SELECT carrera_orden, primer_lugar, segundo_lugar, tercer_lugar
       FROM polla_resultados WHERE polla_id = $1
       ORDER BY carrera_orden`,
      [p.id]
    );

    const totalTickets = await pool.query(
      `SELECT COUNT(*) as count FROM (SELECT 1 FROM polla_apuestas WHERE polla_id = $1 GROUP BY usuario_id, ticket) sub`,
      [p.id]
    );

    return NextResponse.json({
      ok: true,
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
        carreras: carreras.rows,
        resultados: resultados.rows,
        total_tickets: Number(totalTickets.rows[0].count),
      }
    });
  } catch (error) {
    console.error("Error obteniendo detalle de polla:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
