import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import pool from "@/lib/db";
import HomePageClient from "./HomePageClient";

export default async function HomePage() {
  // ⭐ FIX: cookies() ahora es async
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return <div className="text-white p-10">No autorizado</div>;
  }

  let decoded: any = null;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch (error) {
    return <div className="text-white p-10">Sesión inválida</div>;
  }

  const result = await pool.query(
    "SELECT nombre, saldo, bloqueado, razon_bloqueo, rol FROM usuarios WHERE id = $1",
    [decoded.id]
  );

  const user = result.rows[0];

  if (!user) {
    return <div className="text-white p-10">Usuario no encontrado</div>;
  }

  return (
    <HomePageClient
      nombre={user.nombre}
      saldo={user.saldo}
      bloqueado={user.bloqueado}
      razon_bloqueo={user.razon_bloqueo}
      rol={user.rol}
    />
  );
}
