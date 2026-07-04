import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    const usuarioId = decoded.id;

    const polla = await pool.query(
      `SELECT id FROM polla_config WHERE activa = true ORDER BY id DESC LIMIT 1`
    );
    if (polla.rows.length === 0) {
      return NextResponse.json({ ok: true, apuesta: null });
    }

    const apuesta = await pool.query(
      `SELECT pa.carrera_remate_id, pa.caballo_id, pa.puntos, cc.numero as caballo_numero, cc.nombre as caballo_nombre
       FROM polla_apuestas pa
       JOIN carreras_caballos cc ON cc.id = pa.caballo_id
       WHERE pa.polla_id = $1 AND pa.usuario_id = $2
       ORDER BY pa.id ASC`,
      [polla.rows[0].id, usuarioId]
    );

    if (apuesta.rows.length === 0) {
      return NextResponse.json({ ok: true, apuesta: null });
    }

    const totalPuntos = apuesta.rows.reduce((sum, r) => sum + Number(r.puntos), 0);

    return NextResponse.json({
      ok: true,
      apuesta: {
        selecciones: apuesta.rows.map(r => ({
          carrera_remate_id: r.carrera_remate_id,
          caballo_id: r.caballo_id,
          caballo_numero: r.caballo_numero,
          caballo_nombre: r.caballo_nombre,
          puntos: Number(r.puntos),
        })),
        total_puntos: totalPuntos,
      }
    });
  } catch (error) {
    console.error("Error obteniendo mi apuesta:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
