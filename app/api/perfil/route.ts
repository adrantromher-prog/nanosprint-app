import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };

    const result = await pool.query(
      `SELECT nombre, apellido, sobrenombre, telefono, comida_favorita, sexo, creado_en, saldo, rol, bloqueado, razon_bloqueo
       FROM usuarios
       WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const usuario = result.rows[0];

    return NextResponse.json(
      {
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        sobrenombre: usuario.sobrenombre,
        telefono: usuario.telefono,
        comida_favorita: usuario.comida_favorita,
        sexo: usuario.sexo,
        creado_en: usuario.creado_en,
        saldo: usuario.saldo,
        rol: usuario.rol,
        bloqueado: usuario.bloqueado,
        razon_bloqueo: usuario.razon_bloqueo,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
