import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  const client = await pool.connect();
  try {
    const { caballo_id } = await req.json();

    const ultimaPuja = await client.query(
      `SELECT id_usuario, monto FROM remates_pujas WHERE id_caballo = $1 ORDER BY monto DESC LIMIT 1`,
      [caballo_id]
    );

    await client.query("BEGIN");

    if (ultimaPuja.rows[0]) {
      await client.query(
        `UPDATE usuarios SET saldo = saldo + $1 WHERE id = $2`,
        [ultimaPuja.rows[0].monto, ultimaPuja.rows[0].id_usuario]
      );
      await client.query(
        `INSERT INTO historial (usuario_id, tipo, monto, asunto)
         VALUES ($1, 'reembolso_puja', $2, $3)`,
        [ultimaPuja.rows[0].id_usuario, ultimaPuja.rows[0].monto, 'Reembolso de puja - Caballo retirado']
      );
    }

    await client.query(
      `UPDATE carreras_caballos SET retirado = true WHERE id = $1`,
      [caballo_id]
    );

    await client.query("COMMIT");
    client.release();

    broadcast({ type: "caballo_retirado", caballo_id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Error retirando caballo:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}