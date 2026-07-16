import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import pool from "@/lib/db";
import { sseManager } from "@/lib/sse";
import jwt from "jsonwebtoken";

// â”€â”€â”€ helpers copiados de /api/carrera (sin tocar ese archivo) â”€â”€â”€

const DURACION_APUESTAS = 150;
const DURACION_RESULTADO = 7;
const SAFETY_TIMEOUT_CARRERA = 240;
const MAX_CICLOS_POR_REQUEST = 5;

function generarCuotas() {
  const cuotaMin = 2.0, cuotaMax = 12.0, overroundObjetivo = 1.25;
  const pesos = Array.from({ length: 6 }, () => Math.random());
  const sumaPesos = pesos.reduce((a, b) => a + b, 0);
  const probsReales = pesos.map((p) => p / sumaPesos);
  let cuotas = probsReales.map((p) => 1 / p);
  cuotas = cuotas.map((c) => Math.min(Math.max(c, cuotaMin), cuotaMax));
  let probsImp = cuotas.map((c) => 1 / c);
  const sumaImp = probsImp.reduce((a, b) => a + b, 0);
  const factor = sumaImp / overroundObjetivo;
  cuotas = cuotas.map((c) => c * factor);
  cuotas = cuotas.map((c) => Math.min(Math.max(c, cuotaMin), cuotaMax));
  return cuotas.map((c) => parseFloat(c.toFixed(2)));
}

function elegirGanador(cuotas: number[]) {
  let probs = cuotas.map((c) => 1 / c);
  const suma = probs.reduce((a, b) => a + b, 0);
  probs = probs.map((p) => p / suma);
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < probs.length; i++) { acc += probs[i]; if (r <= acc) return i; }
  return 0;
}

type VideoEntrySSE = { path: string; duracion: number };

const R2_BASE_SSE = "https://pub-38f03dca333b4687bcf68ac8da6b1cf2.r2.dev";

const VIDEO_MAP_SSE: Record<string, VideoEntrySSE> = (() => {
  try {
    return JSON.parse(require("fs").readFileSync(require("path").join(process.cwd(), "video-mapping.json"), "utf8"));
  } catch {
    return {};
  }
})();

function elegirVideo(ganador: number): { url: string; duracion: number } {
  const caballo = ganador + 1;
  const videos = Object.values(VIDEO_MAP_SSE)
    .filter((v: VideoEntrySSE) => v.path.startsWith(`${caballo}/`));
  if (videos.length === 0) return { url: "", duracion: 25 };
  const elegido = videos[Math.floor(Math.random() * videos.length)];
  return { url: `${R2_BASE_SSE}/${elegido.path}`, duracion: elegido.duracion };
}

const perfilesCaballos = [
  { estilo: "Sprinter" as const, baseVel: 92, baseRes: 60 },
  { estilo: "Equilibrado" as const, baseVel: 85, baseRes: 75 },
  { estilo: "Resistente" as const, baseVel: 78, baseRes: 88 },
  { estilo: "Sprinter" as const, baseVel: 90, baseRes: 65 },
  { estilo: "Equilibrado" as const, baseVel: 83, baseRes: 77 },
  { estilo: "Resistente" as const, baseVel: 80, baseRes: 85 },
];

const coloresCaballos = [
  "bg-red-600 text-white", "bg-white text-black", "bg-blue-600 text-white",
  "bg-yellow-400 text-black", "bg-green-600 text-white", "bg-black text-white",
];

const NOMBRES_CABALLOS = [
  "Secretariat", "Phar Lap", "Seabiscuit", "Man o' War", "Citation", "Kelso",
  "Dr. Fager", "Native Dancer", "Affirmed", "Alysheba", "Curlin", "Zenyatta",
  "Rachel Alexandra", "American Pharoah", "Justify", "Arrogate", "Flightline",
  "Ghostzapper", "Cigar", "Holy Bull", "Sunday Silence", "Easy Goer", "Makybe Diva",
  "Black Caviar", "Winx", "Kingston Town", "Northerly", "Octagonal", "Tulloch",
  "Frankel", "Sea The Stars", "Brigadier Gerard", "Mill Reef", "Nijinsky",
  "Shergar", "Galileo", "Montjeu", "Dancing Brave", "Dubai Millennium",
  "Enable", "Dettori", "Piggott", "O'Brien", "Gosden", "Stoute",
  "Deep Impact", "Orfevre", "El Gran SeÃ±or", "Il Postino", "Cerezas",
  "Canaima", "Hipona", "Lagunillas", "Avila", "Catia", "Petare",
  "Chacaito", "Baruta", "Guarenas", "Guatire", "Barlovento", "Araguaney",
  "Turpial", "Tamanaco", "Guaimaral", "Auyantepuy", "Roraima", "Capanaparo",
  "Orinoco", "Caroni", "Apure", "Caura", "Manapiare", "CaronÃ­",
  "Guri", "Macagua", "Tocoma", "Uribante", "Caparo", "Bocono",
  "Cinaruco", "Guanare", "Maporal", "Calabozo", "Zaraza", "Piritu",
  "Caicara", "Tucupita", "Guasdualito", "Pampatar", "Caripe", "Araya",
  "Choroni", "Colonia", "Tarma", "Ocumare", "Chivacoa", "Carora",
  "Quibor", "El Tocuyo", "Sanare", "Carache", "BoconÃ³", "Valera",
  "Trujillano", "Caucagua", "Riochico", "Tacarigua", "Chichiriviche", "Capatarida",
  "Paraguana", "Coro", "Cumarebo", "Mene", "Dabajuro", "Carurano",
  "Macanao", "Margarita", "Coche", "Cubagua", "Los Roques", "La Tortuga",
];

