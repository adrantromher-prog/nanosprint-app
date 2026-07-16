import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const error = await requireAdmin(req);
  if (error) return error;
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "diario";

    let groupBy: string;
    let label: string;
    let limit: string;
    if (filter === "semanal") {
      groupBy = "DATE_TRUNC('week', pa.fecha - INTERVAL '4 hours')";
      label = `TO_CHAR(${groupBy}, 'YYYY-MM-DD') as inicio_semana`;
      limit = "52";
    } else if (filter === "mensual") {
      groupBy = "DATE_TRUNC('month', pa.fecha - INTERVAL '4 hours')";
      label = `TO_CHAR(${groupBy}, 'YYYY-MM') as mes`;
      limit = "24";
    } else {
      groupBy = "DATE(pa.fecha - INTERVAL '4 hours')";
      label = "DATE(pa.fecha - INTERVAL '4 hours') as dia";
      limit = "60";
    }

    const { rows } = await pool.query(`
      SELECT
        ${label},
        COUNT(DISTINCT (pa.polla_id, pa.ticket))::int as total_tickets,
        ROUND(SUM(pc.costo))::numeric as monto_total
      FROM polla_apuestas pa
      JOIN polla_config pc ON pc.id = pa.polla_id
      WHERE pa.vendido_por IS NULL
      GROUP BY ${groupBy}
      ORDER BY ${groupBy} DESC
      LIMIT ${limit}
    `);

    return NextResponse.json({ ok: true, data: rows, filter });
  } catch (error) {
    console.error("Error polla-usuarios:", error);
    return NextResponse.json({ ok: false, data: [] });
  }
}