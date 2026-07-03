import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import PerfilClient from "./PerfilClient";

export default async function PerfilPage() {
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

  const result = await pool.query(
    `SELECT nombre, apellido, sobrenombre, telefono, comida_favorita, sexo, creado_en, saldo, rol
     FROM usuarios WHERE id = $1`,
    [decoded.id]
  );

  const user = result.rows[0];

  if (!user) {
    return <div className="text-white p-10">Usuario no encontrado</div>;
  }

  return (
    <PerfilClient
      nombre={user.nombre}
      apellido={user.apellido}
      sobrenombre={user.sobrenombre}
      telefono={user.telefono}
      comida_favorita={user.comida_favorita}
      sexo={user.sexo}
      creado_en={user.creado_en}
      saldo={user.saldo}
      rol={user.rol}
    />
  );
}
