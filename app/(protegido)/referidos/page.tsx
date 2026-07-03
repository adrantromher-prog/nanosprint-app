import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import ReferidosClient from "./ReferidosClient";

export default async function ReferidosPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return <div className="text-white p-10">No autorizado</div>;
  }

  let decoded: any = null;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return <div className="text-white p-10">Sesión inválida</div>;
  }

  const userResult = await pool.query(
    `SELECT sobrenombre, referido_saldo FROM usuarios WHERE id = $1`,
    [decoded.id]
  );

  const user = userResult.rows[0];
  if (!user) {
    return <div className="text-white p-10">Usuario no encontrado</div>;
  }

  const referidoSaldo = Number(user.referido_saldo || 0);

  const historialResult = await pool.query(
    `SELECT COALESCE(SUM(monto), 0) as total_comisiones FROM historial WHERE usuario_id = $1 AND tipo = 'comision_referido'`,
    [decoded.id]
  );
  const totalComisiones = Number(historialResult.rows[0].total_comisiones);

  const referidosResult = await pool.query(
    `SELECT sobrenombre, creado_en FROM usuarios WHERE referido_por = $1 ORDER BY creado_en DESC`,
    [decoded.id]
  );

  return (
    <ReferidosClient
      referidoSaldo={referidoSaldo}
      totalComisiones={totalComisiones}
      referidos={referidosResult.rows.map((r: any) => ({
        sobrenombre: r.sobrenombre,
        creado_en: r.creado_en
          ? new Date(r.creado_en).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            }).replace(/,/g, "")
          : "",
      }))}
    />
  );
}
