import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const error = await requireAdmin(req);
  if (error) return error;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const movimientos = await pool.query(
        `SELECT pa.polla_id, pa.ticket, pa.cliente_sobrenombre, pa.cliente_telefono,
                pc.hipodromo, pc.costo, MIN(pa.fecha) as fecha
         FROM polla_apuestas pa
         JOIN polla_config pc ON pc.id = pa.polla_id
         WHERE pa.vendido_por = $1
         GROUP BY pa.polla_id, pa.ticket, pa.cliente_sobrenombre, pa.cliente_telefono, pc.hipodromo, pc.costo
         ORDER BY MIN(pa.fecha) DESC`,
        [id]
      );
      return NextResponse.json({ ok: true, movimientos: movimientos.rows });
    }

    const taquillas = await pool.query(
      `SELECT u.id, u.sobrenombre, u.nombre_taquilla, u.comision,
              COALESCE(t.total_tickets, 0)::int as total_tickets,
              COALESCE(t.total_ventas, 0) as total_ventas
       FROM usuarios u
       LEFT JOIN (
         SELECT pa.vendido_por,
                COUNT(*)::int as total_tickets,
                SUM(pc.costo) as total_ventas
         FROM (SELECT DISTINCT polla_id, vendido_por, ticket FROM polla_apuestas WHERE vendido_por IS NOT NULL) pa
         JOIN polla_config pc ON pc.id = pa.polla_id
         GROUP BY pa.vendido_por
       ) t ON t.vendido_por = u.id
       WHERE u.rol = 'taquilla'
       ORDER BY total_ventas DESC NULLS LAST`
    );

    const rows = taquillas.rows.map((r: any) => {
      const ventas = Number(r.total_ventas);
      const pct = Number(r.comision) || 10;
      const comision = Math.floor(ventas * pct / 100);
      return {
        ...r,
        total_ventas: ventas,
        comision_pct: pct,
        comision,
        total_entrega: ventas - comision,
      };
    });

    return NextResponse.json({ ok: true, taquillas: rows });
  } catch (err) {
    console.error("Error al obtener taquillas:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
