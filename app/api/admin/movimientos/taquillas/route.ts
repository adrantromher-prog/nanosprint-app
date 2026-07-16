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
    const tipo = searchParams.get("tipo");
    const filter = searchParams.get("filter") || "diario";

    // Detalle por taquilla: polla o virtual
    if (id && tipo) {
      let groupBy: string;
      let label: string;
      let limit: string;
      if (filter === "semanal") {
        groupBy = "DATE_TRUNC('week', fecha - INTERVAL '4 hours')";
        label = `TO_CHAR(${groupBy}, 'YYYY-MM-DD') as inicio_semana`;
        limit = "52";
      } else if (filter === "mensual") {
        groupBy = "DATE_TRUNC('month', fecha - INTERVAL '4 hours')";
        label = `TO_CHAR(${groupBy}, 'YYYY-MM') as mes`;
        limit = "24";
      } else {
        groupBy = "DATE(fecha - INTERVAL '4 hours')";
        label = "DATE(fecha - INTERVAL '4 hours') as dia";
        limit = "60";
      }

      if (tipo === "polla") {
        const { rows } = await pool.query(`
          SELECT
            ${label},
            COUNT(*)::int as total_tickets,
            ROUND(SUM(costo_unico))::numeric as monto_total
          FROM (
            SELECT DISTINCT ON (pa.polla_id, pa.ticket)
              DATE(pa.fecha - INTERVAL '4 hours') as fecha,
              pa.polla_id,
              pa.ticket,
              pc.costo as costo_unico
            FROM polla_apuestas pa
            JOIN polla_config pc ON pc.id = pa.polla_id
            WHERE pa.vendido_por = $1
          ) sub
          GROUP BY ${groupBy}
          ORDER BY ${groupBy} DESC
          LIMIT ${limit}
        `, [id]);

        const taq = await pool.query("SELECT comision FROM usuarios WHERE id = $1", [id]);
        const comisionPct = Number(taq.rows[0]?.comision) || 10;

        return NextResponse.json({ ok: true, data: rows, taquilla: { comision_pct: comisionPct } });
      }

      if (tipo === "virtual") {
        const { rows } = await pool.query(`
          SELECT
            ${label},
            COUNT(*)::int as total_tickets,
            ROUND(SUM(monto))::numeric as monto_total,
            ROUND(SUM(premio_pagado))::numeric as premios_pagados,
            ROUND(SUM(monto) - SUM(premio_pagado))::numeric as ganancia
          FROM carrerasvirtuales_tickets
          WHERE usuario_id = $1
          GROUP BY ${groupBy}
          ORDER BY ${groupBy} DESC
          LIMIT ${limit}
        `, [id]);

        return NextResponse.json({ ok: true, data: rows });
      }

      return NextResponse.json({ ok: false, error: "Tipo inválido" }, { status: 400 });
    }

    // Lista de taquillas - fix: usar DISTINCT para evitar multiplicar por 6
    const { rows } = await pool.query(`
      SELECT
        u.id, u.sobrenombre, u.nombre_taquilla, u.comision, u.saldo,
        COALESCE(p.total_tickets_polla, 0)::int as total_tickets_polla,
        COALESCE(p.monto_polla, 0)::numeric as monto_polla,
        COALESCE(v.total_tickets_virtual, 0)::int as total_tickets_virtual,
        COALESCE(v.monto_virtual, 0)::numeric as monto_virtual,
        COALESCE(p.monto_polla, 0) + COALESCE(v.monto_virtual, 0) as total_ventas
      FROM usuarios u
      LEFT JOIN (
        SELECT vendido_por,
          COUNT(*)::int as total_tickets_polla,
          ROUND(SUM(costo_unico))::numeric as monto_polla
        FROM (
          SELECT DISTINCT ON (pa.polla_id, pa.ticket)
            pa.vendido_por, pa.polla_id, pa.ticket, pc.costo as costo_unico
          FROM polla_apuestas pa
          JOIN polla_config pc ON pc.id = pa.polla_id
          WHERE pa.vendido_por IS NOT NULL
        ) sub
        GROUP BY vendido_por
      ) p ON p.vendido_por = u.id
      LEFT JOIN (
        SELECT usuario_id,
          COUNT(*)::int as total_tickets_virtual,
          SUM(monto) as monto_virtual
        FROM carrerasvirtuales_tickets
        GROUP BY usuario_id
      ) v ON v.usuario_id = u.id
      WHERE u.rol = 'taquilla'
      ORDER BY total_ventas DESC NULLS LAST
    `);

    const taquillas = rows.map((r: any) => {
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

    return NextResponse.json({ ok: true, taquillas });
  } catch (err) {
    console.error("Error en movimientos/taquillas:", err);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}