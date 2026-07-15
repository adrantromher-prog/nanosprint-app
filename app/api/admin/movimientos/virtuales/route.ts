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
        DATE(fecha - INTERVAL '4 hours') as dia,
        COUNT(*) as total_apuestas,
        SUM(monto) as monto_apostado,
        SUM(CASE WHEN resultado = 'gano' THEN monto * cuota ELSE 0 END) as premios_pagados,
        SUM(CASE WHEN resultado = 'perdio' THEN monto WHEN resultado = 'gano' THEN -monto * (cuota - 1) ELSE 0 END) as ganancia_casa
      FROM apuestas
      WHERE resultado IS NOT NULL AND resultado != 'pendiente'
      GROUP BY DATE(fecha - INTERVAL '4 hours')
      ORDER BY dia DESC
      LIMIT 60
    `);
    const { rows: mensual } = await pool.query(`
      SELECT 
        DATE_TRUNC('month', fecha - INTERVAL '4 hours') as mes,
        COUNT(*) as total_apuestas,
        SUM(monto) as monto_apostado,
        SUM(CASE WHEN resultado = 'gano' THEN monto * cuota ELSE 0 END) as premios_pagados,
        SUM(CASE WHEN resultado = 'perdio' THEN monto WHEN resultado = 'gano' THEN -monto * (cuota - 1) ELSE 0 END) as ganancia_casa
      FROM apuestas
      WHERE resultado IS NOT NULL AND resultado != 'pendiente'
      GROUP BY DATE_TRUNC('month', fecha - INTERVAL '4 hours')
      ORDER BY mes DESC
      LIMIT 24
    `);
    return NextResponse.json({ ok: true, diario, mensual });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
