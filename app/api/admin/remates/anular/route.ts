import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendNotify } from "@/lib/notify";

export async function POST(req: Request) {
  const error = await requireAdmin(req);
  if (error) return error;
  const client = await pool.connect();
  try {
    const { carrera_id } = await req.json();
    if (!carrera_id) { client.release(); return NextResponse.json({ ok: false, error: "Falta carrera_id" }, { status: 400 }); }

    const carrera = await client.query("SELECT estado FROM carreras_remate WHERE id = $1", [carrera_id]);
    if (carrera.rows.length === 0) { client.release(); return NextResponse.json({ ok: false, error: "Carrera no encontrada" }, { status: 404 }); }

    await client.query("BEGIN");

    // Solo reembolsar la Ãºltima puja de cada caballo NO retirado
    const pujas = await client.query(
      `SELECT rp.id_usuario, rp.monto, cc.numero
       FROM remates_pujas rp
       JOIN carreras_caballos cc ON cc.id = rp.id_caballo
       WHERE cc.id_carrera = $1
       AND cc.retirado = false
       AND rp.monto = (SELECT COALESCE(MAX(rp2.monto), 0) FROM remates_pujas rp2 WHERE rp2.id_caballo = rp.id_caballo)`,
      [carrera_id]
    );

    const usuariosAfectados: { id: number; monto: number }[] = [];

    for (const puja of pujas.rows) {
      const monto = Number(puja.monto);
      if (monto <= 0) continue;
      await client.query("UPDATE usuarios SET saldo = saldo + $1 WHERE id = $2", [monto, puja.id_usuario]);
      await client.query(
        "INSERT INTO historial (usuario_id, tipo, monto, asunto) VALUES ($1, 'reembolso_anulacion', $2, $3)",
        [puja.id_usuario, monto, 'Reembolso por anulaci\u00f3n de carrera']
      );
      usuariosAfectados.push({ id: puja.id_usuario, monto });
    }

    await client.query("UPDATE carreras_remate SET estado = 'anulada', ganador = NULL WHERE id = $1", [carrera_id]);

    await client.query("COMMIT");
    client.release();

    sendNotify("carrera_anulada", { carrera_id, reembolsos: usuariosAfectados });

    return NextResponse.json({ ok: true, reembolsos: usuariosAfectados.length });
  } catch (error) {
    await client.query("ROLLBACK");
    client.release();
    console.error("Error anulando carrera:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
