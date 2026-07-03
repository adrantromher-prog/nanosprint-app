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
      return NextResponse.json({ ok: false, error: "No autenticado." }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    const usuarioId = decoded.id;

    const { carrera_id, caballo_id, monto } = await req.json();

    if (monto % 500 !== 0) {
      client.release();
      return NextResponse.json({ ok: false, error: "El monto debe ser múltiplo de 500." }, { status: 400 });
    }

    const resUsuario = await client.query(
      `SELECT saldo FROM usuarios WHERE id = $1`,
      [usuarioId]
    );

    if (resUsuario.rows.length === 0) {
      client.release();
      return NextResponse.json({ ok: false, error: "Usuario no encontrado." }, { status: 404 });
    }

    const saldoActual = Number(resUsuario.rows[0].saldo);

    if (monto > saldoActual) {
      client.release();
      return NextResponse.json({ ok: false, error: "Saldo insuficiente." }, { status: 400 });
    }

    const resPuja = await client.query(
      `SELECT monto, id_usuario FROM remates_pujas WHERE id_caballo = $1 ORDER BY monto DESC LIMIT 1`,
      [caballo_id]
    );

    const pujaAnterior = resPuja.rows[0]
      ? { monto: Number(resPuja.rows[0].monto), id_usuario: resPuja.rows[0].id_usuario }
      : null;

    if (pujaAnterior && monto <= pujaAnterior.monto) {
      client.release();
      return NextResponse.json({
        ok: false,
        error: `Debes superar la puja actual de Bs. ${pujaAnterior.monto.toLocaleString()}.`
      }, { status: 400 });
    }

    const resCarrera = await client.query(
      `SELECT estado, hora_cierre FROM carreras_remate WHERE id = $1`,
      [carrera_id]
    );

    if (resCarrera.rows[0]?.estado !== "abierta") {
      client.release();
      return NextResponse.json({ ok: false, error: "La carrera ya está cerrada." }, { status: 400 });
    }

    const ahora = new Date();
    const offsetVET = -4 * 60 * 60 * 1000;
    const ahoraVET = new Date(ahora.getTime() + offsetVET);
    const minutosActual = ahoraVET.getUTCHours() * 60 + ahoraVET.getUTCMinutes();

    const [horas, minutos] = resCarrera.rows[0].hora_cierre.split(":").map(Number);
    const minutosLimite = horas * 60 + minutos;

    if (minutosActual >= minutosLimite) {
      client.release();
      return NextResponse.json({ ok: false, error: "El tiempo de la carrera ha expirado." }, { status: 400 });
    }

    const resCaballo = await client.query(
      `SELECT retirado FROM carreras_caballos WHERE id = $1`,
      [caballo_id]
    );

    if (resCaballo.rows[0]?.retirado) {
      client.release();
      return NextResponse.json({ ok: false, error: "Este caballo fue retirado." }, { status: 400 });
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS historial (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        monto NUMERIC(12,2) NOT NULL,
        asunto TEXT,
        fecha TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query("BEGIN");

    await client.query(
      `INSERT INTO remates_pujas (id_remate, id_caballo, id_usuario, monto, fecha)
       VALUES ($1, $2, $3, $4, NOW())`,
      [carrera_id, caballo_id, usuarioId, monto]
    );

    await client.query(
      `UPDATE usuarios SET saldo = saldo - $1 WHERE id = $2`,
      [monto, usuarioId]
    );

    if (pujaAnterior && pujaAnterior.id_usuario !== usuarioId) {
      await client.query(
        `UPDATE usuarios SET saldo = saldo + $1 WHERE id = $2`,
        [pujaAnterior.monto, pujaAnterior.id_usuario]
      );
      await client.query(
        `INSERT INTO historial (usuario_id, tipo, monto, asunto)
         VALUES ($1, 'reembolso_puja', $2, $3)`,
        [pujaAnterior.id_usuario, pujaAnterior.monto, 'Reembolso de puja - Fuiste superado']
      );
    }

    await client.query("COMMIT");
    client.release();

    broadcast({ type: "puja", carrera_id, caballo_id, monto });

    return NextResponse.json({ ok: true });

  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Error procesando puja:", error);
    return NextResponse.json({ ok: false, error: "Error interno." }, { status: 500 });
  }
}