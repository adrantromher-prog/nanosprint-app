import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    const usuarioId = decoded.id;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const filtro = searchParams.get("filtro") || "todos";
    const adminUserId = searchParams.get("admin_user_id");

    let targetId = usuarioId;
    if (adminUserId) {
      const { rows } = await pool.query("SELECT rol FROM usuarios WHERE id = $1", [usuarioId]);
      if (rows.length > 0 && rows[0].rol === "admin") {
        targetId = parseInt(adminUserId);
      }
    }

    const conditions: string[] = [];
    if (filtro === "depositos") conditions.push("fuente = 'deposito'");
    else if (filtro === "retiros") conditions.push("fuente = 'retiro'");
    else if (filtro === "apuestas") conditions.push("fuente = 'apuesta'");
    else if (filtro === "pujas") conditions.push("fuente = 'puja'");

    const whereFilter = conditions.length ? `AND (${conditions.join(" OR ")})` : "";

    const query = `
      WITH combined AS (
        SELECT
          'deposito' as fuente, id, monto::numeric, asunto as descripcion, fecha, 'recarga' as subtipo
        FROM historial WHERE usuario_id = $1 AND tipo = 'recarga'
        UNION ALL
        SELECT
          'retiro' as fuente, id, monto::numeric, asunto as descripcion, fecha, 'retiro' as subtipo
        FROM historial WHERE usuario_id = $1 AND tipo = 'retiro'
        UNION ALL
        SELECT
          'apuesta' as fuente, a.id,
          CASE WHEN a.resultado = 'ganó' THEN (a.monto * a.cuota)::numeric ELSE (-a.monto)::numeric END,
          CASE WHEN a.resultado = 'ganó' THEN 'Ganaste apuesta Carrera #' || a.carrera_id || ' - Caballo #' || a.caballo
               WHEN a.resultado = 'perdió' THEN 'Perdiste apuesta Carrera #' || a.carrera_id || ' - Caballo #' || a.caballo
               ELSE 'Apuesta pendiente Carrera #' || a.carrera_id || ' - Caballo #' || a.caballo
          END,
          a.created_at, COALESCE(a.resultado, 'pendiente')
        FROM apuestas a WHERE a.usuario_id = $1
        UNION ALL
        SELECT
          'puja' as fuente, rp.id, (-rp.monto)::numeric,
          'Puja en Remate - Caballo #' || cc.numero,
          rp.fecha, 'puja'
        FROM remates_pujas rp
        JOIN carreras_caballos cc ON cc.id = rp.id_caballo
        WHERE rp.id_usuario = $1
      )
      SELECT * FROM combined
      WHERE 1=1 ${whereFilter}
      ORDER BY fecha DESC
      OFFSET $2 LIMIT $3
    `;

    const countQuery = `
      WITH combined AS (
        SELECT 'deposito' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'recarga'
        UNION ALL
        SELECT 'retiro' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'retiro'
        UNION ALL
        SELECT 'apuesta' as fuente FROM apuestas WHERE usuario_id = $1
        UNION ALL
        SELECT 'puja' as fuente FROM remates_pujas WHERE rp.id_usuario = $1
      )
      SELECT COUNT(*) FROM combined WHERE 1=1 ${whereFilter}
    `;

    const offset = (page - 1) * limit;
    const [res, resCount] = await Promise.all([
      pool.query(query, [targetId, offset, limit]),
      pool.query(countQuery.replace("rp.id_usuario = $1", "id_usuario = $1"), [targetId]),
    ]);

    const total = parseInt(resCount.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    const items = res.rows.map((r: any) => ({
      id: r.id,
      tipo: r.fuente,
      subtipo: r.subtipo,
      monto: Number(r.monto),
      descripcion: r.descripcion,
      fecha: r.fecha,
    }));

    return NextResponse.json({ ok: true, items, total, page, totalPages, limit });
  } catch (err) {
    console.error("Error en /api/historial:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
