import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  let usuarioId: number;
  try { const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }; usuarioId = decoded.id; }
  catch { return NextResponse.json({ error: "Token invalido" }, { status: 401 }); }
  const { carreraId, ganador } = await req.json();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: apuestasPendientes } = await client.query("SELECT id, caballo, monto, cuota, carrera_id FROM apuestas WHERE usuario_id = $1 AND carrera_id = $2 AND resultado = 'pendiente'", [usuarioId, carreraId]);
    if (apuestasPendientes.length === 0) { await client.query("ROLLBACK"); return NextResponse.json({ premio: 0, nuevoSaldo: null }); }
    let premio = 0;
    for (const apuesta of apuestasPendientes) {
      const gano = apuesta.caballo === ganador + 1;
      await client.query("UPDATE apuestas SET resultado = $1 WHERE id = $2", [gano ? "gano" : "perdio", apuesta.id]);

      if (gano) {
        premio += Number(apuesta.monto) * Number(apuesta.cuota);

      }
    }
    if (premio > 0) await client.query("UPDATE usuarios SET saldo = saldo + $1 WHERE id = $2", [premio, usuarioId]);
    await client.query("COMMIT");
    const { rows } = await pool.query("SELECT saldo FROM usuarios WHERE id = $1", [usuarioId]);
    return NextResponse.json({ premio, nuevoSaldo: Number(rows[0].saldo) });
  } catch (error) {
    await client.query("ROLLBACK"); console.error(error);
    return NextResponse.json({ error: "Error al calcular premio" }, { status: 500 });
  } finally { client.release(); }
}
