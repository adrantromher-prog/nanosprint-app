import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { broadcast } from "@/lib/ws";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  const client = await pool.connect();
  try {
    const { hipodromo, carreras, cierre_en } = await req.json();

    if (!cierre_en) {
      client.release();
      return NextResponse.json({ ok: false, error: "Debes especificar la fecha y hora de cierre" }, { status: 400 });
    }
    if (new Date(cierre_en).getTime() <= Date.now()) {
      client.release();
      return NextResponse.json({ ok: false, error: "La fecha de cierre debe ser en el futuro" }, { status: 400 });
    }

    if (!hipodromo || hipodromo.trim() === "") {
      client.release();
      return NextResponse.json({ ok: false, error: "El nombre del hipódromo es obligatorio" }, { status: 400 });
    }
    if (!carreras || carreras.length !== 6) {
      client.release();
      return NextResponse.json({ ok: false, error: "Debes especificar exactamente 6 carreras" }, { status: 400 });
    }
    for (const c of carreras) {
      if (!c.nombre || c.nombre.trim() === "") {
        client.release();
        return NextResponse.json({ ok: false, error: "Cada carrera debe tener un nombre (ej: Carrera 1)" }, { status: 400 });
      }
      if (!c.cantidad_caballos || c.cantidad_caballos < 2 || c.cantidad_caballos > 20) {
        client.release();
        return NextResponse.json({ ok: false, error: "Cada carrera debe tener entre 2 y 20 caballos" }, { status: 400 });
      }
    }

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO polla_config (activa, hipodromo, costo, cierre_en) VALUES (true, $1, 700.00, $2) RETURNING id`,
      [hipodromo.trim(), cierre_en]
    );
    const pollaId = result.rows[0].id;

    for (let i = 0; i < carreras.length; i++) {
      const n = carreras[i].numero ? parseInt(carreras[i].numero) : null;
      await client.query(
        `INSERT INTO polla_carreras (polla_id, orden, nombre, cantidad_caballos, numero) VALUES ($1, $2, $3, $4, $5)`,
        [pollaId, i + 1, carreras[i].nombre.trim(), carreras[i].cantidad_caballos, n]
      );
    }

    await client.query("COMMIT");
    client.release();

    try { broadcast({ type: "polla_creada", polla_id: pollaId }); } catch {}

    return NextResponse.json({ ok: true, polla_id: pollaId });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    try { client.release(); } catch {}
    console.error("Error creando polla:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
