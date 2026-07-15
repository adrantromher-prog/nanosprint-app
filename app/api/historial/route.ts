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
      if (rows.length > 0 && rows[0].rol === "admin") targetId = parseInt(adminUserId);
    }

    const partitions: string[] = [];
    const countPartitions: string[] = [];

    partitions.push("SELECT 'deposito' as fuente, id, monto::numeric, asunto as descripcion, fecha, 'recarga' as subtipo FROM historial WHERE usuario_id = $1 AND tipo = 'recarga'");
    countPartitions.push("SELECT 'deposito' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'recarga'");

    partitions.push("SELECT 'retiro' as fuente, id, monto::numeric, asunto as descripcion, fecha, 'retiro' as subtipo FROM historial WHERE usuario_id = $1 AND tipo = 'retiro'");
    countPartitions.push("SELECT 'retiro' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'retiro'");

    partitions.push("SELECT 'puja' as fuente, rp.id, (-rp.monto)::numeric, 'Puja en Remate - Caballo #' || cc.numero, rp.fecha, 'puja' FROM remates_pujas rp JOIN carreras_caballos cc ON cc.id = rp.id_caballo WHERE rp.id_usuario = $1");
    countPartitions.push("SELECT 'puja' as fuente FROM remates_pujas WHERE id_usuario = $1");

    partitions.push("SELECT 'reembolso' as fuente, id, monto::numeric, asunto, fecha, 'reembolso' FROM historial WHERE usuario_id = $1 AND tipo = 'reembolso_puja'");
    countPartitions.push("SELECT 'reembolso' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'reembolso_puja'");

    partitions.push("SELECT 'premio' as fuente, id, monto::numeric, asunto, fecha, 'premio' FROM historial WHERE usuario_id = $1 AND tipo = 'premio_remate'");
    countPartitions.push("SELECT 'premio' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'premio_remate'");

    partitions.push("SELECT 'comision_referido' as fuente, id, monto::numeric, asunto, fecha, 'comision_referido' FROM historial WHERE usuario_id = $1 AND tipo = 'comision_referido'");
    countPartitions.push("SELECT 'comision_referido' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'comision_referido'");

    partitions.push("SELECT 'liberacion_referido' as fuente, id, monto::numeric, asunto, fecha, 'liberacion_referido' FROM historial WHERE usuario_id = $1 AND tipo = 'liberacion_referido'");
    countPartitions.push("SELECT 'liberacion_referido' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'liberacion_referido'");

    partitions.push("SELECT 'polla_apuesta' as fuente, id, (-monto)::numeric, asunto, fecha, 'polla_apuesta' FROM historial WHERE usuario_id = $1 AND tipo = 'polla_apuesta'");
    countPartitions.push("SELECT 'polla_apuesta' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'polla_apuesta'");

    partitions.push("SELECT 'premio_polla' as fuente, id, monto::numeric, asunto, fecha, 'premio_polla' FROM historial WHERE usuario_id = $1 AND tipo = 'premio_polla'");
    countPartitions.push("SELECT 'premio_polla' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'premio_polla'");

    partitions.push("SELECT 'apuesta_virtual' as fuente, id, (0 - monto)::numeric, asunto, fecha, 'apuesta_virtual' FROM historial WHERE usuario_id = $1 AND tipo = 'apuesta_virtual'");
    countPartitions.push("SELECT 'apuesta_virtual' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'apuesta_virtual'");

    partitions.push("SELECT 'premio_virtual' as fuente, id, monto::numeric, asunto, fecha, 'premio_virtual' FROM historial WHERE usuario_id = $1 AND tipo = 'premio_virtual'");
    countPartitions.push("SELECT 'premio_virtual' as fuente FROM historial WHERE usuario_id = $1 AND tipo = 'premio_virtual'");

    const combined = partitions.join(" UNION ALL ");
    const combinedCount = countPartitions.join(" UNION ALL ");

    const conditions: string[] = [];
    if (filtro === "depositos") conditions.push("fuente = 'deposito'");
    else if (filtro === "retiros") conditions.push("fuente = 'retiro'");
    else if (filtro === "apuestas") conditions.push("fuente IN ('apuesta','apuesta_virtual','premio_virtual')");
    else if (filtro === "pujas") conditions.push("fuente IN ('puja','reembolso','premio')");
    else if (filtro === "pollas") conditions.push("fuente IN ('polla_apuesta','premio_polla')");

    const whereFilter = conditions.length ? "AND (" + conditions.join(" OR ") + ")" : "";

    const query = "WITH combined AS (" + combined + ") SELECT * FROM combined WHERE 1=1 " + whereFilter + " ORDER BY fecha DESC OFFSET $2 LIMIT $3";
    const countSql = "WITH combined AS (" + combinedCount + ") SELECT COUNT(*) FROM combined WHERE 1=1 " + whereFilter;

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
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("HISTORIAL ERROR:", err.message);
    return NextResponse.json({ error: "Error interno: " + err.message }, { status: 500 });
  }
}
