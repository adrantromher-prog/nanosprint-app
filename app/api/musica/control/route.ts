import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: Request) {
  const { accion } = await req.json();

  if (accion === "siguiente") {
    const { rows } = await pool.query("SELECT track_idx FROM musica_estado WHERE id = 1");
    const actual = rows[0]?.track_idx || 1;
    const siguiente = actual >= 10 ? 1 : actual + 1;
    await pool.query(
      "UPDATE musica_estado SET track_idx = $1, inicio = NOW() WHERE id = 1",
      [siguiente]
    );
    const { rows: updated } = await pool.query("SELECT track_idx, inicio, reproduciendo FROM musica_estado WHERE id = 1");
    return NextResponse.json(updated[0]);
  }

  if (accion === "toggle") {
    const { rows } = await pool.query("SELECT reproduciendo FROM musica_estado WHERE id = 1");
    const nuevo = !rows[0]?.reproduciendo;
    await pool.query("UPDATE musica_estado SET reproduciendo = $1 WHERE id = 1", [nuevo]);
    return NextResponse.json({ reproduciendo: nuevo });
  }

  return NextResponse.json({ error: "accion no valida" }, { status: 400 });
}