function shufflePick6() {
  const copy = [...NOMBRES_CABALLOS];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, 6);
}

function generarEstadisticas(cuotas: number[]) {
  const ranking = cuotas.map((c, i) => ({ idx: i, cuota: c }))
    .sort((a, b) => a.cuota - b.cuota)
    .reduce((acc, item, pos) => { acc[item.idx] = pos + 1; return acc; }, {} as Record<number, number>);
  const nombres = shufflePick6();
  return perfilesCaballos.map((perfil, index) => {
    const rank = ranking[index];
    const bonus = ((6 - rank) * 4 - 10) + Math.floor(Math.random() * 5) - 2;
    const velocidad = Math.max(65, Math.min(99, Math.round(perfil.baseVel + bonus)));
    const resistencia = Math.max(60, Math.min(99, Math.round(perfil.baseRes + bonus)));
    const promedio = (velocidad + resistencia) / 2;
    let forma: "Excelente" | "Buena" | "Regular";
    if (promedio >= 88) forma = "Excelente";
    else if (promedio >= 78) forma = "Buena";
    else forma = "Regular";
    const ultimasLlegadas = Array.from({ length: 5 }, () => {
      const r = Math.random();
      if (promedio >= 88) {
        if (r < 0.4) return 1; if (r < 0.7) return 2; if (r < 0.85) return 3;
        return Math.floor(Math.random() * 3) + 4;
      } else if (promedio >= 78) {
        if (r < 0.2) return 1; if (r < 0.5) return 2; if (r < 0.8) return 3;
        return Math.floor(Math.random() * 3) + 4;
      } else {
        if (r < 0.1) return 1; if (r < 0.25) return 2; if (r < 0.45) return 3;
        return Math.floor(Math.random() * 3) + 4;
      }
    });
    return { numero: index + 1, nombre: nombres[index], velocidad, resistencia, forma, ultimasLlegadas, color: coloresCaballos[index], estilo: perfil.estilo };
  });
}

async function asegurarTabla() {
  await pool.query(`CREATE TABLE IF NOT EXISTS carreras_virtuales (id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), estado TEXT NOT NULL DEFAULT 'apuestas', numero_carrera INTEGER NOT NULL DEFAULT 1, inicio_estado TIMESTAMPTZ NOT NULL DEFAULT NOW(), tiempo_restante INTEGER, cuotas JSONB, ganador INTEGER, video TEXT, estadisticas JSONB)`);
  await pool.query(`ALTER TABLE carreras_virtuales ADD COLUMN IF NOT EXISTS estadisticas JSONB`);
  await pool.query(`ALTER TABLE carreras_virtuales ADD COLUMN IF NOT EXISTS ultimos_ganadores JSONB DEFAULT '[]'::jsonb`);
  const cuotasIniciales = generarCuotas();
  const estadisticas = JSON.stringify(generarEstadisticas(cuotasIniciales));
  await pool.query(`INSERT INTO carreras_virtuales (id, estado, numero_carrera, inicio_estado, tiempo_restante, cuotas, estadisticas, ultimos_ganadores) VALUES (1, 'apuestas', 1, NOW(), $1, $2, $3, '[]'::jsonb) ON CONFLICT (id) DO NOTHING`, [DURACION_APUESTAS, JSON.stringify(cuotasIniciales), estadisticas]);
}

// â”€â”€â”€ watchers â”€â”€â”€

