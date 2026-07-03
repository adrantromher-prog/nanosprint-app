import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  try {
    const { usuarioId, tipo, monto, asunto } = await req.json();

    if (!usuarioId || !tipo || !monto || !asunto) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const operacion = tipo === "recarga" ? "+" : "-";

    // Actualizar saldo
    await pool.query(
      `UPDATE usuarios SET saldo = saldo ${operacion} $1 WHERE id = $2`,
      [monto, usuarioId]
    );

    // Registrar en historial
    await pool.query(
      `INSERT INTO historial (usuario_id, tipo, monto, asunto)
       VALUES ($1, $2, $3, $4)`,
      [usuarioId, tipo, monto, asunto]
    );

    return NextResponse.json({ mensaje: "Movimiento registrado" });

  } catch (err) {
    console.error("❌ ERROR EN /api/admin/movimiento:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
