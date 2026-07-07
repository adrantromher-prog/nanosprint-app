import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const error = await requireAdmin();
  if (error) return error;

  try {
    const pollas = await pool.query(
      `SELECT id, activa, hipodromo, costo, premio_1, premio_2, creada_en, cerrada_en
       FROM polla_config ORDER BY id DESC`
    );

    const rows = await Promise.all(pollas.rows.map(async (p) => {
      const tickets = await pool.query(
        `SELECT
           pa.ticket,
           pa.usuario_id,
           COALESCE(pa.cliente_sobrenombre, u.sobrenombre) as sobrenombre,
           pa.cliente_telefono,
           COALESCE(pp.puntos, 0) as puntos,
           COALESCE(pp.premio, 0) as premio,
           COALESCE(pp.pagado, false) as pagado,
           pa.vendido_por IS NOT NULL as vendido_por_taquilla,
           json_agg(
             json_build_object(
               'carrera_orden', pa.carrera_orden,
               'caballo_numero', pa.caballo_numero,
               'puntos', pa.puntos
             ) ORDER BY pa.carrera_orden
           ) as selecciones
         FROM polla_apuestas pa
         JOIN usuarios u ON u.id = pa.usuario_id
         LEFT JOIN polla_puntos pp ON pp.polla_id = $1 AND pp.usuario_id = pa.usuario_id AND pp.ticket = pa.ticket
         WHERE pa.polla_id = $1
         GROUP BY pa.ticket, pa.usuario_id, pa.cliente_sobrenombre, pa.cliente_telefono, u.sobrenombre, pp.puntos, pp.premio, pp.pagado, pa.vendido_por
         ORDER BY pa.ticket ASC`,
        [p.id]
      );

      const carrerasCount = await pool.query(
        `SELECT COUNT(*) as count FROM polla_carreras WHERE polla_id = $1`, [p.id]
      );
      const resultadosCount = await pool.query(
        `SELECT COUNT(*) as count FROM polla_resultados WHERE polla_id = $1`, [p.id]
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
        total_tickets: tickets.rows.length,
        carreras_count: Number(carrerasCount.rows[0].count),
        resultados_count: Number(resultadosCount.rows[0].count),
        tickets: tickets.rows,
      };
    }));

    return NextResponse.json({ ok: true, pollas: rows });
  } catch (error) {
    console.error("Error obteniendo pollas realizadas:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
