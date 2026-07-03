import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };

    const { password_actual, password_nueva } = await req.json();

    if (!password_actual || !password_nueva) {
      return NextResponse.json({ error: "Ambos campos son obligatorios" }, { status: 400 });
    }

    if (password_nueva.length < 6) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const result = await pool.query(
      "SELECT password FROM usuarios WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const valido = await bcrypt.compare(password_actual, result.rows[0].password);
    if (!valido) {
      return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 401 });
    }

    const hashed = await bcrypt.hash(password_nueva, 10);
    await pool.query("UPDATE usuarios SET password = $1 WHERE id = $2", [hashed, decoded.id]);

    return NextResponse.json({ mensaje: "Contraseña cambiada exitosamente" });
  } catch {
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
