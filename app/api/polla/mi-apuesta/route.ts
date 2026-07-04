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
      `SELECT carrera_orden, caballo_numero, puntos
       FROM polla_apuestas WHERE polla_id = $1 AND usuario_id = $2
       ORDER BY carrera_orden ASC`,
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
          carrera_orden: r.carrera_orden,
          caballo_numero: r.caballo_numero,
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
