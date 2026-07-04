import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const polla = await pool.query(
      `SELECT id, activa, costo, premio_1, premio_2, premio_3, creada_en, cerrada_en
       FROM polla_config WHERE activa = true ORDER BY id DESC LIMIT 1`
    );

    if (polla.rows.length === 0) {
      return NextResponse.json({ ok: true, polla: null });
    }

    const p = polla.rows[0];

    const carreras = await pool.query(
      `SELECT
        pc.id as polla_carrera_id,
        pc.orden,
        pc.carrera_remate_id,
        cr.hipodromo,
        cr.numero_carrera,
        cr.hora_cierre,
        cr.estado,
        cr.ganador,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cc.id,
              'numero', cc.numero,
              'nombre', cc.nombre,
              'retirado', cc.retirado
            ) ORDER BY cc.numero
          ) FILTER (WHERE cc.id IS NOT NULL),
          '[]'::json
        ) as caballos
      FROM polla_carreras pc
      JOIN carreras_remate cr ON cr.id = pc.carrera_remate_id
      LEFT JOIN carreras_caballos cc ON cc.id_carrera = cr.id
      WHERE pc.polla_id = $1
      GROUP BY pc.id, pc.orden, pc.carrera_remate_id, cr.hipodromo, cr.numero_carrera, cr.hora_cierre, cr.estado, cr.ganador
      ORDER BY pc.orden ASC`,
      [p.id]
    );

    const resultados = await pool.query(
      `SELECT cr.orden, cr.carrera_remate_id,
        r.primer_lugar, r.segundo_lugar, r.tercer_lugar
       FROM polla_resultados r
       JOIN polla_carreras cr ON cr.carrera_remate_id = r.carrera_remate_id AND cr.polla_id = r.polla_id
       WHERE r.polla_id = $1
       ORDER BY cr.orden`,
      [p.id]
    );

    return NextResponse.json({
      ok: true,
      polla: {
        id: p.id,
        activa: p.activa,
        costo: Number(p.costo),
        premio_1: Number(p.premio_1),
        premio_2: Number(p.premio_2),
        premio_3: Number(p.premio_3),
        creada_en: p.creada_en,
        cerrada_en: p.cerrada_en,
        carreras: carreras.rows,
        resultados: resultados.rows,
      }
    });
  } catch (error) {
    console.error("Error obteniendo polla activa:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
