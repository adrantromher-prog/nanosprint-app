import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS musica_estado (
      id INTEGER PRIMARY KEY DEFAULT 1,
      track_idx INTEGER NOT NULL DEFAULT 1,
      inicio TIMESTAMP NOT NULL DEFAULT NOW(),
      reproduciendo BOOLEAN NOT NULL DEFAULT true
    )
  `);
  await pool.query(`
    INSERT INTO musica_estado (id, track_idx, inicio, reproduciendo)
    VALUES (1, 1, NOW(), true)
    ON CONFLICT (id) DO NOTHING
  `);
  const { rows } = await pool.query("SELECT track_idx, inicio, reproduciendo FROM musica_estado WHERE id = 1");
  return NextResponse.json(rows[0]);
}
