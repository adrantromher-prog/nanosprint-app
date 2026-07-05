import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;

  try {
    const { polla_id, carrera_orden, caballo_numero } = await req.json();

    if (!polla_id || !carrera_orden || !caballo_numero) {
      return NextResponse.json({ ok: false, error: "Faltan datos: polla_id, carrera_orden, caballo_numero" }, { status: 400 });
    }

    const polla = await pool.query(
      `SELECT activa FROM polla_config WHERE id = $1`,
      [polla_id]
    );
    if (polla.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Polla no encontrada" }, { status: 404 });
    }
    if (!polla.rows[0].activa) {
      return NextResponse.json({ ok: false, error: "La polla no está activa" }, { status: 400 });
    }

    const carrera = await pool.query(
      `SELECT id, retirados, cantidad_caballos FROM polla_carreras WHERE polla_id = $1 AND orden = $2`,
      [polla_id, carrera_orden]
    );
    if (carrera.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Carrera no encontrada" }, { status: 404 });
    }

    const c = carrera.rows[0];
    if (caballo_numero < 1 || caballo_numero > c.cantidad_caballos) {
      return NextResponse.json({ ok: false, error: "Número de caballo inválido" }, { status: 400 });
    }

    const retiradosActuales: number[] = c.retirados || [];
    let nuevosRetirados: number[];

    if (retiradosActuales.includes(caballo_numero)) {
      nuevosRetirados = retiradosActuales.filter(n => n !== caballo_numero);
    } else {
      nuevosRetirados = [...retiradosActuales, caballo_numero].sort((a, b) => a - b);
    }

    await pool.query(
      `UPDATE polla_carreras SET retirados = $1 WHERE id = $2`,
      [nuevosRetirados, c.id]
    );

    try { broadcast({ type: "polla_retiros", polla_id, carrera_orden }); } catch {}

    return NextResponse.json({
      ok: true,
      retirados: nuevosRetirados,
      retirado: nuevosRetirados.includes(caballo_numero),
    });
  } catch (error) {
    console.error("Error retirando caballo:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
