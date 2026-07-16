"use client";

import { useState, useEffect } from "react";
import CarreraView from "../CarreraView";

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

const coloresHexBg = ["#dc2626", "#e5e7eb", "#2563eb", "#facc15", "#16a34a", "#0f172a"];
const coloresHexText = ["#ffffff", "#0f172a", "#ffffff", "#0f172a", "#ffffff", "#ffffff"];

export default function PCSpectatorPage() {
  const [etapa, setEtapa] = useState<string>("apuestas");
  const [tiempo, setTiempo] = useState<number>(0);
  const [cuotas, setCuotas] = useState<number[]>([]);
  const [estadisticas, setEstadisticas] = useState<CaballoStat[]>([]);
  const [ultimosGanadores, setUltimosGanadores] = useState<number[]>([]);
  const [carreraNum, setCarreraNum] = useState<number>(1);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [ganador, setGanador] = useState<number | null>(null);
  const [transicionActiva, setTransicionActiva] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/carrera", { cache: "no-store" });
        const data = await res.json();
        if (data.estado !== etapa) {
          setTransicionActiva(true);
          setTimeout(() => {
            setEtapa(data.estado);
            setTransicionActiva(false);
          }, 1100);
        }
        setTiempo(data.tiempoRestante);
        setCuotas(data.cuotas ?? []);
        setEstadisticas(data.estadisticas ?? []);
        setUltimosGanadores(data.ultimosGanadores ?? []);
        setCarreraNum(data.numeroCarrera ?? 1);
        setVideoUrl(data.video ?? "");
        setGanador(data.ganador);
      } catch {}
    };
    poll();
    const ms = etapa === "apuestas" ? 1000 : 3000;
    const interval = setInterval(poll, ms);
    return () => clearInterval(interval);
  }, [etapa]);

  const barColor = (v: number) => v >= 85 ? "#22c55e" : v >= 75 ? "#eab308" : "#ef4444";

  if (etapa === "carrera" && videoUrl) {
    return <CarreraView url={videoUrl} carreraNum={carreraNum} />;
  }

  const ultimos10 = [...ultimosGanadores].reverse().slice(0, 10);

  // Si es carrera, mostrar CarreraView dentro del mismo layout (para que la transición sea visible)
  if (etapa === "carrera" && videoUrl) {
    return (
      <div className="fixed inset-0">
        <div className={`pointer-events-none fixed inset-0 z-[999] bg-gradient-to-b from-[#001a33] via-[#003366] to-[#000814] backdrop-blur-[12px] bg-contain bg-no-repeat bg-center transition-transform duration-[1100ms] ease-out ${transicionActiva ? "translate-y-0" : "-translate-y-full"}`}
          style={{ backgroundImage: "url('/transicion.png')" }} />
        <CarreraView url={videoUrl} carreraNum={carreraNum} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden text-white select-none"
      style={{ background: "linear-gradient(135deg, #05080f 0%, #070d1a 50%, #040a12 100%)" }}>

      {/* TRANSICIÓN */}
      <div className={`pointer-events-none fixed inset-0 z-[999] bg-gradient-to-b from-[#001a33] via-[#003366] to-[#000814] backdrop-blur-[12px] bg-contain bg-no-repeat bg-center transition-transform duration-[1100ms] ease-out ${transicionActiva ? "translate-y-0" : "-translate-y-full"}`}
        style={{ backgroundImage: "url('/transicion.png')" }} />

      {/* ORBES DE FONDO */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      {/* TIMER */}
      <div className="absolute top-0 left-0 right-0 flex justify-center pt-4 z-20">
        <div className="text-center">
          <p className="text-white/40 text-xs font-bold tracking-widest uppercase">
            Carrera #{String(carreraNum).padStart(4, "0")}
          </p>
          <p className={`font-extrabold transition-all ${tiempo <= 5 ? "text-red-500 animate-pulse" : "text-white/80"}`}
            style={{ fontSize: "8rem", lineHeight: "0.85" }}>
            {tiempo}
          </p>
          <p className="text-white/25 text-xs uppercase tracking-[0.3em]">
            {etapa === "resultado" ? "Resultados" : "Apuestas abiertas"}
          </p>
        </div>
      </div>

      {/* GANADOR — RESULTADOS */}
      {etapa === "resultado" && ganador !== null && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center"
          style={{ background: "linear-gradient(135deg, #05080f 0%, #070d1a 50%, #040a12 100%)" }}>
          <div className="relative text-center px-8">
            <p className="text-white/25 text-xs font-mono tracking-widest uppercase mb-6">Carrera #{String(carreraNum).padStart(4, "0")}</p>
            <div className="mb-2 text-sm text-white/40 uppercase tracking-[0.2em] font-semibold">Ganador</div>
            <p className="text-8xl font-black text-white/40 animate-pulse mb-2">#{ganador + 1}</p>
            <h1 className="text-8xl font-black text-white mb-2 tracking-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
              {estadisticas[ganador]?.nombre || ("Caballo " + (ganador + 1))}
            </h1>
            <div className="flex items-center justify-center gap-10 mb-8">
              <div className="text-center">
                <p className="text-white/30 text-xs uppercase tracking-[0.15em] mb-1">Cuota</p>
                <p className="text-green-400 font-black text-3xl drop-shadow-[0_0_10px_rgba(0,255,0,0.2)]">x{cuotas[ganador]?.toFixed(2) || "—"}</p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <p className="text-white/30 text-xs uppercase tracking-[0.15em] mb-1">Premio base</p>
                <p className="text-amber-400 font-black text-3xl drop-shadow-[0_0_10px_rgba(255,200,0,0.2)]">Bs. {((cuotas[ganador] || 0) * 500).toLocaleString()}</p>
              </div>
            </div>
            <div className="text-white/15 text-xs">NanoSprint — Carreras Virtuales</div>
          </div>
        </div>
      )}

      {/* ÚLTIMOS GANADORES — IZQUIERDA */}
      <div className="absolute left-4 top-24 z-20 flex flex-col items-center gap-1.5">
        <div className="text-center leading-tight mb-0.5">
          <p className="text-amber-400/60 text-xs uppercase tracking-[0.25em] font-extrabold">Últimos</p>
          <p className="text-amber-400/35 text-[10px] uppercase tracking-[0.25em] font-bold">Ganadores</p>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          {ultimos10.map((num, i) => {
            const numCarrera = carreraNum - 1 - i;
            return (
            <div key={i} className="flex items-center gap-1.5">
              <div style={{ backgroundColor: coloresHexBg[num - 1], color: coloresHexText[num - 1] }}
                className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-extrabold border border-white/10 shadow-md">
                {num}
              </div>
              <span className="text-white/40 text-sm font-mono">#{numCarrera > 0 ? numCarrera : "?"}</span>
            </div>
            );
          })}
        </div>
      </div>

      {/* STATS 3×2 */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="grid grid-cols-3 gap-5 w-full max-w-[1200px] px-20 ml-24 mt-10">
          {estadisticas.slice(0, 6).map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
              <div className="h-14 flex items-center justify-center gap-2 text-base font-bold px-3"
                style={{ backgroundColor: coloresHexBg[i], color: coloresHexText[i] }}>
                <span className="opacity-80 text-base font-bold">#{stat.numero}</span>
                <span>{stat.nombre || ("Caballo " + stat.numero)}</span>
              </div>
              <div className="p-5 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="opacity-50">Estilo</span>
                  <span className="font-semibold">{stat.estilo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-50 w-7">Vel</span>
                  <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: stat.velocidad + "%", backgroundColor: barColor(stat.velocidad) }} />
                  </div>
                  <span className="text-sm font-semibold w-6 text-right">{stat.velocidad}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm opacity-50 w-7">Res</span>
                  <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: stat.resistencia + "%", backgroundColor: barColor(stat.resistencia) }} />
                  </div>
                  <span className="text-sm font-semibold w-6 text-right">{stat.resistencia}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-50">Forma</span>
                  <span className={`font-semibold ${stat.forma === "Excelente" ? "text-green-400" : stat.forma === "Buena" ? "text-yellow-400" : "text-red-400"}`}>{stat.forma}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs opacity-40">Lleg:</span>
                  {stat.ultimasLlegadas.slice(0, 5).map((pos, j) => (
                    <div key={j} className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${pos <= 2 ? "bg-green-500/30 text-green-300" : pos <= 4 ? "bg-yellow-500/25 text-yellow-300" : "bg-red-500/20 text-red-300"}`}>{pos}</div>
                  ))}
                </div>
                <div className="text-center pt-2 border-t border-white/5 mt-1.5">
                  <span className="text-xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">x{cuotas[i]?.toFixed(2) || "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
