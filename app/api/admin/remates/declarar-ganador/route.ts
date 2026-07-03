import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

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
    let winnerUserId: number | null = null;
    for (const c of caballos.rows) {
      totalPujas += Number(c.max_monto);
      if (Number(c.caballo_id) === caballoGanadorId) {
        winnerUserId = c.id_usuario;
      }
    }

    const casa = Math.round(totalPujas * 0.20);
    const aporteJackpot = Math.round(casa * 0.25);
    const comisionReferido = Math.round(casa * 0.25);
    const totalGanador = totalPujas - casa;

    let referrerId: number | null = null;
    if (winnerUserId) {
      const ref = await client.query("SELECT referido_por FROM usuarios WHERE id = $1", [winnerUserId]);
      if (ref.rows.length > 0 && ref.rows[0].referido_por) {
        referrerId = ref.rows[0].referido_por;
      }
    }

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

    if (referrerId) {
      await client.query(
        `UPDATE usuarios SET referido_saldo = COALESCE(referido_saldo, 0) + $1 WHERE id = $2`,
        [comisionReferido, referrerId]
      );
      await client.query(
        `INSERT INTO historial (usuario_id, tipo, monto, asunto)
         VALUES ($1, 'comision_referido', $2, $3)`,
        [referrerId, comisionReferido, 'Comisión por referido']
      );
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

    broadcast({ type: "ganador", carrera_id });

    return NextResponse.json({ ok: true, totalGanador, comisionReferido: referrerId ? comisionReferido : 0 });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Error declarando ganador:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
