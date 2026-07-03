import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const { rows } = await pool.query(
    "SELECT valor FROM configuracion WHERE clave = 'mantenimiento'"
  );
  const activo = rows[0]?.valor === "true";
  return NextResponse.json({ mantenimiento: activo });
}

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  const { activo } = await req.json();
  await pool.query(
    `INSERT INTO configuracion (clave, valor) VALUES ('mantenimiento', $1)
     ON CONFLICT (clave) DO UPDATE SET valor = $1`,
    [activo ? "true" : "false"]
  );
  return NextResponse.json({ mantenimiento: activo });
}