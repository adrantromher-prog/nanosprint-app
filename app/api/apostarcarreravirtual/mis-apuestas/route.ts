import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  let usuarioId: number;
  try { const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number }; usuarioId = decoded.id; }
  catch { return NextResponse.json({ error: "Token invalido" }, { status: 401 }); }
  const { searchParams } = new URL(req.url);
  const carreraId = searchParams.get("carreraId");
  if (!carreraId) return NextResponse.json({ apuestas: [0, 0, 0, 0, 0, 0] });
  try {
    const { rows } = await pool.query("SELECT caballo, monto FROM apuestas WHERE usuario_id = $1 AND carrera_id = $2 AND resultado = 'pendiente'", [usuarioId, Number(carreraId)]);
    const apuestas = [0, 0, 0, 0, 0, 0];
    for (const row of rows) apuestas[row.caballo - 1] = Number(row.monto);
    return NextResponse.json({ apuestas });
  } catch { return NextResponse.json({ apuestas: [0, 0, 0, 0, 0, 0] }); }
}
