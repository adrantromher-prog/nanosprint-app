import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { rows } = await pool.query(
      `SELECT imagen FROM carreras_remate WHERE id = $1 AND imagen IS NOT NULL`,
      [id]
    );
    if (rows.length === 0) {
      return new NextResponse("Not found", { status: 404 });
    }
    const dataUrl = rows[0].imagen;
    const base64 = dataUrl.split(",")[1];
    const mime = dataUrl.split(";")[0].split(":")[1] || "image/png";
    const buffer = Buffer.from(base64, "base64");
    return new NextResponse(buffer, {
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
