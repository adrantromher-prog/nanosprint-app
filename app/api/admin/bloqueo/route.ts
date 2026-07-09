import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const error = await requireAdmin(req);
  if (error) return error;
  try {
    const { usuarioId, bloquear, razon } = await req.json();

    await pool.query(
      `UPDATE usuarios 
       SET bloqueado = $1, razon_bloqueo = $2 
       WHERE id = $3`,
      [bloquear, razon, usuarioId]
    );

    return NextResponse.json({ mensaje: "Estado actualizado" });

  } catch (err) {
    console.error("❌ ERROR EN /api/admin/bloqueo:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
