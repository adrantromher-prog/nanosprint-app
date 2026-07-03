import { NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { nombre, apellido, sobrenombre, telefono, comida, sexo, password, codigo_referido: codigoIngresado } = await req.json();

    const existeTelefono = await pool.query(
      `SELECT id FROM usuarios WHERE telefono = $1`,
      [telefono]
    );

    if (existeTelefono.rows.length > 0) {
      return NextResponse.json(
        { error: "El teléfono ya está registrado" },
        { status: 400 }
      );
    }

    const existeSobrenombre = await pool.query(
      `SELECT id FROM usuarios WHERE sobrenombre = $1`,
      [sobrenombre]
    );

    if (existeSobrenombre.rows.length > 0) {
      return NextResponse.json(
        { error: "El sobrenombre ya está registrado" },
        { status: 400 }
      );
    }

    let referidoPor: number | null = null;
    if (codigoIngresado && codigoIngresado.trim() !== "") {
      const ref = await pool.query("SELECT id FROM usuarios WHERE codigo_referido = $1", [codigoIngresado.trim()]);
      if (ref.rows.length > 0) {
        referidoPor = ref.rows[0].id;
      }
    }

    const hashed = await bcrypt.hash(password, 10);

    let codigo_referido = "";
    let intentos = 0;
    while (intentos < 50) {
      codigo_referido = String(Math.floor(10000 + Math.random() * 90000));
      const existe = await pool.query("SELECT id FROM usuarios WHERE codigo_referido = $1", [codigo_referido]);
      if (existe.rows.length === 0) break;
      intentos++;
    }
    if (intentos >= 50) {
      return NextResponse.json({ error: "Error generando código de referido" }, { status: 500 });
    }

    const query = `
      INSERT INTO usuarios (nombre, apellido, sobrenombre, telefono, comida_favorita, sexo, password, rol, codigo_referido, referido_por)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'user', $8, $9)
      RETURNING id, nombre, apellido, sobrenombre, telefono, comida_favorita, sexo, creado_en, rol, codigo_referido
    `;

    const values = [nombre, apellido, sobrenombre, telefono, comida, sexo, hashed, codigo_referido, referidoPor];

    const result = await pool.query(query, values);

    return NextResponse.json({
      mensaje: "Usuario registrado",
      usuario: result.rows[0],
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}