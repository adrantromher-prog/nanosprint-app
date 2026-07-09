import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number; rol: string };
    if (decoded.rol !== "taquilla") return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { polla_id, usuario_id, ticket } = await req.json();

    if (!polla_id || !usuario_id || !ticket) {
      client.release();
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const pp = await client.query(
      `SELECT id, premio, pagado_al_cliente FROM polla_puntos
       WHERE polla_id = $1 AND usuario_id = $2 AND ticket = $3 AND pagado = true AND pagado_al_cliente = false
       FOR UPDATE`,
      [polla_id, usuario_id, ticket]
    );
    if (pp.rows.length === 0) {
      client.release();
      return NextResponse.json({ error: "No hay premio pendiente por pagar" }, { status: 400 });
    }

    const premio = Number(pp.rows[0].premio);
    if (premio <= 0) {
      client.release();
      return NextResponse.json({ error: "El premio es cero" }, { status: 400 });
    }

    await client.query("BEGIN");

    await client.query(
      `UPDATE polla_puntos SET pagado_al_cliente = true WHERE id = $1`,
      [pp.rows[0].id]
    );

    await client.query(
      `UPDATE usuarios SET saldo = saldo - $1 WHERE id = $2`,
      [premio, decoded.id]
    );

    await client.query(
      `INSERT INTO historial (usuario_id, tipo, monto, asunto)
       VALUES ($1, 'pago_premio_cliente', $2, $3)`,
      [decoded.id, premio, `Pago premio Polla #${polla_id} Ticket #${ticket}`]
    );

    await client.query("COMMIT");
    client.release();

    return NextResponse.json({ ok: true, premio });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    try { client.release(); } catch {}
    console.error("Error confirmando pago:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
