"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";

function ModalPendientes({ nombre }: { nombre: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [pagando, setPagando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");

  const cargar = async () => {
    setCargando(true);
    const res = await fetch("/api/taquilla/estadisticas").then(r => r.json());
    if (res.ok) setPendientes(res.pendientes_pago || []);
    setCargando(false);
  };

  useEffect(() => { if (abierto) cargar(); }, [abierto]);

  const confirmarPago = async (p: any) => {
    if (!confirm(`¿Confirmas que pagaste Bs. ${Number(p.premio).toLocaleString()} al cliente?`)) return;
    setPagando(p.id);
    setMensaje("");
    const res = await fetch("/api/taquilla/confirmar-pago", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polla_id: p.polla_id, usuario_id: p.usuario_id, ticket: p.ticket }),
    });
    const data = await res.json();
    setPagando(null);
    if (data.ok) {
      setMensaje(`✅ Pago de Bs. ${Number(p.premio).toLocaleString()} confirmado`);
      cargar();
      router.refresh();
    } else {
      setMensaje(`❌ ${data.error || "Error"}`);
    }
  };

  return (
    <>
      <button onClick={() => setAbierto(true)}
        className="w-full py-5 rounded-2xl bg-indigo-600/60 border border-indigo-400/50 text-white font-bold text-base
          shadow-[0_0_20px_rgba(100,100,255,0.2)] hover:brightness-110 active:scale-95 transition-all">
        💰 Confirmar Pago a Ganadores
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setAbierto(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Pagos Pendientes</h2>
              <button onClick={() => setAbierto(false)} className="text-gray-400 text-xl">&times;</button>
            </div>

            {mensaje && <div className="text-sm text-center mb-3 bg-gray-800/50 rounded-xl py-2 px-3">{mensaje}</div>}

            {cargando ? (
              <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
            ) : pendientes.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No hay pagos pendientes</div>
            ) : (
              <div className="space-y-2">
                {pendientes.map((p: any) => (
                  <div key={p.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold">{p.hipodromo}</p>
                        <p className="text-gray-400 text-[10px]">Polla #{p.polla_id} · Ticket #{p.ticket}</p>
                      </div>
                      <p className="text-green-400 font-bold text-sm">Bs. {Number(p.premio).toLocaleString()}</p>
                    </div>
                    <button onClick={() => confirmarPago(p)} disabled={pagando === p.id}
                      className="mt-2 w-full py-2 rounded-xl bg-emerald-600/60 border border-emerald-400/50 text-white font-semibold text-xs
                        hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      {pagando === p.id ? "Confirmando..." : "Confirmar Pago"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ModalEstadisticas() {
  const [abierto, setAbierto] = useState(false);
  const [data, setData] = useState<any>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/taquilla/estadisticas").then(r => r.json());
      if (res.ok) setData(res);
    } catch {}
    setCargando(false);
  };

  useEffect(() => { if (abierto) cargar(); }, [abierto]);

  return (
    <>
      <button onClick={() => setAbierto(true)}
        className="w-full py-5 rounded-2xl bg-amber-600/50 border border-amber-400/40 text-white font-bold text-base
          shadow-[0_0_20px_rgba(255,200,0,0.15)] hover:brightness-110 active:scale-95 transition-all">
        📊 Ver Estadísticas
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setAbierto(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Estadísticas</h2>
              <button onClick={() => setAbierto(false)} className="text-gray-400 text-xl">&times;</button>
            </div>

            {cargando ? (
              <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
            ) : !data ? (
              <div className="text-center py-8 text-gray-500 text-sm">Sin datos</div>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider">Ventas Totales</p>
                  <p className="text-white font-bold text-2xl">Bs. {(data?.ventas || 0).toLocaleString()}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider">Comisión 10%</p>
                  <p className="text-emerald-400 font-bold text-2xl">Bs. {(data?.comision || 0).toLocaleString()}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <p className="text-gray-400 text-[10px] uppercase tracking-wider">Entrega al Admin</p>
                  <p className="text-amber-400 font-bold text-2xl">Bs. {(data?.totalAdmin || 0).toLocaleString()}</p>
                </div>
                <div className="pt-2 border-t border-gray-700">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Premios recibidos:</span>
                    <span className="text-green-400">Bs. {(data?.premios_recibidos || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Premios pagados a clientes:</span>
                    <span className="text-red-400">Bs. {(data?.premios_pagados || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>Pendientes de pago:</span>
                    <span className="text-yellow-400">{data?.pendientes_pago?.length || 0} ticket(s)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function HomePageClient({ nombre, saldo: saldoInicial, bloqueado, razon_bloqueo, rol, mantenimiento: mantenimientoInicial }: any) {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState(bloqueado);
  const [razon, setRazon] = useState(razon_bloqueo);
  const [saldo, setSaldo] = useState(saldoInicial);
  const [mantenimiento, setMantenimiento] = useState(mantenimientoInicial);

  const recargarDatos = useCallback(async () => {
    try {
      const [resME, resMant] = await Promise.all([
        fetch(`/api/me?_t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()),
        fetch("/api/admin/mantenimiento", { cache: "no-store" }).then(r => r.json()),
      ]);
      if (resME.bloqueado) { setIsBlocked(true); setRazon(resME.razon_bloqueo); }
      setSaldo(resME.saldo);
      setMantenimiento(resMant.mantenimiento);
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

  if (rol === "taquilla") {
    return (
      <main className="min-h-screen flex flex-col items-center text-white bg-[#0a0f1e] p-6">
        <div className="flex items-center justify-between w-full mb-6">
          <div>
            <h1 className="text-xl font-bold">{nombre}</h1>
            <p className="text-gray-400 text-xs">Taquilla</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-300 font-extrabold text-sm">Bs. {(Number(saldo) || 0).toLocaleString()}</span>
            <button onClick={async () => { await fetch("/api/logout", { method: "GET", credentials: "include" }); window.location.href = "/login"; }}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold active:scale-95 transition-all">
              Salir
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-md flex-1 justify-center">
          <button onClick={() => router.push("/taquilla")}
            className="w-full py-5 rounded-2xl bg-emerald-600/70 border border-emerald-400/60 text-white font-bold text-lg
              shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:brightness-110 active:scale-95 transition-all">
            🎫 Vender Pollas
          </button>

          <ModalPendientes nombre={nombre} />
          <ModalEstadisticas />
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
      <div className="absolute inset-0" style={{background: "radial-gradient(ellipse at 20% 80%, rgba(0,80,150,0.3) 0%, transparent 50%),radial-gradient(ellipse at 80% 20%, rgba(0,150,200,0.2) 0%, transparent 50%),radial-gradient(ellipse at 50% 50%, rgba(0,40,80,0.4) 0%, transparent 70%),linear-gradient(180deg, #0a0f1e 0%, #0d1f3c 40%, #091428 100%)"}} />
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
