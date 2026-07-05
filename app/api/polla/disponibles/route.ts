import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pollas = await pool.query(
      `SELECT id, activa, hipodromo, costo, premio_1, premio_2, hora_cierre, creada_en
       FROM polla_config ORDER BY id DESC`
    );

    const resultados = await Promise.all(
      pollas.rows.map(async (p: any) => {
        const totalTickets = await pool.query(
          `SELECT COUNT(*) as count FROM (SELECT 1 FROM polla_apuestas WHERE polla_id = $1 GROUP BY usuario_id, ticket) sub`,
          [p.id]
        );
        return {
          id: p.id,
          activa: p.activa,
          hipodromo: p.hipodromo,
          costo: Number(p.costo),
          premio_1: Number(p.premio_1),
          premio_2: Number(p.premio_2),
          hora_cierre: p.hora_cierre,
          creada_en: p.creada_en,
          total_tickets: Number(totalTickets.rows[0].count),
        };
      })
    );

    return NextResponse.json({ ok: true, pollas: resultados });
  } catch (error) {
    console.error("Error obteniendo pollas disponibles:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
