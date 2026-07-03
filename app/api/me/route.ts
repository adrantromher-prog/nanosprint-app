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
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      nombre: string;
      saldo: number;
    };

    const result = await pool.query(
      `SELECT nombre, sobrenombre, saldo, bloqueado, razon_bloqueo, rol
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
        sobrenombre: usuario.sobrenombre,
        saldo: usuario.saldo,
        bloqueado: usuario.bloqueado,
        razon_bloqueo: usuario.razon_bloqueo,
        rol: usuario.rol,
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