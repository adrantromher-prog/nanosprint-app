import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const carreraId = parseInt(id, 10);
    if (isNaN(carreraId)) {
      return NextResponse.json({ ok: false, error: "ID inválido" }, { status: 400 });
    }

    const carrera = await pool.query(
      `SELECT * FROM carreras_remate WHERE id = $1`,
      [carreraId]
    );

    if (carrera.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Carrera no encontrada" }, { status: 404 });
    }

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
      [carreraId]
    );

    const resultado = {
      ...carrera.rows[0],
      caballos: caballos.rows.map((c: any) => ({
        ...c,
        puja_actual: Number(c.puja_actual),
      })),
    };

    return NextResponse.json({ ok: true, carrera: resultado });
  } catch (error) {
    console.error("Error trayendo carrera:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
