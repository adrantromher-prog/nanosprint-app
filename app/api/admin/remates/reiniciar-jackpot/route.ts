import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST() {
  const error = await requireAdmin();
  if (error) return error;
  try {
    await pool.query("UPDATE jackpot_remates SET monto = 0 WHERE id = 1");
    await pool.query("UPDATE usuarios SET puntos = 0");
    broadcast({ type: "jackpot_actualizado", monto: 0 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error reiniciando jackpot:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
