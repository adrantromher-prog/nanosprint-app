import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;

  try {
    const { polla_id } = await req.json();
    if (!polla_id) {
      return NextResponse.json({ ok: false, error: "Falta polla_id" }, { status: 400 });
    }

    const polla = await pool.query(`SELECT id FROM polla_config WHERE id = $1`, [polla_id]);
    if (polla.rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Polla no encontrada" }, { status: 404 });
    }

    await pool.query(`DELETE FROM polla_puntos WHERE polla_id = $1`, [polla_id]);
    await pool.query(`DELETE FROM polla_apuestas WHERE polla_id = $1`, [polla_id]);
    await pool.query(`DELETE FROM polla_resultados WHERE polla_id = $1`, [polla_id]);
    await pool.query(`DELETE FROM polla_carreras WHERE polla_id = $1`, [polla_id]);
    await pool.query(`DELETE FROM polla_config WHERE id = $1`, [polla_id]);

    try { broadcast({ type: "polla_eliminada", polla_id }); } catch {}

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error eliminando polla:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
