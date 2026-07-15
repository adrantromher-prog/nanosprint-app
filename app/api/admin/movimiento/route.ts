import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast, sendToUser } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin(req);
  if (error) return error;
  try {
    const { usuarioId, tipo, monto, asunto } = await req.json();

    if (!usuarioId) return NextResponse.json({ error: "Falta usuarioId" }, { status: 400 });
    if (!tipo) return NextResponse.json({ error: "Falta tipo" }, { status: 400 });
    if (!monto || monto <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    if (!asunto) return NextResponse.json({ error: "Falta asunto" }, { status: 400 });

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

    broadcast({ type: "movimiento", usuario_id: usuarioId, monto });

    // Send real-time balance update to the affected user
    try {
      const resSaldo = await pool.query("SELECT saldo FROM usuarios WHERE id = $1", [usuarioId]);
      if (resSaldo.rows[0]) {
        sendToUser(usuarioId, { type: "balance_updated", saldo: Number(resSaldo.rows[0].saldo) });
      }
    } catch {}

    return NextResponse.json({ mensaje: "Movimiento registrado" });

  } catch (err) {
    console.error("❌ ERROR EN /api/admin/movimiento:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
