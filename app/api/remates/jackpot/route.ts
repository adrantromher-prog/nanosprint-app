import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await pool.query("SELECT monto FROM jackpot_remates WHERE id = 1");
    const monto = result.rows.length > 0 ? Number(result.rows[0].monto) : 0;
    return NextResponse.json({ ok: true, monto });
  } catch (error) {
    console.error("Error obteniendo jackpot:", error);
    return NextResponse.json({ ok: false, monto: 0 });
  }
}
