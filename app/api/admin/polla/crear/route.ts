import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  const client = await pool.connect();
  try {
    const { hipodromo, carreras } = await req.json();

    if (!hipodromo || hipodromo.trim() === "") {
      client.release();
      return NextResponse.json({ ok: false, error: "El nombre del hipódromo es obligatorio" }, { status: 400 });
    }
    if (!carreras || carreras.length !== 6) {
      client.release();
      return NextResponse.json({ ok: false, error: "Debes especificar exactamente 6 carreras" }, { status: 400 });
    }
    for (const c of carreras) {
      if (!c.cantidad_caballos || c.cantidad_caballos < 2 || c.cantidad_caballos > 20) {
        client.release();
        return NextResponse.json({ ok: false, error: "Cada carrera debe tener entre 2 y 20 caballos" }, { status: 400 });
      }
    }

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO polla_config (activa, hipodromo, costo) VALUES (true, $1, 700.00) RETURNING id`,
      [hipodromo.trim()]
    );
    const pollaId = result.rows[0].id;

    for (let i = 0; i < carreras.length; i++) {
      await client.query(
        `INSERT INTO polla_carreras (polla_id, orden, cantidad_caballos) VALUES ($1, $2, $3)`,
        [pollaId, i + 1, carreras[i].cantidad_caballos]
      );
    }

    await client.query("COMMIT");
    client.release();

    broadcast({ type: "polla_creada", polla_id: pollaId });

    return NextResponse.json({ ok: true, polla_id: pollaId });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Error creando polla:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
