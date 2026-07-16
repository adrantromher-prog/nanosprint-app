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
        u.id, u.sobrenombre, u.nombre, u.saldo, u.rol, u.creado_en,
        COALESCE(r.total_pujas, 0)::numeric as total_pujas_remates,
        COALESCE(r.monto_pujado, 0)::numeric as monto_pujado_remates,
        COALESCE(p.total_apuestas_polla, 0)::int as total_apuestas_polla,
        COALESCE(p.monto_apostado_polla, 0)::numeric as monto_apostado_polla,
        COALESCE(v.total_apuestas_virtual, 0)::int as total_apuestas_virtual,
        COALESCE(v.monto_apostado_virtual, 0)::numeric as monto_apostado_virtual
      FROM usuarios u
      LEFT JOIN (
        SELECT rp.usuario_id,
          COUNT(*)::int as total_pujas,
          SUM(rp.monto) as monto_pujado
        FROM remates_pujas rp
        GROUP BY rp.usuario_id
      ) r ON r.usuario_id = u.id
      LEFT JOIN (
        SELECT pa.vendido_por as usuario_id,
          COUNT(DISTINCT (pa.polla_id, pa.ticket))::int as total_apuestas_polla,
          SUM(pc.costo) as monto_apostado_polla
        FROM polla_apuestas pa
        JOIN polla_config pc ON pc.id = pa.polla_id
        WHERE pa.vendido_por IS NOT NULL
        GROUP BY pa.vendido_por
      ) p ON p.usuario_id = u.id
      LEFT JOIN (
        SELECT usuario_id,
          COUNT(*)::int as total_apuestas_virtual,
          SUM(monto) as monto_apostado_virtual
        FROM apuestas
        GROUP BY usuario_id
      ) v ON v.usuario_id = u.id
      ORDER BY
        COALESCE(r.monto_pujado, 0) + COALESCE(p.monto_apostado_polla, 0) + COALESCE(v.monto_apostado_virtual, 0) DESC
    `);
    return NextResponse.json({ ok: true, usuarios: rows });
  } catch (err) {
    console.error('Error en movimientos/usuarios:', err);
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 });
  }
}