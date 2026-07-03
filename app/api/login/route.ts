import { NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { telefono, password } = await req.json();

    // Buscar usuario por teléfono
    const query = `SELECT id, nombre, saldo, password, rol FROM usuarios WHERE telefono = $1`;
    const result = await pool.query(query, [telefono]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const usuario = result.rows[0];

    // Validar contraseña
    const valido = await bcrypt.compare(password, usuario.password);
    if (!valido) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    // Crear token con datos del usuario
    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        saldo: usuario.saldo,
        rol: usuario.rol,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    // Crear respuesta y guardar cookie
    const response = NextResponse.json({ mensaje: "Login exitoso" });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false,   // ⭐ FIX PARA LOCALHOST
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return response;

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
