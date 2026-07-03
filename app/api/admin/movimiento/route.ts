import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  try {
    const { usuarioId, tipo, monto, asunto } = await req.json();

    if (!usuarioId) return NextResponse.json({ error: "Falta usuarioId" }, { status: 400 });
    if (!tipo) return NextResponse.json({ error: "Falta tipo" }, { status: 400 });
    if (!monto || monto <= 0) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
    if (!asunto) return NextResponse.json({ error: "Falta asunto" }, { status: 400 });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS historial (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        monto NUMERIC(12,2) NOT NULL,
        asunto TEXT,
        fecha TIMESTAMP DEFAULT NOW()
      )
    `);

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

    return NextResponse.json({ mensaje: "Movimiento registrado" });

  } catch (err) {
    console.error("❌ ERROR EN /api/admin/movimiento:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
