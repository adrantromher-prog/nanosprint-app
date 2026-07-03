import { NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const error = await requireAdmin();
  if (error) return error;
  try {
    const body = await req.json();
    const { hipodromo, numeroCarrera, horaCierre, tipoCarrera, caballos } = body;

    if (!horaCierre || horaCierre.trim() === "") {
      return NextResponse.json({ ok: false, error: "La hora de cierre es obligatoria" }, { status: 400 });
    }
    if (!hipodromo || hipodromo.trim() === "") {
      return NextResponse.json({ ok: false, error: "El hipódromo es obligatorio" }, { status: 400 });
    }
    if (!caballos || caballos.length === 0 || caballos.some((c: string) => !c.trim())) {
      return NextResponse.json({ ok: false, error: "Debes ingresar al menos un caballo con nombre" }, { status: 400 });
    }

    // 1. Insertar la carrera
    const resultado = await pool.query(
      `INSERT INTO carreras_remate (hipodromo, numero_carrera, hora_cierre, tipo, estado)
       VALUES ($1, $2, $3, $4, 'abierta')
       RETURNING id`,
      [hipodromo, numeroCarrera, horaCierre, tipoCarrera]
    );

    const carreraId = resultado.rows[0].id;

    // 2. Insertar cada caballo
    for (let i = 0; i < caballos.length; i++) {
      await pool.query(
        `INSERT INTO carreras_caballos (id_carrera, numero, nombre, retirado)
         VALUES ($1, $2, $3, false)`,
        [carreraId, i + 1, caballos[i]]
      );
    }

    return NextResponse.json({ ok: true, carreraId });
  } catch (error) {
    console.error("Error creando carrera:", error);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}