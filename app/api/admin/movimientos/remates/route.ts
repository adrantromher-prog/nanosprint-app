import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const padNum = (n: unknown): number => Number(n) || 0;

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
      groupBy = "DATE_TRUNC('week', sub.creado_en - INTERVAL '4 hours')";
      label = `TO_CHAR(${groupBy}, 'YYYY-MM-DD') as inicio_semana`;
      limit = "52";
    } else if (filter === "mensual") {
      groupBy = "DATE_TRUNC('month', sub.creado_en - INTERVAL '4 hours')";
      label = `TO_CHAR(${groupBy}, 'YYYY-MM') as mes`;
      limit = "24";
    } else {
      groupBy = "DATE(sub.creado_en - INTERVAL '4 hours')";
      label = "DATE(sub.creado_en - INTERVAL '4 hours') as dia";
      limit = "60";
    }

    const { rows } = await pool.query(`
      SELECT
        ${label},
        ROUND(SUM(sub.max_monto))::numeric as total_pujas,
        ROUND(SUM(sub.max_monto) * 0.20)::numeric as casa,
        ROUND(SUM(sub.max_monto) * 0.05)::numeric as jackpot,
        ROUND(SUM(sub.max_monto) * 0.05)::numeric as referidos,
        ROUND(SUM(sub.max_monto) * 0.15)::numeric as ganancia_casa
      FROM (
        SELECT cr.id as carrera_id, cr.creado_en, cc.id as caballo_id,
          COALESCE(MAX(rp.monto), 0) as max_monto
        FROM carreras_remate cr
        JOIN carreras_caballos cc ON cc.id_carrera = cr.id
        LEFT JOIN remates_pujas rp ON rp.id_caballo = cc.id
        WHERE cr.ganador IS NOT NULL AND cc.retirado = false
        GROUP BY cr.id, cr.creado_en, cc.id
      ) sub
      GROUP BY ${groupBy}
      ORDER BY ${groupBy} DESC
      LIMIT ${limit}
    `);

    return NextResponse.json({ ok: true, data: rows, filter });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ ok: false, data: [] });
  }
}