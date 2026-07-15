"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type CaballoStat = {
  numero: number;
  nombre: string;
  velocidad: number;
  resistencia: number;
  forma: string;
  ultimasLlegadas: number[];
  color: string;
  estilo: string;
};

const coloresHex = [
  "#dc2626", "#e5e7eb", "#2563eb",
  "#facc15", "#16a34a", "#0f172a",
];

const coloresTextHex = [
  "#ffffff", "#0f172a", "#ffffff",
  "#0f172a", "#ffffff", "#ffffff",
];

export default function PCSpectatorPage() {
  const [estado, setEstado] = useState<string>("apuestas");
  const [tiempo, setTiempo] = useState<number>(0);
  const [estadisticas, setEstadisticas] = useState<CaballoStat[]>([]);
  const [ultimosGanadores, setUltimosGanadores] = useState<number[]>([]);
  const [carreraNum, setCarreraNum] = useState<number>(1);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [ganador, setGanador] = useState<number | null>(null);
  const [sonidoActivo, setSonidoActivo] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const activarSonido = useCallback(() => {
    setSonidoActivo(true);
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new AudioContext();
      } catch {}
    }
  }, []);

  const playBeep = useCallback(() => {
    if (!sonidoActivo || !audioCtxRef.current) return;
    try {
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }, [sonidoActivo]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/carrera", { cache: "no-store" });
        const data = await res.json();
        setEstado(data.estado);
        setTiempo(data.tiempoRestante);
        setEstadisticas(data.estadisticas ?? []);
        setUltimosGanadores(data.ultimosGanadores ?? []);
        setCarreraNum(data.numeroCarrera ?? 1);
        setVideoUrl(data.video ?? "");
        setGanador(data.ganador);
      } catch {}
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (tiempo <= 5 && tiempo > 0 && estado === "apuestas") {
      playBeep();
    }
  }, [tiempo, estado, playBeep]);

  const getBarColor = (v: number) =>
    v >= 85 ? "bg-green-500" : v >= 75 ? "bg-yellow-400" : "bg-red-500";

  if (estado === "carrera" && videoUrl) {
    return (
      <div className="fixed inset-0 bg-black">
        <video
          key={videoUrl}
          src={videoUrl}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden text-white select-none"
      style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1f3c 50%, #091428 100%)" }}
    >
      {/* SONIDO */}
      {!sonidoActivo && (
        <button
          onClick={activarSonido}
          className="absolute top-4 right-4 z-30 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 transition-all text-lg"
        >
          Activar sonido
        </button>
      )}
      {sonidoActivo && (
        <button
          onClick={() => setSonidoActivo(false)}
          className="absolute top-4 right-4 z-30 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 font-bold hover:bg-white/10 transition-all text-sm"
        >
          Silenciar
        </button>
      )}

      {/* TIMER GIGANTE */}
      <div className="absolute top-0 left-0 right-0 flex justify-center pt-8 z-20">
        <div className="text-center">
          <p className="text-cyan-300 text-lg font-bold tracking-widest drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]">
            Carrera #{String(carreraNum).padStart(4, "0")}
          </p>
          <p className={`font-extrabold drop-shadow-[0_0_30px_rgba(0,255,255,0.8)] transition-all ${
            tiempo <= 5 ? "text-red-500 animate-pulse text-9xl" : "text-cyan-300 text-8xl"
          }`} style={{ lineHeight: "1" }}>
            {tiempo}
          </p>
          <p className="text-white/50 text-lg uppercase tracking-[0.3em] mt-1">
            {estado === "resultado" ? "Resultados" : "Apuestas abiertas"}
          </p>
        </div>
      </div>

      {/* GRID 3Ã—2 CABALLOS */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="grid grid-cols-3 gap-4 w-full max-w-[900px] px-8 mt-20">
          {estadisticas.map((stat, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden bg-black/40 backdrop-blur-md border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            >
              <div
                className="w-full h-12 flex items-center justify-center text-sm font-extrabold px-2"
                style={{ backgroundColor: coloresHex[i], color: coloresTextHex[i] }}
              >
                {stat.nombre || ("Caballo " + stat.numero)}
              </div>
              <div className="p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="opacity-70">Estilo</span>
                  <span className="font-semibold">{stat.estilo}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="opacity-70">Vel</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${getBarColor(stat.velocidad)}`} style={{ width: `${stat.velocidad}%` }} />
                  </div>
                  <span className="font-semibold w-6 text-right">{stat.velocidad}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="opacity-70">Res</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${getBarColor(stat.resistencia)}`} style={{ width: `${stat.resistencia}%` }} />
                  </div>
                  <span className="font-semibold w-6 text-right">{stat.resistencia}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Forma</span>
                  <span className={`font-semibold ${
                    stat.forma === "Excelente" ? "text-green-400" :
                    stat.forma === "Buena" ? "text-yellow-400" : "text-red-400"
                  }`}>{stat.forma}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-70">Ãšltimas</span>
                  <span className="font-semibold">{stat.ultimasLlegadas.join("Â° ")}Â°</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GANADOR (resultado) */}
      {estado === "resultado" && ganador !== null && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="px-8 py-4 rounded-2xl bg-gradient-to-r from-yellow-600 to-orange-600 border-2 border-yellow-400 shadow-[0_0_30px_rgba(255,200,0,0.5)]">
            <p className="text-white text-2xl font-extrabold uppercase tracking-wider">
              Ganador: {estadisticas[ganador]?.nombre || ("Caballo " + (ganador + 1))}
            </p>
          </div>
        </div>
      )}

      {/* ÃšLTIMOS GANADORES */}
      {ultimosGanadores.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20 flex gap-1.5">
          <span className="text-white/40 text-xs mr-1 self-end">Ãšltimos:</span>
          {[...ultimosGanadores].reverse().slice(0, 10).map((num, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-extrabold border border-white/20"
              style={{ backgroundColor: coloresHex[num - 1], color: coloresTextHex[num - 1] }}
            >
              {num}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
