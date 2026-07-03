import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT sobrenombre, puntos FROM usuarios WHERE puntos > 0 ORDER BY puntos DESC`
    );
    return NextResponse.json({ ok: true, clasificacion: result.rows });
  } catch (error) {
    console.error("Error obteniendo clasificacion:", error);
    return NextResponse.json({ ok: false, clasificacion: [] });
  }
}
