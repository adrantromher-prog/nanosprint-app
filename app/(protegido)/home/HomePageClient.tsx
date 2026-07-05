"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";

export default function HomePageClient({ nombre, saldo: saldoInicial, bloqueado, razon_bloqueo, rol, mantenimiento: mantenimientoInicial }: any) {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState(bloqueado);
  const [razon, setRazon] = useState(razon_bloqueo);
  const [saldo, setSaldo] = useState(saldoInicial);
  const [mantenimiento, setMantenimiento] = useState(mantenimientoInicial);
  const [jackpotRemates, setJackpotRemates] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/remates/jackpot", { cache: "no-store" });
        const data = await res.json();
        if (data.ok) setJackpotRemates(data.monto);
      } catch {}
    })();
  }, []);

  const recargarDatos = useCallback(async () => {
    try {
      const [resME, resMant, r1] = await Promise.all([
        fetch(`/api/me?_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
        fetch("/api/admin/mantenimiento", { cache: "no-store" }).then(r => r.json()),
        fetch("/api/remates/jackpot", { cache: "no-store" }).then(r => r.json()),
      ]);
      if (resME.bloqueado) { setIsBlocked(true); setRazon(resME.razon_bloqueo); }
      setSaldo(resME.saldo);
      setMantenimiento(resMant.mantenimiento);
      if (r1.ok) setJackpotRemates(r1.monto);
    } catch {}
  }, []);

  useWebSocket(useCallback((event) => {
    if (["puja", "movimiento", "ganador", "jackpot_actualizado"].includes(event.type)) {
      recargarDatos();
    }
  }, [recargarDatos]));

  useEffect(() => {
    recargarDatos();
    const interval = setInterval(recargarDatos, 30000);
    return () => clearInterval(interval);
  }, [recargarDatos]);

  if (mantenimiento) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-white p-10 text-center"
        style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1f3c 50%, #091428 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-900/20 blur-[120px]" />
        </div>
        <div className="relative flex flex-col items-center gap-6 max-w-lg">
          <div className="text-7xl animate-pulse">🔧</div>
          <h1 className="text-4xl font-extrabold text-cyan-300 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]">Sitio en Mantenimiento</h1>
          <p className="text-white/70 text-lg leading-relaxed">Estamos realizando mejoras para brindarte una mejor experiencia. Vuelve en unos minutos.</p>
          <div className="w-full h-px bg-white/10 my-2" />
          <p className="text-white/40 text-sm font-mono tracking-widest">Nos disculpamos por los inconvenientes.</p>
        </div>
      </main>
    );
  }

  if (isBlocked) {
    return (
      <main className="min-h-screen bg-red-900 flex flex-col items-center justify-center text-white p-10 text-center">
        <h1 className="text-4xl font-bold mb-4">🚫 Usuario Bloqueado</h1>
        <p className="text-xl mb-6">Tu cuenta ha sido bloqueada por el administrador.</p>
        <div className="bg-red-800 p-6 rounded-xl border border-red-400 max-w-lg">
          <p className="text-lg font-semibold">Razón del bloqueo:</p>
          <p className="text-red-200 mt-2 text-lg">{razon || "No especificada"}</p>
        </div>
        <p className="mt-8 text-gray-300">Si crees que esto es un error, contacta al soporte.</p>
      </main>
    );
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden select-none">
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(255,200,0,0.12); }
          50% { box-shadow: 0 0 22px rgba(255,200,0,0.45), 0 0 40px rgba(255,200,0,0.15); }
        }
        @keyframes textShine {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.9; }
        }
        @keyframes jackpotPulse {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(255,200,0,0.25)); }
          50% { filter: drop-shadow(0 0 14px rgba(255,200,0,0.6)) drop-shadow(0 0 28px rgba(255,200,0,0.2)); }
        }
        @keyframes cardGlow {
          0%, 100% { box-shadow: 0 0 18px rgba(0,200,255,0.2), inset 0 1px 0 rgba(255,255,255,0.1); }
          50% { box-shadow: 0 0 30px rgba(0,200,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15); }
        }
        .jackpot-glow { animation: pulseGlow 2s ease-in-out infinite; }
        .jackpot-text-shine { animation: textShine 2s ease-in-out infinite; }
        .jackpot-amount { animation: jackpotPulse 2s ease-in-out infinite; }
        .btn-remates { animation: cardGlow 3s ease-in-out infinite; }
      `}</style>
      <video src="/fondos/fondohome.mp4" autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover scale-[1.1] brightness-[0.6] contrast-[1.1] saturate-[1.1]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none" />

      <div className="relative z-10 w-full h-full flex flex-col px-5 pt-5 pb-4">
        <div className="flex items-start justify-between flex-shrink-0">
          <button onClick={() => router.push("/perfil")}
            className="group relative px-5 py-3 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:bg-white/[0.09] active:scale-95 transition-all duration-300 text-left w-auto">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_12px_rgba(0,255,255,0.25)]">
                {nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white/60 text-[10px] font-semibold tracking-[0.15em] uppercase leading-tight">Bienvenido</p>
                <p className="text-white text-sm font-bold tracking-wide">{nombre}</p>
              </div>
            </div>
            <div className="relative flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.06]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
              <span className="text-green-300 font-extrabold text-base drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]">
                Bs. {Number(saldo).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {rol === "admin" && (
              <button onClick={() => window.location.href = "/admin"}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-b from-yellow-600 to-yellow-800 border border-yellow-400/50 text-white font-bold text-xs tracking-wide shadow-[0_0_18px_rgba(255,200,0,0.25)] hover:shadow-[0_0_28px_rgba(255,200,0,0.5)] active:scale-95 transition-all">
                Admin
              </button>
            )}
            <button onClick={async () => { await fetch("/api/logout", { method: "GET", credentials: "include" }); window.location.href = "/login"; }}
              className="px-5 py-3 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] text-white font-semibold text-sm tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:bg-white/[0.12] active:scale-95 transition-all">
              Salir
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center min-h-0 px-2 gap-3">
          <div className="flex flex-col gap-2 flex-1 max-w-[200px]">
            <button onClick={() => router.push("/remates/clasificacion")}
              className="jackpot-glow group relative w-full h-[50px] md:h-[60px] rounded-xl overflow-hidden bg-gradient-to-b from-yellow-900/60 via-amber-800/40 to-yellow-900/60 border border-yellow-400/40 shadow-[0_0_20px_rgba(255,200,0,0.15)] hover:shadow-[0_0_36px_rgba(255,200,0,0.45)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
              <div className="relative h-full flex items-center justify-center gap-2 px-3">
                <div className="text-yellow-200/80 group-hover:scale-110 group-hover:text-yellow-200 transition-all duration-300 drop-shadow-[0_0_8px_rgba(255,200,0,0.15)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 md:w-5 md:h-5">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M16 21v-2a4 4 0 00-8 0v2" />
                    <path d="M12 12v3" />
                    <path d="M10 15h4" />
                  </svg>
                </div>
                <span className="jackpot-text-shine text-yellow-200 font-bold text-[10px] md:text-xs tracking-[0.15em] uppercase drop-shadow-[0_0_4px_rgba(255,200,0,0.2)]">
                  CLASIFICACIÓN
                </span>
                <span className="jackpot-amount text-yellow-100 font-black text-xs md:text-sm drop-shadow-[0_0_8px_rgba(255,200,0,0.2)]">
                  Bs. {Number(jackpotRemates).toLocaleString("en-US", { minimumFractionDigits: 0 })}
                </span>
              </div>
            </button>
            <button onClick={() => router.push("/remates")}
              className="btn-remates group relative w-full h-[80px] md:h-[100px] rounded-2xl overflow-hidden bg-gradient-to-b from-cyan-500 to-blue-800 border border-cyan-400/40 shadow-[0_0_24px_rgba(0,200,255,0.25)] hover:shadow-[0_0_40px_rgba(0,200,255,0.6)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-400 ease-out">
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/[0.06] transition-opacity duration-300" />
              <div className="relative h-full flex flex-col items-center justify-center gap-0.5 md:gap-1 px-2">
                <div className="text-white/90 group-hover:scale-110 group-hover:text-white transition-all duration-300 drop-shadow-[0_0_8px_rgba(0,255,255,0.2)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6 md:w-8 md:h-8">
                    <path d="M5 20h14M5 20V8l7-5 7 5v12M5 20h14" />
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 3v3M12 18v3" />
                  </svg>
                </div>
                <span className="text-white text-base md:text-xl font-extrabold tracking-wide text-center leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                  REMATES
                </span>
              </div>
            </button>
          </div>

          <button onClick={() => router.push("/polla")}
            className="group relative flex-1 max-w-[200px] h-[134px] md:h-[164px] rounded-2xl overflow-hidden bg-gradient-to-b from-red-900/60 via-amber-800/40 to-red-900/60 border border-red-400/40 shadow-[0_0_20px_rgba(255,0,0,0.15)] hover:shadow-[0_0_36px_rgba(255,0,0,0.45)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
            <div className="relative h-full flex flex-col items-center justify-center gap-1 md:gap-2 px-2 md:px-4">
              <div className="text-red-200/80 group-hover:scale-110 group-hover:text-red-200 transition-all duration-300 drop-shadow-[0_0_8px_rgba(255,0,0,0.15)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7 md:w-10 md:h-10">
                  <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 9 6 9 6s2-2 4.5-2.5a2.5 2.5 0 010 5H18" />
                  <path d="M18 9v11" />
                  <path d="M6 20v-6" />
                  <path d="M6 14c0-1.5 1.5-3 3-3s3 1.5 3 3" />
                  <path d="M12 14c0-1.5 1.5-3 3-3s3 1.5 3 3" />
                  <path d="M6 14H3" />
                  <path d="M18 14h3" />
                </svg>
              </div>
              <span className="text-red-200 font-bold tracking-[0.2em] md:tracking-[0.25em] uppercase drop-shadow-[0_0_4px_rgba(255,0,0,0.2)] hidden md:block text-[10px]">JUEGA YA</span>
              <span className="text-red-100 font-black text-lg md:text-2xl tracking-wide text-center drop-shadow-[0_0_8px_rgba(255,0,0,0.2)]">
                POLLA
              </span>
              <span className="text-red-300/50 font-bold tracking-[0.2em] md:tracking-[0.25em] uppercase hidden md:block text-[8px]">HÍPICA</span>
            </div>
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 flex-shrink-0 px-4">
          {[
            { label: "Depósito", icon: "M12 4v16m-8-8h16", action: () => window.open(`https://wa.me/584123888175?text=${encodeURIComponent("DEPOSITO - " + nombre)}`, "_blank") },
            { label: "Retiro", icon: "M12 20V4M4 12h16", action: () => window.open(`https://wa.me/584123888175?text=${encodeURIComponent("RETIRO - " + nombre)}`, "_blank") },
            { label: "Historial", icon: "M4 6h16M4 12h16M4 18h12", action: () => router.push("/historial") },
            { label: "Soporte", icon: "M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 8v4M12 16h.01", action: () => window.open(`https://wa.me/584123888175?text=${encodeURIComponent("SOPORTE")}`, "_blank") },
          ].map((item) => (
            <button key={item.label} onClick={item.action}
              className="group flex flex-col items-center gap-1.5 w-[18%] py-3 rounded-xl bg-white/[0.05] backdrop-blur-lg border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/20 active:scale-95 transition-all duration-200">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                className="w-5 h-5 text-white/50 group-hover:text-cyan-300 transition-colors duration-200">
                <path d={item.icon} />
              </svg>
              <span className="text-[11px] font-semibold text-white/50 group-hover:text-white/80 tracking-wide transition-colors duration-200">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
