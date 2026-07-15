import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast, sendToUser } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin(req);
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
    const totalGanador = totalPujas - casa;

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

    // Credit referrers: 5% of each referred user's bid
    // If no referrer, credit the admin as bonus
    const admin = await client.query("SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1");
    const adminId = admin.rows[0]?.id;
    for (const c of caballos.rows) {
      if (!c.id_usuario) continue;
      const ref = await client.query("SELECT referido_por FROM usuarios WHERE id = $1", [c.id_usuario]);
      const comision = Math.round(Number(c.max_monto) * 0.05);
      if (comision <= 0) continue;
      if (ref.rows.length > 0 && ref.rows[0].referido_por) {
        await client.query(
          `UPDATE usuarios SET referido_saldo = COALESCE(referido_saldo, 0) + $1 WHERE id = $2`,
          [comision, ref.rows[0].referido_por]
        );
        await client.query(
          `INSERT INTO historial (usuario_id, tipo, monto, asunto)
           VALUES ($1, 'comision_referido', $2, $3)`,
          [ref.rows[0].referido_por, comision, 'Comisión por referido']
        );
      } else if (adminId) {
        await client.query(
          `UPDATE usuarios SET saldo = saldo + $1 WHERE id = $2`,
          [comision, adminId]
        );
        await client.query(
          `INSERT INTO historial (usuario_id, tipo, monto, asunto)
           VALUES ($1, 'comision_referido', $2, $3)`,
          [adminId, comision, 'Comisión de puja sin referido']
        );
      }
    }

    await client.query(
      `UPDATE carreras_remate SET ganador = $1, estado = 'cerrada' WHERE id = $2`,
      [numero_ganador, carrera_id]
    );

    await client.query(
      `INSERT INTO jackpot_remates (id, monto) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET monto = jackpot_remates.monto + $1`,
      [aporteJackpot]
    );

    await client.query("COMMIT");
    client.release();

    broadcast({ type: "ganador", carrera_id });

    // Send real-time balance updates to winner and admin
    try {
      if (winnerUserId) {
        const resWinner = await pool.query("SELECT saldo FROM usuarios WHERE id = $1", [winnerUserId]);
        if (resWinner.rows[0]) sendToUser(winnerUserId, { type: "balance_updated", saldo: Number(resWinner.rows[0].saldo) });
      }
      if (adminId) {
        const resAdmin = await pool.query("SELECT saldo FROM usuarios WHERE id = $1", [adminId]);
        if (resAdmin.rows[0]) sendToUser(adminId, { type: "balance_updated", saldo: Number(resAdmin.rows[0].saldo) });
      }
    } catch {}

    return NextResponse.json({ ok: true, totalGanador });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Error declarando ganador:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
