import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const error = await requireAdmin();
  if (error) return error;

  try {
    const pollas = await pool.query(
      `SELECT id, activa, hipodromo, costo, premio_1, premio_2, creada_en, cerrada_en, hora_cierre, fecha_cierre
       FROM polla_config ORDER BY id DESC`
    );

    const rows = await Promise.all(pollas.rows.map(async (p) => {
      const apuestas = await pool.query(
        `SELECT COUNT(*) as count FROM (SELECT 1 FROM polla_apuestas WHERE polla_id = $1 GROUP BY usuario_id, ticket) sub`,
        [p.id]
      );
      const carreras = await pool.query(
        `SELECT COUNT(*) as count FROM polla_carreras WHERE polla_id = $1`,
        [p.id]
      );
      const resultados = await pool.query(
        `SELECT COUNT(*) as count FROM polla_resultados WHERE polla_id = $1`,
        [p.id]
      );
      return {
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
        total_tickets: Number(apuestas.rows[0].count),
        carreras_count: Number(carreras.rows[0].count),
        resultados_count: Number(resultados.rows[0].count),
      };
    }));

    return NextResponse.json({ ok: true, pollas: rows });
  } catch (error) {
    console.error("Error listando pollas:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}