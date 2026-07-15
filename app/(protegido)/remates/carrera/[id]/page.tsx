"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";

interface Caballo {
  id: number;
  numero: number;
  nombre: string;
  retirado: boolean;
  puja_actual?: number;
  pujador_sobrenombre?: string;
}

interface Carrera {
  id: number;
  hipodromo: string;
  numero_carrera: number;
  hora_cierre: string;
  tipo: string;
  estado: string;
  ganador: number | null;
  imagen: string | null;
  caballos: Caballo[];
}

function Temporizador({ horaCierre, estado }: { horaCierre: string; estado?: string }) {
  const [tiempoRestante, setTiempoRestante] = useState("");
  const [abierto, setAbierto] = useState(true);
  const [alerta5min, setAlerta5min] = useState(false);
  const notificado5min = useRef(false);

  const cerrado = estado === "cerrada";

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    notificado5min.current = false;
    setAlerta5min(false);

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
        setAlerta5min(false);
        setTiempoRestante("00:00:00");
        return;
      }

      const falta5min = diff <= 300000 && diff > 0;

      if (falta5min) {
        setAlerta5min(true);

        if (!notificado5min.current && "Notification" in window && Notification.permission === "granted") {
          notificado5min.current = true;
          try { new Notification("⏰ Faltan 5 minutos", { body: "La carrera está por cerrar", silent: true }); } catch {}
        }

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

  return (
    <div className="flex items-center gap-2">
      <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide ${!abierto ? "bg-red-500/20 text-red-300 border border-red-400/50 shadow-[0_0_10px_rgba(255,0,0,0.15)]" : alerta5min ? "bg-yellow-500/20 text-yellow-300 border border-yellow-400/50 shadow-[0_0_12px_rgba(255,200,0,0.25)]" : "bg-green-500/20 text-green-300 border border-green-400/50 shadow-[0_0_10px_rgba(0,255,0,0.15)]"}`}>
        {!abierto ? "● CERRADO" : alerta5min ? "⚠ POR CIERRRE" : "● ABIERTO"}
      </span>
      {abierto && <span className={`text-white font-mono text-sm font-semibold tracking-wider ${alerta5min ? "text-yellow-300" : ""}`}>{tiempoRestante}</span>}
    </div>
  );
}

export default function DetalleCarrera() {
  const { id } = useParams();
  const router = useRouter();
  const [carrera, setCarrera] = useState<Carrera | null>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const userIdRef = useRef<number | null>(null);
  const [montos, setMontos] = useState<{ [key: number]: number }>({});
  const [popup, setPopup] = useState<{ caballo: Caballo; monto: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [cargando, setCargando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCarrera = useCallback(async () => {
    const res = await fetch(`/api/remates/carrera/${id}`);
    const data = await res.json();
    if (data.ok && data.carrera) setCarrera(data.carrera);
  }, [id]);

  const setCarreraDebounced = useCallback((c: Carrera) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setCarrera(c), 150);
  }, []);

  const fetchUser = useCallback(async () => {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json();
    if (data.nombre) {
      setUsuario(data);
      userIdRef.current = data.id;
    }
  }, []);

  useWebSocket(useCallback((event: any) => {
    if (event.type === "balance_updated" && event.saldo !== undefined) {
      setUsuario((prev: any) => prev ? { ...prev, saldo: event.saldo } : prev);
    }
    if (event.type === "balance_reset") {
      setUsuario((prev: any) => prev ? { ...prev, saldo: 0 } : prev);
    }
    if (event.type === "puja") {
      if (event.carrera?.id === Number(id)) {
        setCarreraDebounced(event.carrera);
      }
      if (event.usuario_id && event.usuario_id === userIdRef.current && event.saldo !== undefined) {
        setUsuario((prev: any) => prev ? { ...prev, saldo: event.saldo } : prev);
      }
    }
    if (["ganador", "carrera_cerrada", "caballo_retirado", "carrera_anulada"].includes(event.type)) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      fetchCarrera();
    }
    if (event.type === "sync_estado" && event.carreras) {
      const found = event.carreras.find((c: any) => c.id === Number(id));
      if (found) setCarreraDebounced(found);
    }
  }, [id, fetchCarrera, setCarreraDebounced]));

  useEffect(() => {
    fetchCarrera();
    fetchUser();
  }, [id, fetchCarrera, fetchUser]);

  const totalPujas = carrera?.caballos
    .filter((c) => !c.retirado)
    .reduce((acc, c) => acc + Number(c.puja_actual || 0), 0) || 0;
  const casa = Math.round(totalPujas * 0.20);
  const totalGanador = totalPujas - casa;

  const abrirPopup = (caballo: Caballo) => {
    setErrorMsg("");
    const monto = montos[caballo.id] || 0;

    if (!monto || monto <= 0) {
      setErrorMsg("Debes ingresar un monto válido.");
      return;
    }
    if (monto % 500 !== 0) {
      setErrorMsg("El monto debe ser múltiplo de 500.");
      return;
    }
    if (caballo.puja_actual && monto <= caballo.puja_actual) {
      setErrorMsg(`Debes superar la puja actual de Bs. ${caballo.puja_actual.toLocaleString()}.`);
      return;
    }
    if (usuario && monto > Number(usuario.saldo)) {
      setErrorMsg("Saldo insuficiente.");
      return;
    }
    setPopup({ caballo, monto });
  };

  const confirmarRemate = async () => {
    if (!popup) return;
    setCargando(true);

    const res = await fetch("/api/remates/pujar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carrera_id: carrera?.id,
        caballo_id: popup.caballo.id,
        monto: popup.monto,
      }),
    });

    const data = await res.json();
    setCargando(false);

    if (data.ok) {
      setPopup(null);
      setMontos((prev) => ({ ...prev, [popup.caballo.id]: 0 }));
      setCarrera((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          caballos: prev.caballos.map((c) =>
            c.id === popup.caballo.id
              ? { ...c, puja_actual: popup.monto, pujador_sobrenombre: usuario?.sobrenombre || c.pujador_sobrenombre }
              : c
          ),
        };
      });
    } else {
      setErrorMsg(data.error || "Error al rematar.");
    }
  };

  if (!carrera || !usuario) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
          <span className="text-gray-400 text-sm tracking-wide">Cargando carrera...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh w-full text-white overflow-y-auto">

      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950" />
      <div className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,255,255,0.15), transparent),
                      radial-gradient(ellipse 60% 50% at 80% 80%, rgba(200,0,255,0.1), transparent),
                      radial-gradient(ellipse 50% 40% at 20% 70%, rgba(255,200,0,0.08), transparent)`
        }}
      />

      <div className="relative z-10 w-full p-3 mx-auto max-w-5xl">

        <div className="flex flex-wrap items-center gap-2 mb-3">

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/remates")}
              className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap bg-gradient-to-b from-slate-700 to-slate-900 border border-slate-500/50 shadow-[0_0_12px_rgba(100,200,255,0.15)] hover:shadow-[0_0_20px_rgba(100,200,255,0.4)] hover:border-cyan-400/60 active:scale-95 transition-all duration-300"
            >
              ← Volver
            </button>
          </div>

          <div className="flex flex-col items-center flex-1 min-w-0 text-center">
            <span className="text-white font-bold text-sm leading-tight truncate w-full px-1 drop-shadow-[0_0_8px_rgba(0,255,255,0.2)]">{carrera.hipodromo}</span>
            <span className="text-gray-400 text-[10px] tracking-wide">Carrera #{carrera.numero_carrera} · {carrera.tipo.charAt(0).toUpperCase() + carrera.tipo.slice(1)}</span>
            <Temporizador horaCierre={carrera.hora_cierre} estado={carrera.estado} />
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 text-right whitespace-nowrap shadow-[0_0_15px_rgba(0,255,255,0.05)]">
            <p className="text-gray-300 text-sm font-bold leading-tight">{usuario.nombre}</p>
            <p className="text-green-300 font-extrabold text-xs drop-shadow-[0_0_8px_rgba(0,255,0,0.5)]">
              Bs. {Number(usuario.saldo).toLocaleString("en-US", { minimumFractionDigits: 0 })}
            </p>
          </div>

        </div>

        {carrera.ganador && (
          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-yellow-500/20 border border-yellow-400/40 text-center mb-3 shadow-[0_0_20px_rgba(255,200,0,0.15)]">
            <span className="text-yellow-300 font-bold text-sm drop-shadow-[0_0_6px_rgba(255,200,0,0.3)]">🏆 GANADOR: Caballo #{carrera.ganador}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-3">

          {carrera.estado === "cerrada" && (
            <div className="w-full text-center mb-1">
              <span className="inline-block px-4 py-1 rounded-full bg-red-500/20 border border-red-400/50 text-red-300 font-bold text-xs shadow-[0_0_10px_rgba(255,0,0,0.1)]">
                🔒 Carrera Cerrada — No se aceptan más pujas
              </span>
            </div>
          )}
          {carrera.estado === "anulada" && (
            <div className="w-full text-center mb-1">
              <span className="inline-block px-4 py-1 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-300 font-bold text-xs shadow-[0_0_10px_rgba(150,50,255,0.1)]">
                🚫 Carrera Anulada — Todas las pujas fueron reembolsadas
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">

            <div className="bg-gradient-to-b from-gray-900/90 to-gray-950/90 border border-gray-700/60 rounded-xl p-1.5 shadow-[0_0_20px_rgba(0,0,0,0.3)]">

              <div className="hidden sm:grid grid-cols-[28px_1fr_90px_1fr] px-2 pb-1.5 border-b border-gray-700/40 gap-1">
                <span className="text-[9px] text-gray-600 uppercase tracking-[0.15em] font-semibold">N°</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-[0.15em] font-semibold">Caballo</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-[0.15em] font-semibold text-center">Puja</span>
                <span className="text-[9px] text-gray-600 uppercase tracking-[0.15em] font-semibold text-center">Apuesta</span>
              </div>

              <div className="space-y-0.5 pt-1.5">
                <div className="flex gap-1.5 mb-1">
                  {carrera.imagen && (
                    <button onClick={() => window.open(`/api/remates/imagen/${carrera.id}`, '_blank')}
                      className="flex-1 py-2 rounded-lg text-[10px] font-bold bg-gradient-to-r from-yellow-500/20 to-orange-600/20 border border-yellow-400/30 hover:border-yellow-300/50 active:scale-[0.98] transition-all">
                      REVISTA
                    </button>
                  )}
                  <button onClick={() => window.location.reload()}
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold bg-gradient-to-r from-emerald-500/30 to-teal-600/30 border border-emerald-400/50 text-emerald-300 shadow-[0_0_12px_rgba(0,200,150,0.2)] hover:shadow-[0_0_20px_rgba(0,200,150,0.5)] hover:border-emerald-300/70 active:scale-[0.98] transition-all duration-300">
                    ACTUALIZAR REMATE
                  </button>
                </div>
                {carrera.caballos.map((caballo, idx) => {
                  const fondos = ["bg-red-950/20", "bg-gray-800/20", "bg-blue-950/20", "bg-amber-950/20", "bg-green-950/20", "bg-gray-950/30"];
                  const fondo = caballo.retirado ? "" : fondos[(caballo.numero - 1) % 6];
                  return (
                  <div
                    key={caballo.id}
                    className={`rounded-lg text-[11px] transition-all duration-200 border-2 ${fondo} ${
                      caballo.retirado
                        ? "bg-red-500/8 border-red-400/30"
                        : "border-white/[0.15]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 px-2 py-2">
                      <span className="font-mono text-gray-500 text-[10px] font-semibold w-[18px]">#{caballo.numero}</span>

                      <span className={`text-[11px] font-semibold truncate flex-1 min-w-0 ${caballo.retirado ? "line-through text-gray-500" : "text-white"}`}>
                        {caballo.nombre}
                        {caballo.retirado && (
                          <span className="inline text-red-400 text-[9px] font-bold ml-1" style={{ textDecoration: "none" }}>RETIRADO</span>
                        )}
                      </span>

                      {caballo.retirado ? (
                        <span className="text-gray-600 text-[10px] ml-auto">—</span>
                      ) : (
                        <span className="ml-auto sm:ml-0 text-right text-sm">
                          {caballo.puja_actual ? (
                            <span className="text-cyan-300 font-bold">
                              Bs. {caballo.puja_actual.toLocaleString()}{caballo.pujador_sobrenombre ? <span className="text-purple-400 font-bold"> {" "} - @{caballo.pujador_sobrenombre}</span> : ""}
                            </span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </span>
                      )}

                      {!caballo.retirado && carrera.estado === "abierta" && (
                        <div className="w-full flex items-center gap-3 pt-1.5 mt-1 border-t border-white/[0.06] flex-wrap">
                          <span className="text-white font-bold text-[11px] text-center px-2 py-1 rounded-lg bg-black/50 border border-cyan-400/30 min-w-[70px]">
                            Bs.{(montos[caballo.id] || 0).toLocaleString()}
                          </span>
                          {[500, 1000, 5000].map((cant) => (
                            <button
                              key={cant}
                              onClick={(e) => {
                                e.stopPropagation();
                                setErrorMsg("");
                                setMontos((prev) => ({ ...prev, [caballo.id]: (prev[caballo.id] || 0) + cant }));
                              }}
                              className="px-2.5 py-1 rounded-lg bg-gradient-to-b from-cyan-500/20 to-cyan-600/10 border border-cyan-400/30 text-cyan-300 font-bold text-[11px] hover:brightness-125 active:scale-90 transition-all"
                            >
                              +Bs.{cant.toLocaleString()}
                            </button>
                          ))}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMontos((prev) => ({ ...prev, [caballo.id]: 0 }));
                              setErrorMsg("");
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-red-900/30 border border-red-500/40 text-red-400 font-bold text-sm hover:bg-red-800/40 active:scale-90 transition-all"
                          >
                            ✕
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirPopup(caballo);
                            }}
                            className="px-3 py-1 rounded-lg bg-gradient-to-b from-green-500/30 to-green-600/20 border border-green-400/40 text-green-300 font-bold text-[11px] hover:brightness-125 active:scale-90 transition-all"
                          >
                            Rematar
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                );
                })}
              </div>

            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex flex-col items-center px-3 py-2.5 rounded-xl bg-gradient-to-b from-gray-800/80 to-gray-900/80 border border-gray-700/60 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                <span className="text-gray-500 text-[9px] uppercase tracking-[0.15em] font-semibold">Total Pujas</span>
                <span className="text-white font-bold text-base drop-shadow-[0_0_6px_rgba(255,255,255,0.1)]">Bs. {totalPujas.toLocaleString()}</span>
              </div>
              <div className="flex flex-col items-center px-3 py-2.5 rounded-xl bg-gradient-to-b from-green-900/60 to-green-950/60 border border-green-700/60 shadow-[0_0_15px_rgba(0,255,0,0.08)] text-center">
                <span className="text-gray-500 text-[9px] uppercase tracking-[0.15em] font-semibold">Premio Ganador</span>
                <span className="text-green-400 font-bold text-base drop-shadow-[0_0_8px_rgba(0,255,0,0.2)]">Bs. {totalGanador.toLocaleString()}</span>
              </div>
            </div>

          </div>
        </div>

        {errorMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-red-500/20 border border-red-400/30 text-red-300 text-xs font-semibold shadow-[0_0_20px_rgba(255,0,0,0.2)] backdrop-blur-md text-center">
            {errorMsg}
          </div>
        )}

        {popup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={() => !cargando && setPopup(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-sm font-bold text-center">Confirmar Remate</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Caballo:</span>
                  <span className="font-bold">#{popup.caballo.numero} {popup.caballo.nombre}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Monto:</span>
                  <span className="font-bold text-green-300">Bs. {popup.monto.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Tu saldo:</span>
                  <span className={`font-bold ${Number(usuario?.saldo || 0) >= popup.monto ? "text-green-300" : "text-red-300"}`}>
                    Bs. {Number(usuario?.saldo || 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 p-4 pt-0">
                <button onClick={() => setPopup(null)} disabled={cargando}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 font-semibold text-xs hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30">
                  Cancelar
                </button>
                <button onClick={confirmarRemate} disabled={cargando}
                  className="flex-1 py-2.5 rounded-xl bg-green-500/20 border border-green-400/30 text-green-300 font-semibold text-xs hover:bg-green-500/30 active:scale-95 transition-all disabled:opacity-30">
                  {cargando ? "Procesando..." : "Confirmar Remate"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
