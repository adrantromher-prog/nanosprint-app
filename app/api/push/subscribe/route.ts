import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { endpoint, keys } = body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ ok: false, error: "Faltan datos" }, { status: 400 });
    }
    await pool.query('CREATE TABLE IF NOT EXISTS push_subscriptions (id SERIAL PRIMARY KEY, endpoint TEXT NOT NULL UNIQUE, p256dh TEXT NOT NULL, auth TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW())');
    await pool.query("INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES ($1, $2, $3) ON CONFLICT (endpoint) DO UPDATE SET p256dh = $2, auth = $3", [endpoint, keys.p256dh, keys.auth]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("push/subscribe error:", e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || "Error del servidor" }, { status: 500 });
  }
}
