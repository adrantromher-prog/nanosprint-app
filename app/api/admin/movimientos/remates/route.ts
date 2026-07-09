import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const error = await requireAdmin(req);
  if (error) return error;
  try {
    const { rows } = await pool.query(`
      SELECT COALESCE(SUM(sub.max_monto), 0) as total_base
      FROM (
        SELECT cr.id as carrera_id, cc.id as caballo_id, MAX(rp.monto) as max_monto
        FROM carreras_remate cr
        JOIN carreras_caballos cc ON cc.id_carrera = cr.id
        LEFT JOIN remates_pujas rp ON rp.id_caballo = cc.id
        WHERE cr.ganador IS NOT NULL AND cc.retirado = false
        GROUP BY cr.id, cc.id
      ) sub
    `);

    const totalPujas = Number(rows[0].total_base);
    const casa = Math.round(totalPujas * 0.20);
    const aporteJackpot = Math.round(casa * 0.25);
    const comisionReferidos = Math.round(casa * 0.25);
    const gananciaFinal = casa - aporteJackpot - comisionReferidos;

    return NextResponse.json({
      ok: true,
      totalRemates: totalPujas,
      totalPujas,
      casa,
      aporteJackpot,
      comisionReferidos,
      gananciaFinal,
    });
  } catch (error) {
    console.error("Error obteniendo movimientos remates:", error);
    return NextResponse.json({ ok: false, totalRemates: 0, totalPujas: 0, casa: 0, aporteJackpot: 0, gananciaFinal: 0 });
  }
}
