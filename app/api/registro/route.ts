import { NextResponse } from "next/server";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { nombre, apellido, sobrenombre, telefono, comida, sexo, password } = await req.json();

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

    const hashed = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO usuarios (nombre, apellido, sobrenombre, telefono, comida_favorita, sexo, password, rol)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'user')
      RETURNING id, nombre, apellido, sobrenombre, telefono, comida_favorita, sexo, creado_en, rol
    `;

    const values = [nombre, apellido, sobrenombre, telefono, comida, sexo, hashed];

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