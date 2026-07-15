import pool from "@/lib/db";

export async function sendNotify(type: string, payload: Record<string, any>) {
  try {
    const data = JSON.stringify({ type, ...payload });
    if (data.length > 7000) {
      console.error("NOTIFY payload too long:", type, data.length);
      return;
    }
    await pool.query("SELECT pg_notify('remates_evento', $1)", [data]);
  } catch (e) {
    console.error("Error sending NOTIFY:", e);
  }
}
