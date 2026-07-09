import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const error = await requireAdmin(req);
  if (error) return error;
  try {
    const { telefono } = await req.json();

    const result = await pool.query(
      `SELECT id, nombre, apellido, sobrenombre, telefono, saldo, creado_en, comida_favorita, rol, bloqueado, razon_bloqueo, comision
       FROM usuarios
       WHERE telefono = $1`,
      [telefono]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);

  } catch (err) {
    console.error("❌ ERROR EN /api/admin/buscar:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
