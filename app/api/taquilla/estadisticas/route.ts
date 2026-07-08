import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; rol: string };
    if (decoded.rol !== "taquilla") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const tickets = await pool.query(
      `SELECT pa.polla_id, pa.ticket, pc.costo
       FROM polla_apuestas pa
       JOIN polla_config pc ON pc.id = pa.polla_id
       WHERE pa.vendido_por = $1
       GROUP BY pa.polla_id, pa.ticket, pc.costo`,
      [decoded.id]
    );

    const userData = await pool.query(
      `SELECT COALESCE(comision, 10) as comision FROM usuarios WHERE id = $1`,
      [decoded.id]
    );
    const pct = Number(userData.rows[0]?.comision) || 10;

    let ventas = 0;
    for (const t of tickets.rows) {
      ventas += Number(t.costo);
    }

    const comision = Math.floor(ventas * pct / 100);
    const totalAdmin = ventas - comision;

    const premiosRecibidos = await pool.query(
      `SELECT COALESCE(SUM(premio), 0) as total_premios
       FROM polla_puntos
       WHERE usuario_id = $1 AND pagado = true`,
      [decoded.id]
    );

    const premiosPagados = await pool.query(
      `SELECT COALESCE(SUM(premio), 0) as total_pagados
       FROM polla_puntos
       WHERE usuario_id = $1 AND pagado_al_cliente = true`,
      [decoded.id]
    );

    const pendientesPago = await pool.query(
      `SELECT pp.id, pp.polla_id, pp.ticket, pp.premio, pc.hipodromo, pp.usuario_id
       FROM polla_puntos pp
       JOIN polla_config pc ON pc.id = pp.polla_id
       WHERE pp.usuario_id = $1 AND pp.pagado = true AND pp.pagado_al_cliente = false AND pp.premio > 0`,
      [decoded.id]
    );

    return NextResponse.json({
      ok: true,
      ventas,
      comision,
      comision_pct: pct,
      totalAdmin,
      premios_recibidos: Number(premiosRecibidos.rows[0].total_premios),
      premios_pagados: Number(premiosPagados.rows[0].total_premios),
      pendientes_pago: pendientesPago.rows,
    });
  } catch (error) {
    console.error("Error estadisticas taquilla:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
