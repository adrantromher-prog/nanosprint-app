"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";

export default function HomePageClient({ nombre, saldo: saldoInicial, bloqueado, razon_bloqueo, rol }: any) {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState(bloqueado);
  const [razon, setRazon] = useState(razon_bloqueo);
  const [saldo, setSaldo] = useState(saldoInicial);

  const recargarDatos = useCallback(async () => {
    try {
      const resME = await fetch(`/api/me?_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json());
      if (resME.bloqueado) { setIsBlocked(true); setRazon(resME.razon_bloqueo); }
      setSaldo(resME.saldo);
    } catch {}
  }, []);

  useWebSocket(useCallback((event) => {
    if (event.type === "puja" && event.saldo !== undefined) {
      setSaldo(event.saldo);
    }
    if (event.type === "movimiento" && event.usuario_id) {
      recargarDatos();
    }
    if (event.type === "ganador" || event.type === "jackpot_actualizado" || event.type === "sync_estado") {
      recargarDatos();
    }
  }, [recargarDatos]));

  useEffect(() => {
    recargarDatos();
  }, [recargarDatos]);

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

  if (rol === "taquilla") {
    return (
      <main className="min-h-screen w-full text-white overflow-hidden flex flex-col"
        style={{ background: "linear-gradient(135deg, #05080f 0%, #070d1a 50%, #040a12 100%)" }}>
        
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-[120px]" />
          <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[100px]" />
        </div>

        <div className="relative z-10 flex-1 flex flex-col px-5 pt-5 pb-4 max-w-lg mx-auto w-full">
          
          <div className="flex items-center justify-between mb-8">
            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.10] rounded-2xl px-5 py-3 shadow-lg">
              <p className="text-white font-bold text-lg">{nombre}</p>
              <p className="text-white/30 text-xs uppercase tracking-widest font-medium">Taquilla</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-white/30 text-[10px] uppercase tracking-wider">Saldo</p>
                <p className="text-green-400 font-extrabold text-base">Bs. {(Number(saldo) || 0).toLocaleString()}</p>
              </div>
              <button onClick={async () => { await fetch("/api/logout", { method: "GET", credentials: "include" }); window.location.href = "/login"; }}
                className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white/60 text-xs font-semibold hover:bg-white/[0.10] active:scale-95 transition-all">
                Salir
              </button>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white/90">Panel de Taquilla</h2>
            <p className="text-white/30 text-sm mt-1">Selecciona una opción para comenzar</p>
          </div>

          <div className="grid grid-cols-1 gap-4 flex-1 content-center">
            <button onClick={() => router.push("/taquilla")}
              className="group relative h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-600/40 to-emerald-900/40 border border-emerald-400/30 hover:border-emerald-400/60 active:scale-[0.98] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="relative h-full flex items-center gap-5 px-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-2xl shrink-0">{'🎫'}</div>
                <div className="text-left">
                  <p className="text-white font-bold text-lg">Vender Pollas</p>
                  <p className="text-emerald-300/60 text-xs mt-0.5">Gestión de venta de pollas hípicas</p>
                </div>
                <div className="ml-auto text-white/20 text-2xl">{'→'}</div>
              </div>
            </button>

            <button onClick={() => window.open("/carrerasvirtuales/pc", "_blank")}
              className="group relative h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-600/40 to-blue-900/40 border border-cyan-400/30 hover:border-cyan-400/60 active:scale-[0.98] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="relative h-full flex items-center gap-5 px-6">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-2xl shrink-0">{'📺'}</div>
                <div className="text-left">
                  <p className="text-white font-bold text-lg">Video</p>
                  <p className="text-cyan-300/60 text-xs mt-0.5">Carreras virtuales en vivo</p>
                </div>
                <div className="ml-auto text-white/20 text-2xl">{'→'}</div>
              </div>
            </button>

            <button onClick={() => router.push("/carrerasvirtuales/venta")}
              className="group relative h-28 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-600/40 to-indigo-900/40 border border-purple-400/30 hover:border-purple-400/60 active:scale-[0.98] transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="relative h-full flex items-center gap-5 px-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-2xl shrink-0">{'🐎'}</div>
                <div className="text-left">
                  <p className="text-white font-bold text-lg">Vender Carreras Virtuales</p>
                  <p className="text-purple-300/60 text-xs mt-0.5">Apuestas de carreras virtuales</p>
                </div>
                <div className="ml-auto text-white/20 text-2xl">{'→'}</div>
              </div>
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-white/[0.04] text-[10px] uppercase tracking-[0.3em] font-medium">NanoSprint</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden select-none">
      <style>{`
        @keyframes cardGlow {
          0%, 100% { box-shadow: 0 0 18px rgba(0,200,255,0.2), inset 0 1px 0 rgba(255,255,255,0.1); }
          50% { box-shadow: 0 0 30px rgba(0,200,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15); }
        }
        .btn-remates { animation: cardGlow 3s ease-in-out infinite; }
      `}</style>
      <div className="absolute inset-0 opacity-[0.03] bg-[length:40px_40px] bg-[image:radial-gradient(circle,rgba(255,255,255,0.15)_1px,transparent_1px)]" />

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
            {rol === "admin" && (
              <button onClick={() => router.push("/home/poker")}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-b from-green-600 to-emerald-800 border border-green-400/50 text-white font-bold text-xs tracking-wide shadow-[0_0_18px_rgba(34,197,94,0.25)] hover:shadow-[0_0_28px_rgba(34,197,94,0.5)] active:scale-95 transition-all">
                Poker
              </button>
            )}
            <button onClick={async () => { await fetch("/api/logout", { method: "GET", credentials: "include" }); window.location.href = "/login"; }}
              className="px-5 py-3 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] text-white font-semibold text-sm tracking-wide shadow-[4px_16px_rgba(0,0,0,0.3)] hover:bg-white/[0.12] active:scale-95 transition-all">
              Salir
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center min-h-0 px-2 gap-3">
          <button onClick={() => router.push("/remates")}
            className="btn-remates group relative flex-1 max-w-[200px] h-[130px] md:h-[160px] rounded-2xl overflow-hidden bg-gradient-to-b from-cyan-500 to-blue-800 border border-cyan-400/40 shadow-[0_0_24px_rgba(0,200,255,0.25)] hover:shadow-[0_0_40px_rgba(0,200,255,0.6)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-400 ease-out">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/[0.06] transition-opacity duration-300" />
            <div className="relative h-full flex flex-col items-center justify-center gap-1 md:gap-2 px-2 md:px-4">
              <div className="text-white/90 group-hover:scale-110 group-hover:text-white transition-all duration-300 drop-shadow-[0_0_8px_rgba(0,255,255,0.2)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8 md:w-11 md:h-11">
                  <path d="M5 20h14M5 20V8l7-5 7 5v12M5 20h14" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 3v3M12 18v3" />
                </svg>
              </div>
              <span className="text-white text-lg md:text-2xl font-extrabold tracking-wide text-center leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
                REMATES
              </span>
              <span className="text-white/40 font-medium tracking-wide text-center leading-tight max-w-[120px] md:max-w-[160px] hidden md:block text-[10px]">
                Subastas de caballos
              </span>
            </div>
          </button>

          <button onClick={() => router.push("/carrerasvirtuales")}
            className="group relative flex-1 max-w-[200px] h-[130px] md:h-[160px] rounded-2xl overflow-hidden bg-gradient-to-b from-purple-600 to-indigo-800 border border-purple-400/40 shadow-[0_0_24px_rgba(180,0,255,0.25)] hover:shadow-[0_0_40px_rgba(200,0,255,0.6)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
            <div className="relative h-full flex flex-col items-center justify-center gap-1 md:gap-2 px-2 md:px-4">
              <div className="text-white/90 group-hover:scale-110 group-hover:text-white transition-all duration-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-7 h-7 md:w-10 md:h-10">
                  <circle cx="5" cy="18" r="2" />
                  <circle cx="19" cy="18" r="2" />
                  <path d="M5 18V6h14l-3 6 3 6H5z" />
                  <path d="M8 12h8" />
                </svg>
              </div>
              <span className="text-white/60 font-bold tracking-[0.2em] md:tracking-[0.25em] uppercase hidden md:block text-[10px]">APUESTA YA</span>
              <span className="text-white font-black text-lg md:text-2xl tracking-wide text-center drop-shadow-[0_0_8px_rgba(0,0,0,0.4)]">
                VIRTUALES
              </span>
              <span className="text-white/40 font-bold tracking-[0.2em] md:tracking-[0.25em] uppercase hidden md:block text-[8px]">CARRERAS</span>
            </div>
          </button>

          <button onClick={() => router.push("/polla")}
            className="group relative flex-1 max-w-[200px] h-[130px] md:h-[160px] rounded-2xl overflow-hidden bg-gradient-to-b from-cyan-500 to-blue-800 border border-cyan-400/40 shadow-[0_0_24px_rgba(0,200,255,0.25)] hover:shadow-[0_0_40px_rgba(0,200,255,0.6)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
            <div className="relative h-full flex flex-col items-center justify-center gap-1 md:gap-2 px-2 md:px-4">
              <div className="text-white/90 group-hover:scale-110 group-hover:text-white transition-all duration-300 drop-shadow-[0_0_8px_rgba(0,255,255,0.2)]">
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
              <span className="text-white/60 font-bold tracking-[0.2em] md:tracking-[0.25em] uppercase drop-shadow-[0_0_4px_rgba(0,255,255,0.2)] hidden md:block text-[10px]">JUEGA YA</span>
              <span className="text-white font-black text-lg md:text-2xl tracking-wide text-center drop-shadow-[0_0_8px_rgba(0,0,0,0.4)]">
                POLLA
              </span>
              <span className="text-white/40 font-bold tracking-[0.2em] md:tracking-[0.25em] uppercase hidden md:block text-[8px]">HÍPICA</span>
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
