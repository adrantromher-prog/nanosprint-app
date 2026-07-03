"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Caballo {
  id: number;
  numero: number;
  nombre: string;
  retirado: boolean;
}

interface Carrera {
  id: number;
  hipodromo: string;
  numero_carrera: number;
  hora_cierre: string;
  tipo: string;
  estado: string;
  ganador: number | null;
  caballos: Caballo[];
}

interface TemporizadorProps {
  horaCierre: string;
  compact?: boolean;
  estado?: string;
}

function Temporizador({ horaCierre, compact, estado }: TemporizadorProps) {
  const [tiempoRestante, setTiempoRestante] = useState("");
  const [abierto, setAbierto] = useState(true);

  const cerrado = estado === "cerrada";

  useEffect(() => {
    if (cerrado) {
      setAbierto(false);
      setTiempoRestante("");
      return;
    }
    const calcular = () => {
      const ahora = new Date();
      const [horas, minutos] = horaCierre.split(":").map(Number);
      const cierre = new Date();
      cierre.setHours(horas, minutos, 0, 0);
      const diff = cierre.getTime() - ahora.getTime();

      if (diff <= 0) {
        setAbierto(false);
        setTiempoRestante("00:00:00");
        return;
      }
      setAbierto(true);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTiempoRestante(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    calcular();
    const intervalo = setInterval(calcular, 1000);
    return () => clearInterval(intervalo);
  }, [horaCierre, cerrado]);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
        abierto
          ? "bg-green-500/15 text-green-300 border border-green-400/30 shadow-[0_0_8px_rgba(0,255,0,0.05)]"
          : "bg-red-500/15 text-red-300 border border-red-400/30 shadow-[0_0_8px_rgba(255,0,0,0.05)]"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${abierto ? "bg-green-400 shadow-[0_0_4px_rgba(0,255,0,0.4)]" : "bg-red-400 shadow-[0_0_4px_rgba(255,0,0,0.4)]"}`} />
        <span>{abierto ? "ACTIVO" : "CERRADO"}</span>
        {abierto && <span className="text-white/40">|</span>}
        {abierto && <span className="text-white font-mono text-[10px]">{tiempoRestante}</span>}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`px-3 py-1 rounded-full text-sm font-bold ${abierto ? "bg-green-500/20 text-green-300 border border-green-400/50" : "bg-red-500/20 text-red-300 border border-red-400/50"}`}>
        {abierto ? "● ABIERTO" : "● CERRADO"}
      </span>
      <span className="text-white font-mono text-sm">{tiempoRestante}</span>
    </div>
  );
}

function TarjetaCarrera({ carrera, onClick }: { carrera: Carrera; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="
        flex items-center gap-3 px-4 py-3
        bg-gradient-to-r from-gray-900/80 to-gray-900/40
        border border-gray-700/50 rounded-xl
        cursor-pointer
        hover:border-cyan-400/40 hover:from-gray-800/80 hover:to-gray-800/40
        hover:shadow-[0_0_16px_rgba(0,255,255,0.1)]
        active:scale-[0.99]
        transition-all duration-200
      "
    >
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-cyan-300">#{carrera.numero_carrera}</span>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white truncate">{carrera.hipodromo}</h3>
        </div>
      </div>

      <Temporizador horaCierre={carrera.hora_cierre} compact estado={carrera.estado} />

      {carrera.ganador && (
        <span className="text-[10px] font-bold text-yellow-300 bg-yellow-500/15 border border-yellow-400/30 px-2 py-0.5 rounded-full whitespace-nowrap shadow-[0_0_8px_rgba(255,200,0,0.1)]">
          🏆 #{carrera.ganador}
        </span>
      )}

      <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-400/10 group-hover:border-cyan-400/30 transition-all">
        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </div>
    </div>
  );
}

export default function LobbyRemates() {
  const [usuario, setUsuario] = useState<any>(null);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [jackpot, setJackpot] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`/api/me?_t=${Date.now()}`, { cache: "no-store" });
        const data = await res.json();
        if (data.nombre) setUsuario(data);
      } catch {}
    };
    fetchUser();
    const intervalo = setInterval(fetchUser, 5000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const fetchCarreras = async () => {
      try {
        const res = await fetch("/api/remates/activas");
        const data = await res.json();
        if (data.ok) setCarreras(data.carreras);
      } catch {}
    };
    fetchCarreras();
    const intervalo = setInterval(fetchCarreras, 5000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const fetchJackpot = async () => {
      try {
        const res = await fetch("/api/remates/jackpot");
        const data = await res.json();
        if (data.ok) setJackpot(data.monto);
      } catch {}
    };
    fetchJackpot();
    const intervalo = setInterval(fetchJackpot, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const nacionales = carreras.filter((c) => c.tipo === "nacional");
  const americanas = carreras.filter((c) => c.tipo === "americana");

  if (!usuario) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-gray-400 text-sm tracking-wide">Cargando...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-full text-white overflow-hidden">

      <video
        src="/fondos/fondoapuesta.mp4"
        autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover scale-[1.2] brightness-[0.7] contrast-[1.2] saturate-[1.1] blur-[1.5px]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/90" />

      <style>{`
        @keyframes jackpotShimmer {
          0% { background-position: -400% center; }
          100% { background-position: 400% center; }
        }
        @keyframes jackpotOuterGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,200,0,0.3), 0 0 50px rgba(255,200,0,0.15), 0 0 80px rgba(255,200,0,0.05); }
          50% { box-shadow: 0 0 30px rgba(255,200,0,0.6), 0 0 80px rgba(255,200,0,0.3), 0 0 150px rgba(255,200,0,0.15), 0 0 200px rgba(255,200,0,0.05); }
        }
        @keyframes jackpotBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        .jackpot-outer-glow { animation: jackpotOuterGlow 2.5s ease-in-out infinite; }
        .jackpot-breathe { animation: jackpotBreathe 2.5s ease-in-out infinite; }
        .jackpot-shimmer {
          background: linear-gradient(90deg, #FCD34D 0%, #FEF3C7 15%, #F59E0B 30%, #FEF3C7 50%, #FCD34D 65%, #FEF3C7 80%, #F59E0B 100%);
          background-size: 400% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: jackpotShimmer 2.5s linear infinite;
        }
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>

      <div className="relative z-10 flex flex-col h-full p-4 gap-3">

        <div className="flex items-center justify-between gap-3 flex-shrink-0">

          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_10px_rgba(0,255,255,0.2)]">
              {usuario.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-tight">{usuario.nombre}</p>
              <p className="text-green-300 font-extrabold text-sm drop-shadow-[0_0_6px_rgba(0,255,0,0.3)]">
                Bs. {Number(usuario.saldo).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/remates/clasificacion")}
            className="jackpot-breathe jackpot-outer-glow inline-flex items-center gap-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-950/50 via-yellow-700/50 to-amber-950/50 border-2 border-yellow-400/50 cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-200"
          >
            <div className="flex flex-col items-center">
              <span className="jackpot-shimmer text-xl font-black tracking-wide">Bs. {jackpot.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
              <span className="text-yellow-300/50 text-[8px] font-bold tracking-[0.3em] uppercase leading-tight">ACUMULADO</span>
            </div>
          </button>

          <button
            onClick={() => router.push("/home")}
            className="px-3 py-2 rounded-lg bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-500/50 text-white font-bold text-xs shadow-[0_0_8px_rgba(100,200,255,0.1)] hover:shadow-[0_0_14px_rgba(100,200,255,0.3)] hover:border-cyan-400/40 active:scale-95 transition-all duration-200"
          >
            ← Salir
          </button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-4">

          <section className="flex flex-col min-h-0 bg-gradient-to-b from-gray-900/40 to-transparent rounded-2xl p-3 border border-white/[0.03]">
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,255,255,0.4)]" />
              <h2 className="text-lg font-bold text-cyan-300 drop-shadow-[0_0_6px_rgba(0,255,255,0.2)] tracking-wide">
                Nacionales
              </h2>
              <span className="text-[10px] text-gray-600 font-mono ml-auto">{nacionales.length} carrera{(nacionales.length !== 1 ? "s" : "")}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scroll">
              {nacionales.length === 0
                ? <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <span className="text-2xl mb-2">🏇</span>
                    <p className="text-xs">No hay carreras activas</p>
                  </div>
                : nacionales.map((c) => (
                  <TarjetaCarrera
                    key={c.id}
                    carrera={c}
                    onClick={() => router.push(`/remates/carrera/${c.id}`)}
                  />
                ))
              }
            </div>
          </section>

          <section className="flex flex-col min-h-0 bg-gradient-to-b from-gray-900/40 to-transparent rounded-2xl p-3 border border-white/[0.03]">
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(200,0,255,0.4)]" />
              <h2 className="text-lg font-bold text-purple-300 drop-shadow-[0_0_6px_rgba(200,0,255,0.2)] tracking-wide">
                Americanas
              </h2>
              <span className="text-[10px] text-gray-600 font-mono ml-auto">{americanas.length} carrera{(americanas.length !== 1 ? "s" : "")}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scroll">
              {americanas.length === 0
                ? <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <span className="text-2xl mb-2">🏇</span>
                    <p className="text-xs">No hay carreras activas</p>
                  </div>
                : americanas.map((c) => (
                  <TarjetaCarrera
                    key={c.id}
                    carrera={c}
                    onClick={() => router.push(`/remates/carrera/${c.id}`)}
                  />
                ))
              }
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}