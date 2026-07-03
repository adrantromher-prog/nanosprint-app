import pool from "@/lib/db";
import { NextResponse } from "next/server";
import webpush from "web-push";

const VAPID_PUBLIC = "BHykAxsMbM9V2NuKn4QpsqhGIAjnPcVOG-kdfTa6CKBpuKXHRd3gkfsr1Twl_gM8znJ61uZHJ9K7kO0evtMYVAI";
const VAPID_PRIVATE = "jOOIbng_vCFIr9n4QeX9U8ODY-NyAhvrgAQshiE0CbI";

webpush.setVapidDetails("mailto:soporte@nanosprint.com", VAPID_PUBLIC, VAPID_PRIVATE);

export async function POST(req: Request) {
  try {
    const { titulo, cuerpo, url } = await req.json();
    if (!titulo) {
      return NextResponse.json({ ok: false, error: "Falta titulo" }, { status: 400 });
    }
    const result = await pool.query("SELECT endpoint, p256dh, auth FROM push_subscriptions");
    const subs = result.rows;
    let enviadas = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: titulo, body: cuerpo || "", url: url || "/remates" })
        );
        enviadas++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [sub.endpoint]);
        }
      }
    }
    return NextResponse.json({ ok: true, enviadas });
  } catch {
    return NextResponse.json({ ok: false, error: "Error del servidor" }, { status: 500 });
  }
}
