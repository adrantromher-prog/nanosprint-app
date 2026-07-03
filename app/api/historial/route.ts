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

    const partitions: string[] = [];
    const countPartitions: string[] = [];

    partitions.push(`
      SELECT 'deposito' as fuente, id, monto::numeric, asunto as descripcion, fecha, 'recarga' as subtipo
      FROM historial WHERE usuario_id = $1 AND tipo = 'recarga'
    `);
    countPartitions.push(`SELECT 'deposito' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'recarga'`);

    partitions.push(`
      SELECT 'retiro' as fuente, id, monto::numeric, asunto as descripcion, fecha, 'retiro' as subtipo
      FROM historial WHERE usuario_id = $1 AND tipo = 'retiro'
    `);
    countPartitions.push(`SELECT 'retiro' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'retiro'`);

    partitions.push(`
      SELECT 'puja' as fuente, rp.id, (-rp.monto)::numeric,
        'Puja en Remate - Caballo #' || cc.numero, rp.fecha, 'puja'
      FROM remates_pujas rp
      JOIN carreras_caballos cc ON cc.id = rp.id_caballo
      WHERE rp.id_usuario = $1
    `);
    countPartitions.push(`SELECT 'puja' as fuente FROM remates_pujas WHERE id_usuario = $1`);

    partitions.push(`
      SELECT 'reembolso' as fuente, id, monto::numeric, asunto, fecha, 'reembolso'
      FROM historial WHERE usuario_id = $1 AND tipo = 'reembolso_puja'
    `);
    countPartitions.push(`SELECT 'reembolso' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'reembolso_puja'`);

    partitions.push(`
      SELECT 'premio' as fuente, id, monto::numeric, asunto, fecha, 'premio'
      FROM historial WHERE usuario_id = $1 AND tipo = 'premio_remate'
    `);
    countPartitions.push(`SELECT 'premio' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'premio_remate'`);

    partitions.push(`
      SELECT 'comision_referido' as fuente, id, monto::numeric, asunto, fecha, 'comision_referido'
      FROM historial WHERE usuario_id = $1 AND tipo = 'comision_referido'
    `);
    countPartitions.push(`SELECT 'comision_referido' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'comision_referido'`);

    partitions.push(`
      SELECT 'liberacion_referido' as fuente, id, monto::numeric, asunto, fecha, 'liberacion_referido'
      FROM historial WHERE usuario_id = $1 AND tipo = 'liberacion_referido'
    `);
    countPartitions.push(`SELECT 'liberacion_referido' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'liberacion_referido'`);

    const { rows: [tablaApuestas] } = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'apuestas') as existe"
    );
    if (tablaApuestas.existe) {
      partitions.push(`
        SELECT 'apuesta' as fuente, a.id,
          CASE WHEN a.resultado = 'ganó' THEN (a.monto * a.cuota)::numeric ELSE (-a.monto)::numeric END,
          CASE WHEN a.resultado = 'ganó' THEN 'Ganaste apuesta Carrera #' || a.carrera_id || ' - Caballo #' || a.caballo
               WHEN a.resultado = 'perdió' THEN 'Perdiste apuesta Carrera #' || a.carrera_id || ' - Caballo #' || a.caballo
               ELSE 'Apuesta pendiente Carrera #' || a.carrera_id || ' - Caballo #' || a.caballo
          END,
          a.created_at, COALESCE(a.resultado, 'pendiente')
        FROM apuestas a WHERE a.usuario_id = $1
      `);
      countPartitions.push(`SELECT 'apuesta' as fuente FROM apuestas WHERE usuario_id = $1`);
    }

    const combined = partitions.join(" UNION ALL ");
    const combinedCount = countPartitions.join(" UNION ALL ");

    const conditions: string[] = [];
    if (filtro === "depositos") conditions.push("fuente = 'deposito'");
    else if (filtro === "retiros") conditions.push("fuente = 'retiro'");
    else if (filtro === "apuestas") conditions.push("fuente = 'apuesta'");
    else if (filtro === "pujas") conditions.push("fuente IN ('puja','reembolso','premio')");

    const whereFilter = conditions.length ? `AND (${conditions.join(" OR ")})` : "";

    const query = `
      WITH combined AS (${combined})
      SELECT * FROM combined
      WHERE 1=1 ${whereFilter}
      ORDER BY fecha DESC
      OFFSET $2 LIMIT $3
    `;
    const countSql = `
      WITH combined AS (${combinedCount})
      SELECT COUNT(*) FROM combined WHERE 1=1 ${whereFilter}
    `;

    const offset = (page - 1) * limit;
    const [res, resCount] = await Promise.all([
      pool.query(query, [targetId, offset, limit]),
      pool.query(countSql, [targetId]),
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
