import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin(req);
  if (error) return error;
  try {
    const { carrera_id } = await req.json();

    // Primero borrar pujas
    await pool.query(
      `DELETE FROM remates_pujas WHERE id_remate = $1`,
      [carrera_id]
    );

    // Luego borrar caballos
    await pool.query(
      `DELETE FROM carreras_caballos WHERE id_carrera = $1`,
      [carrera_id]
    );

    // Finalmente borrar la carrera
    await pool.query(
      `DELETE FROM carreras_remate WHERE id = $1`,
      [carrera_id]
    );

    broadcast({ type: "carrera_eliminada", carrera_id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando carrera:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}