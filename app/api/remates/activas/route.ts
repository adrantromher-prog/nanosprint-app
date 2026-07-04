import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        cr.id, cr.hipodromo, cr.numero_carrera, cr.hora_cierre, cr.tipo, cr.estado, cr.ganador, cr.imagen,
        CASE WHEN cr.estado = 'cerrada' OR cr.ganador IS NOT NULL OR cr.hora_cierre::time < NOW()::time THEN 1 ELSE 0 END as orden_estado,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cc.id,
              'numero', cc.numero,
              'nombre', cc.nombre,
              'retirado', cc.retirado,
              'puja_actual', cc.puja_actual,
              'pujador_sobrenombre', cc.pujador_sobrenombre
            ) ORDER BY cc.numero
          ) FILTER (WHERE cc.id IS NOT NULL),
          '[]'::json
        ) as caballos
      FROM carreras_remate cr
      LEFT JOIN (
        SELECT
          cc2.id, cc2.numero, cc2.nombre, cc2.retirado, cc2.id_carrera,
          COALESCE(MAX(rp.monto), 0) as puja_actual,
          (SELECT u.sobrenombre FROM remates_pujas rp2
           JOIN usuarios u ON u.id = rp2.id_usuario
           WHERE rp2.id_caballo = cc2.id
           ORDER BY rp2.monto DESC LIMIT 1
          ) as pujador_sobrenombre
        FROM carreras_caballos cc2
        LEFT JOIN remates_pujas rp ON rp.id_caballo = cc2.id
        GROUP BY cc2.id, cc2.numero, cc2.nombre, cc2.retirado, cc2.id_carrera
      ) cc ON cc.id_carrera = cr.id
      GROUP BY cr.id, cr.hipodromo, cr.numero_carrera, cr.hora_cierre, cr.tipo, cr.estado, cr.ganador, cr.imagen
      ORDER BY orden_estado ASC, cr.hora_cierre ASC
    `);

    return NextResponse.json({ ok: true, carreras: result.rows });
  } catch (error) {
    console.error("Error trayendo carreras:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
