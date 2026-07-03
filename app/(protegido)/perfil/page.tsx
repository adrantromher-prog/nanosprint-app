import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import PerfilClient from "./PerfilClient";

async function generarCodigoUnico(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const codigo = String(Math.floor(10000 + Math.random() * 90000));
    const existe = await pool.query("SELECT id FROM usuarios WHERE codigo_referido = $1", [codigo]);
    if (existe.rows.length === 0) return codigo;
  }
  throw new Error("No se pudo generar un código único");
}

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
    `SELECT nombre, apellido, sobrenombre, telefono, comida_favorita, sexo, creado_en, saldo, rol, codigo_referido
     FROM usuarios WHERE id = $1`,
    [decoded.id]
  );

  const user = result.rows[0];

  if (!user) {
    return <div className="text-white p-10">Usuario no encontrado</div>;
  }

  if (!user.codigo_referido) {
    user.codigo_referido = await generarCodigoUnico();
    await pool.query("UPDATE usuarios SET codigo_referido = $1 WHERE id = $2", [user.codigo_referido, decoded.id]);
  }

  const fechaRegistro = user.creado_en
    ? new Date(user.creado_en).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }).replace(/,/g, "")
    : "";

  const saldoStr = `Bs. ${Number(user.saldo).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  return (
    <PerfilClient
      nombre={user.nombre}
      apellido={user.apellido}
      sobrenombre={user.sobrenombre}
      telefono={user.telefono}
      comida_favorita={user.comida_favorita}
      sexo={user.sexo}
      fechaRegistro={fechaRegistro}
      saldoStr={saldoStr}
      rol={user.rol}
      codigo_referido={user.codigo_referido}
    />
  );
}
