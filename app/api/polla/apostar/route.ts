import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { cookies } from "next/headers";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      client.release();
      return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    const usuarioId = decoded.id;

    const { polla_id, selecciones, cliente_sobrenombre, cliente_telefono } = await req.json();
    // selecciones: { "1": 3, "2": 5, ... } -> { carrera_orden: caballo_numero }

    if (!polla_id || !selecciones || Object.keys(selecciones).length !== 6) {
      client.release();
      return NextResponse.json({ ok: false, error: "Debes seleccionar 1 caballo por cada una de las 6 carreras" }, { status: 400 });
    }

    await client.query("BEGIN");

    const polla = await client.query(
      `SELECT id, activa, costo, fecha_cierre, hora_cierre FROM polla_config WHERE id = $1 AND activa = true FOR UPDATE`,
      [polla_id]
    );
    if (polla.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return NextResponse.json({ ok: false, error: "Polla no disponible o ya cerró" }, { status: 400 });
    }

    const f = polla.rows[0];
    const cerrarMs = f.fecha_cierre
      ? new Date(f.fecha_cierre).getTime()
      : f.hora_cierre
        ? (() => { const [h,m]=f.hora_cierre.split(":").map(Number);const c=new Date();c.setUTCHours(h+4,m,0,0);return c.getTime(); })()
        : 0;
    if (cerrarMs && Date.now() >= cerrarMs) {
      await client.query("ROLLBACK");
      client.release();
      return NextResponse.json({ ok: false, error: "El tiempo para apostar en esta polla ya terminó" }, { status: 400 });
    }

    const ticket = await client.query(
      `SELECT COALESCE(MAX(ticket), 0) + 1 as next_ticket FROM polla_apuestas WHERE polla_id = $1`,
      [polla_id]
    );
    const ticketNum = Number(ticket.rows[0].next_ticket);

    const carreras = await client.query(
      `SELECT orden, cantidad_caballos, retirados FROM polla_carreras WHERE polla_id = $1`,
      [polla_id]
    );
    for (const c of carreras.rows) {
      const caballoNum = selecciones[c.orden];
      if (!caballoNum || caballoNum < 1 || caballoNum > c.cantidad_caballos) {
        await client.query("ROLLBACK");
        client.release();
        return NextResponse.json({ ok: false, error: `Selección inválida para la carrera ${c.orden}` }, { status: 400 });
      }
      const retirados: number[] = c.retirados || [];
      if (retirados.includes(caballoNum)) {
        await client.query("ROLLBACK");
        client.release();
        return NextResponse.json({ ok: false, error: `El caballo #${caballoNum} fue retirado de la carrera ${c.orden}` }, { status: 400 });
      }
    }

    const usuario = await client.query(
      `SELECT saldo, rol FROM usuarios WHERE id = $1 FOR UPDATE`,
      [usuarioId]
    );
    if (usuario.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return NextResponse.json({ ok: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    const esTaquilla = usuario.rows[0].rol === 'taquilla';
    const costo = Number(polla.rows[0].costo);

    if (!esTaquilla) {
      const saldo = Number(usuario.rows[0].saldo);
      if (saldo < costo) {
        await client.query("ROLLBACK");
        client.release();
        return NextResponse.json({ ok: false, error: `Saldo insuficiente. Necesitas Bs. ${costo.toLocaleString()}` }, { status: 400 });
      }
      await client.query(
        `UPDATE usuarios SET saldo = saldo - $1 WHERE id = $2`,
        [costo, usuarioId]
      );
      await client.query(
        `INSERT INTO historial (usuario_id, tipo, monto, asunto)
         VALUES ($1, 'polla_apuesta', $2, $3)`,
        [usuarioId, costo, 'Apuesta Polla Hípica']
      );
    }

    for (const [carreraOrden, caballoNumero] of Object.entries(selecciones)) {
      await client.query(
        `INSERT INTO polla_apuestas (polla_id, usuario_id, ticket, carrera_orden, caballo_numero, caballo_original, vendido_por, cliente_sobrenombre, cliente_telefono)
         VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8)`,
        [polla_id, usuarioId, ticketNum, parseInt(carreraOrden), caballoNumero,
         esTaquilla ? usuarioId : null, cliente_sobrenombre || null, cliente_telefono || null]
      );
    }

    await client.query(
      `INSERT INTO polla_puntos (polla_id, usuario_id, ticket, puntos, premio)
       VALUES ($1, $2, $3, 0, 0)
       ON CONFLICT (polla_id, usuario_id, ticket) DO NOTHING`,
      [polla_id, usuarioId, ticketNum]
    );

    await client.query("COMMIT");
    client.release();

    try { broadcast({ type: "polla_apuesta", polla_id, usuario_id: usuarioId }); } catch {}

    return NextResponse.json({ ok: true, ticket: ticketNum });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    try { client.release(); } catch {}
    console.error("Error en apuesta polla:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
