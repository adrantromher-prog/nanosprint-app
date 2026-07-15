import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pollas = await pool.query(
      `SELECT id, activa, hipodromo, costo, premio_1, premio_2, creada_en, cerrada_en
       FROM polla_config ORDER BY id DESC`
    );

    const rows = await Promise.all(pollas.rows.map(async (p: any) => {
      const totalTickets = await pool.query(
        `SELECT COUNT(*) as count FROM (SELECT 1 FROM polla_apuestas WHERE polla_id = $1 GROUP BY usuario_id, ticket) sub`,
        [p.id]
      );

      const clasificacion = await pool.query(
        `SELECT pp.usuario_id, pp.ticket, COALESCE(pp.puntos, 0) as puntos, COALESCE(pp.premio, 0) as premio, u.sobrenombre
         FROM polla_puntos pp
         JOIN usuarios u ON u.id = pp.usuario_id
         WHERE pp.polla_id = $1 AND pp.puntos > 0
         ORDER BY pp.puntos DESC, pp.ticket ASC`,
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
        total_tickets: Number(totalTickets.rows[0].count),
        clasificacion: clasificacion.rows.map((r: any) => ({
          usuario_id: r.usuario_id,
          ticket: r.ticket,
          puntos: Number(r.puntos),
          premio: Number(r.premio),
          sobrenombre: r.sobrenombre,
        })),
      };
    }));

    return NextResponse.json({ ok: true, pollas: rows });
  } catch (error) {
    console.error("Error obteniendo realizadas:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
