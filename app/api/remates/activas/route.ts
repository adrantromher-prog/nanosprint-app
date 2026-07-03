import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const carreras = await pool.query(
      `SELECT *, CASE WHEN estado = 'cerrada' OR ganador IS NOT NULL OR hora_cierre::time < NOW()::time THEN 1 ELSE 0 END as orden_estado FROM carreras_remate ORDER BY orden_estado ASC, hora_cierre ASC`
    );

    const resultado = await Promise.all(
      carreras.rows.map(async (carrera: any) => {
        const caballos = await pool.query(
          `SELECT 
            cc.id,
            cc.numero,
            cc.nombre,
            cc.retirado,
            COALESCE(MAX(rp.monto), 0) as puja_actual,
            (SELECT u.sobrenombre FROM remates_pujas rp2
             JOIN usuarios u ON u.id = rp2.id_usuario
             WHERE rp2.id_caballo = cc.id
             ORDER BY rp2.monto DESC
             LIMIT 1
            ) as pujador_sobrenombre
           FROM carreras_caballos cc
           LEFT JOIN remates_pujas rp ON rp.id_caballo = cc.id
           WHERE cc.id_carrera = $1
           GROUP BY cc.id, cc.numero, cc.nombre, cc.retirado
           ORDER BY cc.numero ASC`,
          [carrera.id]
        );

        return {
          ...carrera,
          caballos: caballos.rows.map((c: any) => ({
            ...c,
            puja_actual: Number(c.puja_actual),
          })),
        };
      })
    );

    return NextResponse.json({ ok: true, carreras: resultado });
  } catch (error) {
    console.error("Error trayendo carreras:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}