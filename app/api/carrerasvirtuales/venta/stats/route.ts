import { NextResponse } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "daily";

    const now = new Date();
    const vetOffset = -4 * 60 * 60 * 1000;
    const vetNow = new Date(now.getTime() + vetOffset);
    
    let startDate: Date;
    if (filter === "weekly") {
      const d = vetNow.getUTCDay();
      const toMon = d === 0 ? 6 : d - 1;
      startDate = new Date(new Date(Date.UTC(vetNow.getUTCFullYear(), vetNow.getUTCMonth(), vetNow.getUTCDate() - toMon)).getTime() - vetOffset);
    } else if (filter === "monthly") {
      startDate = new Date(new Date(Date.UTC(vetNow.getUTCFullYear(), vetNow.getUTCMonth(), 1)).getTime() - vetOffset);
    } else {
      startDate = new Date(new Date(Date.UTC(vetNow.getUTCFullYear(), vetNow.getUTCMonth(), vetNow.getUTCDate())).getTime() - vetOffset);
    }

    // Get current race for winner lookup
    const carreraRes = await pool.query("SELECT numero_carrera, ganador, estado, ultimos_ganadores FROM carreras_virtuales WHERE id = 1");
    const cur = carreraRes.rows[0] || {};
    const ultimos: number[] = cur.ultimos_ganadores || [];
    const ultimosRev = [...ultimos].reverse();

    const result = await pool.query(
      `SELECT * FROM carrerasvirtuales_tickets WHERE creado_en >= $1 ORDER BY id`,
      [startDate]
    );

    let totalVendidos = 0, totalMonto = 0, totalPremios = 0, pendiente = 0;

    for (const t of result.rows) {
      totalVendidos++;
      totalMonto += Number(t.monto);
      if (t.pagado) {
        totalPremios += Number(t.premio_pagado);
      } else {
        // Check if this ticket is a winner
        let esGanador = false;
        const raceNum = t.carrera_id;
        if (raceNum === cur.numero_carrera && cur.estado !== "carrera" && cur.ganador !== null) {
          esGanador = (cur.ganador + 1) === t.caballo_numero;
        } else if (raceNum < cur.numero_carrera) {
          const idx = cur.numero_carrera - raceNum - 1;
          if (idx >= 0 && idx < ultimosRev.length) {
            esGanador = ultimosRev[idx] === t.caballo_numero;
          }
        }
        if (esGanador) {
          pendiente += Number(t.monto) * Number(t.cuota);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      stats: {
        filter,
        total_vendidos: totalVendidos,
        total_monto: totalMonto,
        total_premios: totalPremios,
        pendiente,
        ganancia_casa: totalMonto - totalPremios,
      }
    });
  } catch (e: any) {
    console.error("Error obteniendo estadísticas:", e);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
