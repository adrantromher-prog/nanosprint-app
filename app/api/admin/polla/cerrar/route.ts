import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin(req);
  if (error) return error;
  const client = await pool.connect();
  try {
    const { polla_id, solo_cierre } = await req.json();

    const polla = await client.query(`SELECT id, activa, cerrada_en FROM polla_config WHERE id = $1`, [polla_id]);
    if (polla.rows.length === 0) {
      client.release();
      return NextResponse.json({ ok: false, error: "Polla no encontrada" }, { status: 404 });
    }

    if (solo_cierre) {
      await client.query(`UPDATE polla_config SET activa = false, cerrada_en = NOW() WHERE id = $1`, [polla_id]);
      client.release();
      try { broadcast({ type: "polla_cerrada", polla_id }); } catch {}
      return NextResponse.json({ ok: true, solo_cierre: true });
    }

    const resultados = await client.query(
      `SELECT COUNT(*) as count FROM polla_resultados WHERE polla_id = $1`,
      [polla_id]
    );
    if (Number(resultados.rows[0].count) < 6) {
      client.release();
      return NextResponse.json({ ok: false, error: "Debes registrar resultados de las 6 carreras primero" }, { status: 400 });
    }

    const puntajes = await client.query(
      `SELECT pp.usuario_id, pp.ticket, pp.puntos, u.sobrenombre
       FROM polla_puntos pp
       JOIN usuarios u ON u.id = pp.usuario_id
       WHERE pp.polla_id = $1
       ORDER BY pp.puntos DESC`,
      [polla_id]
    );

    if (puntajes.rows.length === 0) {
      client.release();
      return NextResponse.json({ ok: false, error: "No hay participantes en esta polla" }, { status: 400 });
    }

    const totalRecaudado = puntajes.rows.length * 700;
    const premio1 = Math.round(totalRecaudado * 0.65);
    const premio2 = Math.round(totalRecaudado * 0.20);

    const ordenados = puntajes.rows.map(r => ({ ...r, puntos: Number(r.puntos) }));
    const puntosSet = [...new Set(ordenados.map(p => p.puntos))].sort((a, b) => b - a);

    const grupos: { [key: number]: typeof ordenados } = {};
    for (const p of ordenados) {
      if (!grupos[p.puntos]) grupos[p.puntos] = [];
      grupos[p.puntos].push(p);
    }

    await client.query("BEGIN");

    for (let i = 0; i < Math.min(2, puntosSet.length); i++) {
      const pts = puntosSet[i];
      const grupo = grupos[pts];
      const cant = grupo.length;
      let premioTotal = 0;
      if (i === 0) premioTotal = premio1;
      else premioTotal = premio2;

      const premioIndividual = Math.floor(premioTotal / cant);

      for (const p of grupo) {
        await client.query(
          `UPDATE polla_puntos SET premio = $1 WHERE polla_id = $2 AND usuario_id = $3 AND ticket = $4`,
          [premioIndividual, polla_id, p.usuario_id, p.ticket]
        );

        if (premioIndividual > 0) {
          await client.query(
            `UPDATE usuarios SET saldo = saldo + $1 WHERE id = $2`,
            [premioIndividual, p.usuario_id]
          );
          await client.query(
            `INSERT INTO historial (usuario_id, tipo, monto, asunto)
             VALUES ($1, 'premio_polla', $2, $3)`,
            [p.usuario_id, premioIndividual, `Premio Polla Hípica - ${polla_id}`]
          );
        }

        await client.query(
          `UPDATE polla_puntos SET pagado = true WHERE polla_id = $1 AND usuario_id = $2 AND ticket = $3`,
          [polla_id, p.usuario_id, p.ticket]
        );
      }
    }

    await client.query(
      `UPDATE polla_config SET activa = false, cerrada_en = NOW(), premio_1 = $1, premio_2 = $2 WHERE id = $3`,
      [premio1, premio2, polla_id]
    );

    await client.query("COMMIT");
    client.release();

    try { broadcast({ type: "polla_cerrada", polla_id }); } catch {}

    return NextResponse.json({ ok: true, premio1, premio2, totalParticipantes: ordenados.length });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    try { client.release(); } catch {}
    console.error("Error cerrando polla:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
