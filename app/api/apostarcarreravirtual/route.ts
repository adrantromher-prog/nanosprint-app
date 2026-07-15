import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  // 1. Verificar token
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let usuarioId: number;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    usuarioId = decoded.id;
  } catch {
    return NextResponse.json({ error: "Token invÃ¡lido" }, { status: 401 });
  }

  // 2. Leer apuestas del body
  const { apuestas, cuotas, carreraId } = await req.json();
  // apuestas = [500, 0, 0, 1000, 0, 0]  (monto por caballo)
  // cuotas   = [4.23, 10.09, 3.43, 2.96, 5.36, 10.11]
  // carreraId = nÃºmero de la carrera actual

  const totalApostado: number = apuestas.reduce((a: number, b: number) => a + b, 0);

  if (totalApostado <= 0) {
    return NextResponse.json({ error: "Debes apostar al menos a un caballo" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 3. Verificar saldo actual en BD (no confiamos en el frontend)
    const { rows } = await client.query(
      "SELECT saldo FROM usuarios WHERE id = $1 FOR UPDATE",
      [usuarioId]
    );

    if (rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const saldoActual = Number(rows[0].saldo);

    if (saldoActual < totalApostado) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Saldo insuficiente" }, { status: 400 });
    }

    // 3b. Verificar lÃ­mite por caballo (max 5000 por caballo por carrera)
    const { rows: existingBets } = await client.query(
      `SELECT caballo, COALESCE(SUM(monto), 0) as total
       FROM apuestas
       WHERE usuario_id = $1 AND carrera_id = $2 AND resultado = 'pendiente'
       GROUP BY caballo`,
      [usuarioId, carreraId]
    );

    const existingMap: Record<number, number> = {};
    for (const row of existingBets) {
      existingMap[row.caballo] = Number(row.total);
    }

    for (let i = 0; i < apuestas.length; i++) {
      if (apuestas[i] > 0) {
        const totalEnCaballo = (existingMap[i + 1] || 0) + apuestas[i];
        if (totalEnCaballo > 5000) {
          await client.query("ROLLBACK");
          return NextResponse.json({
            error: `Ya apostaste el mÃ¡ximo permitido (Bs. 5000) al Caballo ${i + 1}`
          }, { status: 400 });
        }
      }
    }

    // 4. Descontar saldo
    await client.query(
      "UPDATE usuarios SET saldo = saldo - $1 WHERE id = $2",
      [totalApostado, usuarioId]
    );

    // 5. Guardar cada apuesta en la BD
    for (let i = 0; i < apuestas.length; i++) {
      if (apuestas[i] > 0) {
        await client.query(
          `INSERT INTO apuestas (usuario_id, carrera_id, caballo, monto, cuota)
           VALUES ($1, $2, $3, $4, $5)`,
          [usuarioId, carreraId, i + 1, apuestas[i], cuotas[i]]
        );
      }
    }

    await client.query("COMMIT");

    // 7. Devolver nuevo saldo
    const nuevoSaldo = saldoActual - totalApostado;
    return NextResponse.json({ mensaje: "Apuesta registrada", nuevoSaldo });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return NextResponse.json({ error: "Error al procesar apuesta" }, { status: 500 });
  } finally {
    client.release();
  }
}