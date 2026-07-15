import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const error = await requireAdmin(req);
  if (error) return error;
  try {
    const { rows: diario } = await pool.query(`
      SELECT
        DATE(sub.creado_en - INTERVAL '4 hours') as dia,
        ROUND(SUM(sub.max_monto))::numeric as total_pujas,
        ROUND(SUM(sub.max_monto) * 0.20)::numeric as casa,
        ROUND(SUM(sub.max_monto) * 0.05)::numeric as ganancia_final
      FROM (
        SELECT cr.id as carrera_id, cr.creado_en, cc.id as caballo_id, COALESCE(MAX(rp.monto), 0) as max_monto
        FROM carreras_remate cr
        JOIN carreras_caballos cc ON cc.id_carrera = cr.id
        LEFT JOIN remates_pujas rp ON rp.id_caballo = cc.id
        WHERE cr.ganador IS NOT NULL AND cc.retirado = false
        GROUP BY cr.id, cr.creado_en, cc.id
      ) sub
      GROUP BY DATE(sub.creado_en - INTERVAL '4 hours')
      ORDER BY dia DESC
      LIMIT 60
    `);
    const { rows: mensual } = await pool.query(`
      SELECT
        DATE_TRUNC('month', sub.creado_en - INTERVAL '4 hours') as mes,
        ROUND(SUM(sub.max_monto))::numeric as total_pujas,
        ROUND(SUM(sub.max_monto) * 0.20)::numeric as casa,
        ROUND(SUM(sub.max_monto) * 0.05)::numeric as ganancia_final
      FROM (
        SELECT cr.id as carrera_id, cr.creado_en, cc.id as caballo_id, COALESCE(MAX(rp.monto), 0) as max_monto
        FROM carreras_remate cr
        JOIN carreras_caballos cc ON cc.id_carrera = cr.id
        LEFT JOIN remates_pujas rp ON rp.id_caballo = cc.id
        WHERE cr.ganador IS NOT NULL AND cc.retirado = false
        GROUP BY cr.id, cr.creado_en, cc.id
      ) sub
      GROUP BY DATE_TRUNC('month', sub.creado_en - INTERVAL '4 hours')
      ORDER BY mes DESC
      LIMIT 24
    `);
    return NextResponse.json({ ok: true, diario, mensual });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ ok: false, diario: [], mensual: [] });
  }
}
