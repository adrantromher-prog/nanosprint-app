import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pollaId = searchParams.get("id");
    if (!pollaId) {
      return NextResponse.json({ error: "Falta id" }, { status: 400 });
    }

    const result = await pool.query(
      `SELECT pdf_base64 FROM polla_config WHERE id = $1 AND pdf_base64 IS NOT NULL`,
      [pollaId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "PDF no encontrado" }, { status: 404 });
    }

    const pdfBase64 = result.rows[0].pdf_base64;
    const pdfBuffer = Buffer.from(pdfBase64, "base64");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="reglamento_polla_${pollaId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error obteniendo PDF:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