async function fetchCarrera() {
  await asegurarTabla();
  const { rows } = await pool.query("SELECT * FROM carreras_virtuales WHERE id = 1");
  if (rows.length === 0) return null;
  let fila = rows[0];
  let cambio = false;
  let ciclos = 0;
  while (ciclos < MAX_CICLOS_POR_REQUEST) {
    const ahora = Date.now();
    const inicio = new Date(fila.inicio_estado).getTime();
    const elapsed = (ahora - inicio) / 1000;
    if (fila.estado === "apuestas" && fila.tiempo_restante != null && elapsed >= fila.tiempo_restante) {
      const ganador = elegirGanador(fila.cuotas);
      const video = elegirVideo(ganador);
      const duracionSeg = Math.ceil(video.duracion) + 12;
      fila.estado = "carrera";
      fila.inicio_estado = new Date().toISOString();
      fila.tiempo_restante = duracionSeg;
      fila.ganador = ganador;
      fila.video = video.url;
      fila.video_duracion = video.duracion;
      cambio = true; ciclos++;
      continue;
    }
    if (fila.estado === "carrera" && fila.tiempo_restante != null && elapsed >= fila.tiempo_restante) {
      fila.estado = "resultado";
      fila.inicio_estado = new Date().toISOString();
      fila.tiempo_restante = DURACION_RESULTADO;
      cambio = true; ciclos++;
      continue;
    }
    if (fila.estado === "resultado" && fila.tiempo_restante != null && elapsed >= fila.tiempo_restante) {
      const nuevoNumero = fila.numero_carrera >= 1000 ? 1 : fila.numero_carrera + 1;
      const nuevasCuotas = generarCuotas();
      const ultimos: number[] = fila.ultimos_ganadores ?? [];
      if (fila.ganador !== null) { ultimos.push(fila.ganador + 1); if (ultimos.length > 20) ultimos.shift(); }
      fila.estado = "apuestas";
      fila.inicio_estado = new Date().toISOString();
      fila.tiempo_restante = DURACION_APUESTAS;
      fila.numero_carrera = nuevoNumero;
      fila.cuotas = nuevasCuotas;
      fila.ganador = null;
      fila.video = null;
      fila.estadisticas = generarEstadisticas(nuevasCuotas);
      fila.ultimos_ganadores = ultimos;
      cambio = true; ciclos++;
      continue;
    }
    break;
  }
  if (cambio) {
    await pool.query(`UPDATE carreras_virtuales SET estado=$1, inicio_estado=$2, tiempo_restante=$3, numero_carrera=$4, cuotas=$5, ganador=$6, video=$7, estadisticas=$8, ultimos_ganadores=$9, video_duracion=$10 WHERE id=1`,
      [fila.estado, fila.inicio_estado, fila.tiempo_restante, fila.numero_carrera, JSON.stringify(fila.cuotas), fila.ganador, fila.video, JSON.stringify(fila.estadisticas), JSON.stringify(fila.ultimos_ganadores), fila.video_duracion || 0]);
  }
  const ahora = Date.now();
  const inicio = new Date(fila.inicio_estado).getTime();
  const elapsed = (ahora - inicio) / 1000;
  const remaining = fila.tiempo_restante != null ? Math.max(0, Math.ceil(fila.tiempo_restante - elapsed)) : 0;
  return { estado: fila.estado, tiempoRestante: remaining, cuotas: fila.cuotas, ganador: fila.ganador, video: fila.video, numeroCarrera: fila.numero_carrera, carreraId: fila.numero_carrera, estadisticas: fila.estadisticas, ultimosGanadores: fila.ultimos_ganadores ?? [] };
}

async function fetchJackpotRemates() {
  const result = await pool.query("SELECT monto FROM jackpot_remates WHERE id = 1");
  return { ok: true, monto: result.rows.length > 0 ? Number(result.rows[0].monto) : 0 };
}

async function fetchUsuario(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    const { rows } = await pool.query("SELECT id, nombre, sobrenombre, saldo, bloqueado, razon_bloqueo, rol FROM usuarios WHERE id = $1", [decoded.id]);
    if (rows.length === 0) return null;
    const u = rows[0];
    return { nombre: u.nombre, sobrenombre: u.sobrenombre, saldo: Number(u.saldo), bloqueado: u.bloqueado, razon_bloqueo: u.razon_bloqueo, rol: u.rol };
  } catch {
    return null;
  }
}

// â”€â”€â”€ registrar watchers globales (se ejecuta una vez al arrancar) â”€â”€â”€

sseManager.registerWatcher("global:carrera", fetchCarrera, DURACION_APUESTAS > 0 ? 1000 : 1000);
sseManager.registerWatcher("global:jackpot-remates", fetchJackpotRemates, 5000);

// â”€â”€â”€ endpoint SSE â”€â”€â”€

export async function GET(req: NextRequest) {
  const channels = req.nextUrl.searchParams.get("channels")?.split(",").filter(Boolean) || [];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      const unsubs: (() => void)[] = [];
      const intervals: NodeJS.Timeout[] = [];

      for (const ch of channels) {
        if (ch === "user:me") {
          const fetchAndSend = async () => {
            const data = await fetchUsuario(req);
            if (data) send("user:me", data);
          };
          fetchAndSend();
          intervals.push(setInterval(fetchAndSend, 5000));
        } else {
          unsubs.push(sseManager.subscribe(ch, (data) => send(ch, data)));
        }
      }

      send("connected", { channels });

      req.signal.addEventListener("abort", () => {
        unsubs.forEach((fn) => fn());
        intervals.forEach(clearInterval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
