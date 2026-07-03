import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  const client = await pool.connect();
  try {
    const { carrera_id, numero_ganador } = await req.json();

    const caballoGanador = await client.query(
      `SELECT id FROM carreras_caballos WHERE id_carrera = $1 AND numero = $2 AND retirado = false`,
      [carrera_id, numero_ganador]
    );

    if (caballoGanador.rows.length === 0) {
      client.release();
      return NextResponse.json({ ok: false, error: "Caballo ganador no encontrado o está retirado" }, { status: 400 });
    }

    const caballoGanadorId = caballoGanador.rows[0].id;

    const caballos = await client.query(
      `SELECT
        cc.id as caballo_id,
        COALESCE(MAX(rp.monto), 0) as max_monto,
        (SELECT rp2.id_usuario FROM remates_pujas rp2 WHERE rp2.id_caballo = cc.id ORDER BY rp2.monto DESC LIMIT 1) as id_usuario
       FROM carreras_caballos cc
       LEFT JOIN remates_pujas rp ON rp.id_caballo = cc.id
       WHERE cc.id_carrera = $1 AND cc.retirado = false
       GROUP BY cc.id`,
      [carrera_id]
    );

    let totalPujas = 0;
    for (const c of caballos.rows) {
      totalPujas += Number(c.max_monto);
    }

    const casa = Math.round(totalPujas * 0.15);
    const aporteJackpot = Math.round(casa * 0.3);
    const totalGanador = totalPujas - casa;

    await client.query(`
      CREATE TABLE IF NOT EXISTS historial (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        monto NUMERIC(12,2) NOT NULL,
        asunto TEXT,
        fecha TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query("BEGIN");

    for (const c of caballos.rows) {
      if (!c.id_usuario) continue;

      if (Number(c.caballo_id) === caballoGanadorId) {
        await client.query(
          `UPDATE usuarios SET saldo = saldo + $1, puntos = puntos + 1 WHERE id = $2`,
          [totalGanador, c.id_usuario]
        );
        await client.query(
          `INSERT INTO historial (usuario_id, tipo, monto, asunto)
           VALUES ($1, 'premio_remate', $2, $3)`,
          [c.id_usuario, totalGanador, 'Premio por ganar remate']
        );
      }
    }

    await client.query(
      `UPDATE carreras_remate SET ganador = $1, estado = 'cerrada' WHERE id = $2`,
      [numero_ganador, carrera_id]
    );

    await client.query(
      `UPDATE jackpot_remates SET monto = monto + $1 WHERE id = 1`,
      [aporteJackpot]
    );

    await client.query("COMMIT");
    client.release();

    return NextResponse.json({ ok: true, totalGanador });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Error declarando ganador:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}