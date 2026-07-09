import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin(req);
  if (error) return error;
  try {
    const { carrera_id } = await req.json();

    await pool.query(
      `UPDATE carreras_remate SET estado = 'cerrada' WHERE id = $1`,
      [carrera_id]
    );

    broadcast({ type: "carrera_cerrada", carrera_id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error cerrando carrera:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}