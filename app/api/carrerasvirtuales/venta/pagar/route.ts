import { NextResponse } from "next/server";
import pool from "@/lib/db";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };

    const { ticket_id } = await req.json();
    if (!ticket_id) return NextResponse.json({ ok: false, error: "Falta ticket_id" }, { status: 400 });

    const ticket = await pool.query(`SELECT * FROM carrerasvirtuales_tickets WHERE id = $1`, [ticket_id]);
    if (ticket.rows.length === 0) return NextResponse.json({ ok: false, error: "Ticket no encontrado" }, { status: 404 });

    const t = ticket.rows[0];
    if (t.pagado) return NextResponse.json({ ok: false, error: "Ya fue pagado" }, { status: 400 });

    const premio = Number(t.monto) * Number(t.cuota);

    await pool.query(
      `UPDATE carrerasvirtuales_tickets SET pagado = true, premio_pagado = $1 WHERE id = $2`,
      [premio, ticket_id]
    );

    return NextResponse.json({ ok: true, premio });
  } catch (e: any) {
    console.error("Error pagando ticket virtual:", e);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
