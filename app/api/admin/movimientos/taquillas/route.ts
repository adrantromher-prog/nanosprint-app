import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const error = await requireAdmin();
  if (error) return error;
  try {
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
        SELECT pa.vendido_por,
          COUNT(DISTINCT (pa.polla_id, pa.ticket))::int as total_tickets_polla,
          SUM(pc.costo) as monto_polla
        FROM polla_apuestas pa
        JOIN polla_config pc ON pc.id = pa.polla_id
        WHERE pa.vendido_por IS NOT NULL
        GROUP BY pa.vendido_por
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
    console.error('Error en movimientos/taquillas:', err);
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 });
  }
}