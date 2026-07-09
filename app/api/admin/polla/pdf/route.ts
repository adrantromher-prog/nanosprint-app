import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const error = await requireAdmin(req);
  if (error) return error;

  try {
    const { polla_id, pdf_base64 } = await req.json();

    if (!polla_id) {
      return NextResponse.json({ ok: false, error: "Falta polla_id" }, { status: 400 });
    }

    await pool.query(
      `UPDATE polla_config SET pdf_base64 = $1 WHERE id = $2`,
      [pdf_base64 || null, polla_id]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error subiendo PDF:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
