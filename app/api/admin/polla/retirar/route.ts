import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

async function recalcularPremios(client: any, pollaId: number) {
  const polla = await client.query(
    `SELECT costo FROM polla_config WHERE id = $1`,
    [pollaId]
  );
  const costo = Number(polla.rows[0]?.costo || 700);

  const resultados = await client.query(
    `SELECT COUNT(*) as count FROM polla_resultados WHERE polla_id = $1`,
    [pollaId]
  );
  if (Number(resultados.rows[0].count) < 6) return;

  const puntajes = await client.query(
    `SELECT pp.usuario_id, pp.ticket, pp.puntos
     FROM polla_puntos pp
     WHERE pp.polla_id = $1
     ORDER BY pp.puntos DESC`,
    [pollaId]
  );

  if (puntajes.rows.length === 0) return;

  const previos = await client.query(
    `SELECT usuario_id, ticket, premio FROM polla_puntos WHERE polla_id = $1 AND premio > 0 AND pagado = true`,
    [pollaId]
  );
  for (const p of previos.rows) {
    await client.query(
      `UPDATE usuarios SET saldo = saldo - $1 WHERE id = $2 AND saldo >= $1`,
      [Number(p.premio), p.usuario_id]
    );
    await client.query(
      `UPDATE polla_puntos SET premio = 0, pagado = false WHERE polla_id = $1 AND usuario_id = $2 AND ticket = $3`,
      [pollaId, p.usuario_id, p.ticket]
    );
  }

  const totalRecaudado = puntajes.rows.length * costo;
  const premio1 = Math.round(totalRecaudado * 0.65);
  const premio2 = Math.round(totalRecaudado * 0.20);

  const ordenados = puntajes.rows.map((r: any) => ({ ...r, puntos: Number(r.puntos) }));
  const puntosSet: number[] = (ordenados.map((p: any) => Number(p.puntos)) as number[]).filter((v, i, a) => a.indexOf(v) === i).sort((a: any, b: any) => b - a) as number[];

  const grupos: { [key: number]: typeof ordenados } = {};
  for (const p of ordenados) {
    if (!grupos[p.puntos]) grupos[p.puntos] = [];
    grupos[p.puntos].push(p);
  }

  await client.query(
    `UPDATE polla_config SET premio_1 = $1, premio_2 = $2 WHERE id = $3`,
    [premio1, premio2, pollaId]
  );

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
        [premioIndividual, pollaId, p.usuario_id, p.ticket]
      );

      if (premioIndividual > 0) {
        await client.query(
          `UPDATE usuarios SET saldo = saldo + $1 WHERE id = $2`,
          [premioIndividual, p.usuario_id]
        );
      }

      await client.query(
        `UPDATE polla_puntos SET pagado = true WHERE polla_id = $1 AND usuario_id = $2 AND ticket = $3`,
        [pollaId, p.usuario_id, p.ticket]
      );
    }
  }
}

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;

  const client = await pool.connect();
  try {
    const { polla_id, carrera_orden, caballo_numero } = await req.json();

    if (!polla_id || !carrera_orden || !caballo_numero) {
      client.release();
      return NextResponse.json({ ok: false, error: "Faltan datos: polla_id, carrera_orden, caballo_numero" }, { status: 400 });
    }

    const polla = await client.query(
      `SELECT id, activa, cerrada_en FROM polla_config WHERE id = $1`,
      [polla_id]
    );
    if (polla.rows.length === 0) {
      client.release();
      return NextResponse.json({ ok: false, error: "Polla no encontrada" }, { status: 404 });
    }

    const carrera = await client.query(
      `SELECT id, retirados, cantidad_caballos FROM polla_carreras WHERE polla_id = $1 AND orden = $2`,
      [polla_id, carrera_orden]
    );
    if (carrera.rows.length === 0) {
      client.release();
      return NextResponse.json({ ok: false, error: "Carrera no encontrada" }, { status: 404 });
    }

    const c = carrera.rows[0];
    if (caballo_numero < 1 || caballo_numero > c.cantidad_caballos) {
      client.release();
      return NextResponse.json({ ok: false, error: "Número de caballo inválido" }, { status: 400 });
    }

    const retiradosActuales: number[] = c.retirados || [];
    let nuevosRetirados: number[];

    if (retiradosActuales.includes(caballo_numero)) {
      nuevosRetirados = retiradosActuales.filter(n => n !== caballo_numero);
    } else {
      nuevosRetirados = [...retiradosActuales, caballo_numero].sort((a, b) => a - b);
    }

    await client.query("BEGIN");

    await client.query(
      `UPDATE polla_carreras SET retirados = $1 WHERE id = $2`,
      [nuevosRetirados, c.id]
    );

    const esCerrada = !polla.rows[0].activa || polla.rows[0].cerrada_en;
    const fueRetirado = !retiradosActuales.includes(caballo_numero);

    if (esCerrada && fueRetirado) {
      const apuestas = await client.query(
        `SELECT id, usuario_id, ticket, caballo_numero
         FROM polla_apuestas
         WHERE polla_id = $1 AND carrera_orden = $2 AND caballo_numero = $3`,
        [polla_id, carrera_orden, caballo_numero]
      );

      for (const ap of apuestas.rows) {
        let nuevoNum = Number(ap.caballo_numero) + 1;
        while (nuevosRetirados.includes(nuevoNum) && nuevoNum <= c.cantidad_caballos) {
          nuevoNum++;
        }
        if (nuevoNum > c.cantidad_caballos) continue;

        await client.query(
          `UPDATE polla_apuestas SET caballo_numero = $1 WHERE id = $2`,
          [nuevoNum, ap.id]
        );
      }

      await client.query(
        `UPDATE polla_apuestas SET puntos = 0 WHERE polla_id = $1 AND carrera_orden = $2`,
        [polla_id, carrera_orden]
      );

      const resultRow = await client.query(
        `SELECT primer_lugar, segundo_lugar, tercer_lugar FROM polla_resultados WHERE polla_id = $1 AND carrera_orden = $2`,
        [polla_id, carrera_orden]
      );

      if (resultRow.rows.length > 0) {
        const r = resultRow.rows[0];
        const p1 = Number(r.primer_lugar);
        const p2 = Number(r.segundo_lugar);
        const p3 = Number(r.tercer_lugar);

        const apuestasRecalc = await client.query(
          `SELECT id, caballo_numero FROM polla_apuestas WHERE polla_id = $1 AND carrera_orden = $2`,
          [polla_id, carrera_orden]
        );

        for (const ar of apuestasRecalc.rows) {
          let pts = 0;
          if (Number(ar.caballo_numero) === p1) pts = 5;
          else if (Number(ar.caballo_numero) === p2) pts = 3;
          else if (Number(ar.caballo_numero) === p3) pts = 1;

          if (pts > 0) {
            await client.query(
              `UPDATE polla_apuestas SET puntos = $1 WHERE id = $2`,
              [pts, ar.id]
            );
          }
        }
      }

      const totales = await client.query(
        `SELECT usuario_id, ticket, SUM(puntos) as total_puntos
         FROM polla_apuestas WHERE polla_id = $1
         GROUP BY usuario_id, ticket`,
        [polla_id]
      );

      for (const t of totales.rows) {
        await client.query(
          `INSERT INTO polla_puntos (polla_id, usuario_id, ticket, puntos, premio)
           VALUES ($1, $2, $3, $4, 0)
           ON CONFLICT (polla_id, usuario_id, ticket)
           DO UPDATE SET puntos = EXCLUDED.puntos`,
          [polla_id, t.usuario_id, t.ticket, Number(t.total_puntos)]
        );
      }

      await recalcularPremios(client, polla_id);
    }

    await client.query("COMMIT");
    client.release();

    try { broadcast({ type: "polla_retiros", polla_id, carrera_orden }); } catch {}

    return NextResponse.json({
      ok: true,
      retirados: nuevosRetirados,
      retirado: nuevosRetirados.includes(caballo_numero),
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    try { client.release(); } catch {}
    console.error("Error retirando caballo:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}