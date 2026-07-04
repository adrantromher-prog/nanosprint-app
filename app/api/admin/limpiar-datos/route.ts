import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST() {
  const error = await requireAdmin();
  if (error) return error;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Remove all data from all tables (keeps schema intact)
    await client.query("TRUNCATE TABLE remates_pujas CASCADE");
    await client.query("TRUNCATE TABLE historial CASCADE");
    await client.query("TRUNCATE TABLE carreras_caballos CASCADE");
    await client.query("TRUNCATE TABLE carreras_remate CASCADE");
    await client.query("TRUNCATE TABLE jackpot_remates CASCADE");

    // Reset usuarios: keep users but clear game-related fields
    await client.query(
      `UPDATE usuarios SET saldo = 0, puntos = 0, referido_saldo = 0`
    );

    // Re-insert jackpot row
    await client.query(
      `INSERT INTO jackpot_remates (id, monto) VALUES (1, 0) ON CONFLICT (id) DO UPDATE SET monto = 0`
    );

    await client.query("COMMIT");
    client.release();

    return NextResponse.json({ ok: true, mensaje: "Todos los datos han sido eliminados" });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Error limpiando datos:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
