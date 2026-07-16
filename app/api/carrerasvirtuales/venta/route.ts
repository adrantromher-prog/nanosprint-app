import { NextResponse } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    const usuarioId = decoded.id;

    const { carrera_id, caballo_numero, monto, cuota, carrera_num } = await req.json();

    if (!carrera_id || !caballo_numero || !monto || !cuota) {
      return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO carrerasvirtuales_tickets (carrera_id, usuario_id, caballo_numero, monto, cuota, ticket)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [carrera_id, usuarioId, caballo_numero, monto, cuota, `CVT-${carrera_num || carrera_id}-${Date.now().toString(36)}`]
    );

    const ticketId = result.rows[0].id;
    const ticketNum = `CVT-${carrera_num || carrera_id}-${ticketId}`;

    await pool.query(`UPDATE carrerasvirtuales_tickets SET ticket = $1 WHERE id = $2`, [ticketNum, ticketId]);

    return NextResponse.json({ ok: true, ticket: { id: ticketId, ticket: ticketNum, caballo_numero, monto, cuota } });
  } catch (e: any) {
    console.error("Error creando ticket virtual:", e);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };

    // Get current race state for winner lookups
    const carreraActual = await pool.query(`SELECT numero_carrera, ganador, estado, ultimos_ganadores FROM carreras_virtuales WHERE id = 1`);
    const currentRace = carreraActual.rows[0] || {};
    const currentNum = currentRace.numero_carrera || 0;
    const currentEstado = currentRace.estado;
    const currentGanador = currentRace.ganador;
    const ultimos: number[] = currentRace.ultimos_ganadores || [];
    // Reverse so most recent is first: ultimosReversed[0] = most recent winner
    const ultimosReversed = [...ultimos].reverse();

    // Filter by today Venezuela time (UTC-4)
    const now = new Date();
    const vetOffset = -4 * 60 * 60 * 1000;
    const vetNow = new Date(now.getTime() + vetOffset);
    const todayVet = new Date(Date.UTC(vetNow.getUTCFullYear(), vetNow.getUTCMonth(), vetNow.getUTCDate()));
    // Convert back to UTC for DB comparison
    const todayStart = new Date(todayVet.getTime() - vetOffset);

    const result = await pool.query(
      `SELECT t.* FROM carrerasvirtuales_tickets t WHERE t.creado_en >= $1 ORDER BY t.id DESC LIMIT 200`,
      [todayStart]
    );

    const tickets = result.rows.map((r: any) => {
      // Determine if this ticket's horse won its race
      let esGanador = false;
      const raceNum = r.carrera_id;
      if (raceNum === currentNum && currentEstado !== "carrera" && currentGanador !== null) {
        // Current race - use direct winner (only shown when not in "carrera" state)
        esGanador = (currentGanador + 1) === r.caballo_numero;
      } else if (raceNum < currentNum) {
        // Past race - look up in ultimos_ganadores
        const idx = currentNum - raceNum - 1;
        if (idx >= 0 && idx < ultimosReversed.length) {
          esGanador = ultimosReversed[idx] === r.caballo_numero;
        }
      }
      return {
      id: r.id,
      carrera_id: r.carrera_id,
      ticket: r.ticket,
      caballo_numero: r.caballo_numero,
      monto: Number(r.monto),
      cuota: Number(r.cuota),
      pagado: r.pagado,
      premio_pagado: Number(r.premio_pagado),
      creado_en: r.creado_en,
      ganador: null,
      es_ganador: esGanador,
      premio: esGanador ? Number(r.monto) * Number(r.cuota) : 0,
    };});

    return NextResponse.json({ ok: true, tickets });
  } catch (e: any) {
    console.error("Error listando tickets virtuales:", e);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
