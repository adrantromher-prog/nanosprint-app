import pool from "@/lib/db";
import { NextResponse } from "next/server";
import webpush from "web-push";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || "defecto";

webpush.setVapidDetails("mailto:soporte@nanosprint.com", VAPID_PUBLIC, VAPID_PRIVATE);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "no autorizado" }, { status: 401 });
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notificaciones_cierre (
        id_remate INTEGER PRIMARY KEY,
        enviado_en TIMESTAMP DEFAULT NOW()
      )
    `);

    const carreras = await pool.query(`
      SELECT cr.id, cr.hipodromo, cr.numero_carrera, cr.hora_cierre
      FROM carreras_remate cr
      LEFT JOIN notificaciones_cierre nc ON nc.id_remate = cr.id
      WHERE nc.id_remate IS NULL
        AND (cr.estado IS NULL OR cr.estado != 'cerrada')
        AND cr.ganador IS NULL
    `);
    let enviadas = 0;
    for (const c of carreras.rows) {
      const [horas, minutos] = (c.hora_cierre as string).split(":").map(Number);
      const cierre = new Date();
      cierre.setHours(horas, minutos, 0, 0);
      const diff = cierre.getTime() - Date.now();
      if (diff <= 300000 && diff > 0) {
        await pool.query("INSERT INTO notificaciones_cierre (id_remate) VALUES ($1) ON CONFLICT DO NOTHING", [c.id]);
        const subs = await pool.query("SELECT endpoint, p256dh, auth FROM push_subscriptions");
        for (const sub of subs.rows) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({
                title: "Faltan 5 minutos",
                body: `Carrera #${c.numero_carrera} - ${c.hipodromo}`,
                url: `/remates/carrera/${c.id}`,
              })
            );
            enviadas++;
          } catch (err: any) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [sub.endpoint]);
            }
          }
        }
      }
    }
    return NextResponse.json({ ok: true, revisadas: carreras.rows.length, enviadas });
  } catch {
    return NextResponse.json({ ok: false, error: "Error del servidor" }, { status: 500 });
  }
}
