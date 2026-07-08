import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  try {
    const { usuarioId, rol, nombre_taquilla, comision } = await req.json();

    if (!usuarioId) {
      return NextResponse.json({ error: "Falta usuarioId" }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (rol) {
      if (!["user", "taquilla", "admin"].includes(rol)) {
        return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
      }
      updates.push(`rol = $${idx++}`);
      params.push(rol);
      updates.push(`es_taquilla = $${idx++}`);
      params.push(rol === "taquilla");
    }

    if (nombre_taquilla !== undefined) {
      updates.push(`nombre_taquilla = $${idx++}`);
      params.push(nombre_taquilla || null);
    }

    if (comision !== undefined) {
      const c = Number(comision);
      if (isNaN(c) || c < 0 || c > 100) {
        return NextResponse.json({ error: "Comisión debe ser un número entre 0 y 100" }, { status: 400 });
      }
      updates.push(`comision = $${idx++}`);
      params.push(c);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    params.push(usuarioId);
    await pool.query(
      `UPDATE usuarios SET ${updates.join(", ")} WHERE id = $${idx}`,
      params
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error al actualizar usuario:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
