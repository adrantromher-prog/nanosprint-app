import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sendToUser } from "@/lib/ws";

export async function POST(req: Request) {
  const userOrError = await requireUser(req);
  if (userOrError instanceof NextResponse) return userOrError;
  const { id: userId } = userOrError;

  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT referido_saldo FROM usuarios WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      client.release();
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const referidoSaldo = Number(result.rows[0].referido_saldo || 0);

    if (referidoSaldo < 2500) {
      client.release();
      return NextResponse.json({ error: `Mínimo Bs. 2.500 para liberar (tienes Bs. ${referidoSaldo.toFixed(2)})` }, { status: 400 });
    }

    await client.query("BEGIN");

    await client.query(
      `UPDATE usuarios SET saldo = saldo + $1, referido_saldo = 0 WHERE id = $2`,
      [referidoSaldo, userId]
    );

    await client.query(
      `INSERT INTO historial (usuario_id, tipo, monto, asunto)
       VALUES ($1, 'liberacion_referido', $2, $3)`,
      [userId, referidoSaldo, 'Liberación de saldo de referidos']
    );

    await client.query("COMMIT");
    client.release();

    try {
      const resSaldo = await pool.query("SELECT saldo FROM usuarios WHERE id = $1", [userId]);
      if (resSaldo.rows[0]) sendToUser(userId, { type: "balance_updated", saldo: Number(resSaldo.rows[0].saldo) });
    } catch {}

    return NextResponse.json({ ok: true, monto: referidoSaldo });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Error liberando referidos:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
