import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    const usuarioId = decoded.id;

    const { searchParams } = new URL(req.url);
    const pollaId = searchParams.get("polla_id");

    if (!pollaId) {
      return NextResponse.json({ ok: true, apuesta: null });
    }

    const apuestas = await pool.query(
      `SELECT ticket, carrera_orden, caballo_numero, puntos
       FROM polla_apuestas WHERE polla_id = $1 AND usuario_id = $2
       ORDER BY ticket ASC, carrera_orden ASC`,
       [pollaId, usuarioId]
    );

    if (apuestas.rows.length === 0) {
      return NextResponse.json({ ok: true, apuesta: null });
    }

    const tickets: any[] = [];
    const map: { [ticket: number]: any } = {};
    for (const r of apuestas.rows) {
      if (!map[r.ticket]) {
        map[r.ticket] = { ticket: r.ticket, selecciones: [], total_puntos: 0 };
        tickets.push(map[r.ticket]);
      }
      map[r.ticket].selecciones.push({
        carrera_orden: r.carrera_orden,
        caballo_numero: r.caballo_numero,
        puntos: Number(r.puntos),
      });
      map[r.ticket].total_puntos += Number(r.puntos);
    }

    return NextResponse.json({
      ok: true,
      apuesta: tickets.length > 0 ? tickets : null,
    });
  } catch (error) {
    console.error("Error obteniendo mi apuesta:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
