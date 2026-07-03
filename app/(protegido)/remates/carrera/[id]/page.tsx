"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";

function OrientationLock() {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setPortrait(e.matches);
    mq.addEventListener("change", handler);
    handler(mq);
    return () => mq.removeEventListener("change", handler);
  }, []);
  if (!portrait) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center gap-4">
      <svg viewBox="0 0 24 24" fill="white" className="w-20 h-20 animate-pulse">
        <path d="M7 0h10v24H7V0zm2 3v18h6V3H9z" transform="rotate(90 12 12)" />
      </svg>
      <p className="text-white/80 text-lg font-bold text-center px-4">
        Gira tu teléfono a horizontal
      </p>
    </div>
  );
}

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
  const [montos, setMontos] = useState<{ [key: number]: number }>({});
  const [popup, setPopup] = useState<{ caballo: Caballo; monto: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [cargando, setCargando] = useState(false);
  const fetchCarrera = async () => {
    const res = await fetch("/api/remates/activas");
    const data = await res.json();
    if (data.ok) {
      const encontrada = data.carreras.find((c: Carrera) => c.id === Number(id));
      if (encontrada) setCarrera(encontrada);
    }
  };

  const fetchUser = async () => {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json();
    if (data.nombre) setUsuario(data);
  };

  useWebSocket(useCallback((event) => {
    if (event.type === "puja" && event.carrera_id === Number(id)) {
      fetchCarrera();
      fetchUser();
    }
    if (["ganador", "carrera_cerrada", "caballo_retirado"].includes(event.type)) {
      fetchCarrera();
    }
  }, [id]));

  useEffect(() => {
    fetchCarrera();
    fetchUser();
    const intervalo = setInterval(() => {
      fetchCarrera();
      fetchUser();
    }, 30000);
    return () => clearInterval(intervalo);
  }, [id]);

  const totalPujas = carrera?.caballos
    .filter((c) => !c.retirado)
    .reduce((acc, c) => acc + Number(c.puja_actual || 0), 0) || 0;
  const casa = Math.round(totalPujas * 0.15);
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
      fetchCarrera();
      const resUser = await fetch("/api/me", { cache: "no-store" });
      setUsuario(await resUser.json());
    } else {
      setErrorMsg(data.error || "Error al pujar.");
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
    <>
    <OrientationLock />
    <main className="relative w-screen h-screen text-white overflow-hidden">

      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950" />
      <div className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,255,255,0.15), transparent),
                      radial-gradient(ellipse 60% 50% at 80% 80%, rgba(200,0,255,0.1), transparent),
                      radial-gradient(ellipse 50% 40% at 20% 70%, rgba(255,200,0,0.08), transparent)`
        }}
      />

      <div className="relative z-10 flex flex-col w-full h-full p-2 gap-2">

        <div className="flex-shrink-0 flex justify-between items-center gap-2">

          <div className="flex items-center gap-2">
            {carrera.imagen && (
              <button
                onClick={() => window.open(`/api/remates/imagen/${carrera.id}`, '_blank')}
                className="
                  w-9 h-9 rounded-xl text-sm font-bold
                  bg-gradient-to-b from-yellow-500/30 to-orange-600/30
                  border border-yellow-400/40
                  shadow-[0_0_12px_rgba(255,200,0,0.15)]
                  hover:shadow-[0_0_20px_rgba(255,200,0,0.4)]
                  hover:border-yellow-300/60
                  active:scale-95 transition-all duration-300
                  flex items-center justify-center
                "
              >
                <svg className="w-4 h-4 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
            )}
            <button
              onClick={() => router.push("/remates")}
              className="
                px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap
                bg-gradient-to-b from-slate-700 to-slate-900
                border border-slate-500/50
                shadow-[0_0_12px_rgba(100,200,255,0.15)]
                hover:shadow-[0_0_20px_rgba(100,200,255,0.4)]
                hover:border-cyan-400/60
                active:scale-95 transition-all duration-300
              "
            >
              ← Volver
            </button>
          </div>

          <div className="flex flex-col items-center flex-1">
            <span className="text-white font-bold text-lg leading-tight tracking-wide drop-shadow-[0_0_8px_rgba(0,255,255,0.2)]">{carrera.hipodromo}</span>
            <span className="text-gray-400 text-xs tracking-wide">Carrera #{carrera.numero_carrera} · {carrera.tipo.charAt(0).toUpperCase() + carrera.tipo.slice(1)}</span>
            <div className="mt-1">
              <Temporizador horaCierre={carrera.hora_cierre} estado={carrera.estado} />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-right whitespace-nowrap shadow-[0_0_15px_rgba(0,255,255,0.05)]">
            <p className="text-gray-300 text-base font-bold">{usuario.nombre}</p>
            <p className="text-green-300 font-extrabold text-base drop-shadow-[0_0_8px_rgba(0,255,0,0.5)]">
              Bs. {Number(usuario.saldo).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
          </div>

        </div>

        {carrera.ganador && (
          <div className="flex-shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-yellow-500/20 border border-yellow-400/40 text-center shadow-[0_0_20px_rgba(255,200,0,0.15)]">
            <span className="text-yellow-300 font-bold text-base drop-shadow-[0_0_6px_rgba(255,200,0,0.3)]">🏆 GANADOR: Caballo #{carrera.ganador}</span>
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-[70%_30%] gap-2">

          <div className="bg-gradient-to-b from-gray-900/90 to-gray-950/90 border border-gray-700/60 rounded-2xl p-2 flex flex-col overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.3)]">

            <div className="grid grid-cols-4 px-3 pb-2 border-b border-gray-700/50 flex-shrink-0"
              style={{ gridTemplateColumns: "36px 1fr 130px 290px" }}
            >
              <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-semibold">N°</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-semibold">Caballo</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-semibold text-center">Puja</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-semibold text-center">Apuesta</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pt-2 pr-1">
              {carrera.caballos.map((caballo, idx) => (
                <div
                  key={caballo.id}
                  className={`grid items-center px-3 py-2.5 rounded-xl text-xs gap-0.5 transition-all duration-200 ${
                    caballo.retirado
                      ? "bg-red-500/10 border border-red-400/20"
                      : idx % 2 === 0
                        ? "bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] hover:border-cyan-400/20"
                        : "bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06] hover:border-cyan-400/20"
                  }`}
                  style={{ gridTemplateColumns: "36px 1fr 130px 290px" }}
                >
                  <span className="font-mono text-gray-500 text-xs font-semibold">#{caballo.numero}</span>

                  <span className={`text-xs font-semibold truncate ${caballo.retirado ? "line-through text-gray-500" : "text-white"}`}>
                    {caballo.nombre}
                    {caballo.retirado && (
                      <span className="block text-red-400 text-[10px] font-bold mt-0.5" style={{ textDecoration: "none" }}>
                        RETIRADO
                      </span>
                    )}
                  </span>

                  <div className="text-center leading-snug">
                    {caballo.retirado ? (
                      <span className="text-gray-600">—</span>
                    ) : (
                      <>
                        <span className="text-cyan-300 font-bold text-base drop-shadow-[0_0_6px_rgba(0,255,255,0.15)]">
                          {caballo.puja_actual ? `Bs.${caballo.puja_actual.toLocaleString()}` : "—"}
                        </span>
                        {caballo.pujador_sobrenombre && (
                          <span className="block text-purple-400 font-bold text-sm drop-shadow-[0_0_4px_rgba(200,0,255,0.15)]">
                            @{caballo.pujador_sobrenombre}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!caballo.retirado && carrera.estado === "abierta" ? (
                      <>
                        <span className="text-white font-bold text-sm text-center px-2 py-1.5 rounded-lg bg-black/50 border border-cyan-400/30 whitespace-nowrap min-w-[80px] shadow-[0_0_6px_rgba(0,255,255,0.05)]">
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
                            className="px-3 py-1.5 rounded-md text-xs font-bold bg-gradient-to-b from-cyan-600 to-cyan-900 border border-cyan-400/40 text-cyan-100 shadow-[0_0_8px_rgba(0,255,255,0.1)] hover:shadow-[0_0_14px_rgba(0,255,255,0.35)] hover:border-cyan-300/60 active:scale-90 transition-all duration-150"
                          >
                            +{cant.toLocaleString()}
                          </button>
                        ))}
                        {montos[caballo.id] > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setErrorMsg("");
                              setMontos((prev) => ({ ...prev, [caballo.id]: 0 }));
                            }}
                            className="px-2.5 py-1.5 rounded-md text-xs font-bold bg-gradient-to-b from-red-700 to-red-950 border border-red-400/30 text-red-200 shadow-[0_0_6px_rgba(255,0,0,0.1)] hover:shadow-[0_0_12px_rgba(255,0,0,0.3)] hover:border-red-300/50 active:scale-90 transition-all duration-150"
                          >
                            ✕
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">

            {carrera.estado === "abierta" && (
              <div className="flex-shrink-0 bg-gradient-to-b from-gray-900/90 to-gray-950/90 border border-gray-700/60 rounded-2xl p-3 flex flex-col gap-2 shadow-[0_0_15px_rgba(0,0,0,0.2)]">
                {errorMsg && (
                  <p className="text-red-400 text-xs text-center font-semibold">{errorMsg}</p>
                )}

                {carrera.caballos.filter((c) => !c.retirado && montos[c.id]).length > 0 ? (
                  carrera.caballos
                    .filter((c) => !c.retirado && montos[c.id])
                    .map((caballo) => (
                      <button
                        key={caballo.id}
                        onClick={() => abrirPopup(caballo)}
                        className="
                          w-full py-3 rounded-xl font-bold text-base
                          bg-gradient-to-b from-purple-600 to-purple-900
                          border border-purple-400/60
                          shadow-[0_0_18px_rgba(200,0,255,0.3)]
                          hover:shadow-[0_0_30px_rgba(200,0,255,0.6)]
                          hover:border-purple-300/80
                          active:scale-[0.97] transition-all duration-300
                        "
                      >
                        🏇 Rematar #{caballo.numero}
                      </button>
                    ))
                ) : (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl font-bold text-base bg-gray-800/50 border border-gray-700/50 text-gray-600 cursor-not-allowed"
                  >
                    🏇 Rematar
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 bg-gradient-to-b from-gray-900/90 to-gray-950/90 border border-gray-700/60 rounded-2xl p-4 flex flex-col justify-center gap-2 shadow-[0_0_15px_rgba(0,0,0,0.2)]">

              {carrera.estado === "cerrada" && (
                <div className="text-center mb-1">
                  <span className="inline-block px-4 py-1 rounded-full bg-red-500/20 border border-red-400/50 text-red-300 font-bold text-xs shadow-[0_0_10px_rgba(255,0,0,0.1)]">
                    🔒 Carrera Cerrada — No se aceptan más pujas
                  </span>
                </div>
              )}

              <h3 className="text-xs font-bold text-cyan-300 text-center uppercase tracking-[0.2em] mb-1 drop-shadow-[0_0_6px_rgba(0,255,255,0.1)]">
                Pozo de la carrera
              </h3>

              <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-gray-400 text-sm">Total pujas</span>
                <span className="text-white font-bold text-sm">Bs. {totalPujas.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-red-500/[0.06] border border-red-400/15">
                <span className="text-gray-400 text-sm">Casa 15%</span>
                <span className="text-red-300 font-bold text-sm">− Bs. {casa.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-green-500/[0.06] border border-green-400/20">
                <span className="text-gray-400 text-sm">Total ganador</span>
                <span className="text-green-300 font-extrabold text-lg drop-shadow-[0_0_8px_rgba(0,255,0,0.15)]">Bs. {totalGanador.toLocaleString()}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {popup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-purple-400/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(200,0,255,0.25)] w-80">

            <h2 className="text-lg font-bold text-white text-center mb-5">Confirmar Remate</h2>

            <div className="space-y-2.5 mb-5">
              <div className="flex justify-between items-center px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-gray-400 text-sm">Caballo</span>
                <span className="text-white font-bold text-sm">#{popup.caballo.numero} {popup.caballo.nombre}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-gray-400 text-sm">Monto</span>
                <span className="text-cyan-300 font-bold text-sm drop-shadow-[0_0_6px_rgba(0,255,255,0.15)]">Bs. {popup.monto.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                <span className="text-gray-400 text-sm">Saldo actual</span>
                <span className="text-green-300 font-bold text-sm drop-shadow-[0_0_4px_rgba(0,255,0,0.15)]">Bs. {Number(usuario.saldo).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2.5 rounded-xl bg-yellow-500/[0.04] border border-yellow-400/10">
                <span className="text-gray-400 text-sm">Saldo restante</span>
                <span className="text-yellow-300 font-bold text-sm drop-shadow-[0_0_4px_rgba(255,200,0,0.15)]">
                  Bs. {(Number(usuario.saldo) - popup.monto).toLocaleString()}
                </span>
              </div>
            </div>

            {errorMsg && (
              <p className="text-red-400 text-xs text-center mb-3 font-semibold">{errorMsg}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setPopup(null); setErrorMsg(""); }}
                className="flex-1 py-3 rounded-xl font-bold bg-gray-800 border border-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-white active:scale-[0.97] transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRemate}
                disabled={cargando}
                className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-b from-purple-600 to-purple-900 border border-purple-400/60 text-white shadow-[0_0_18px_rgba(200,0,255,0.3)] hover:shadow-[0_0_30px_rgba(200,0,255,0.6)] hover:border-purple-300/80 active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
              >
                {cargando ? "Procesando..." : "✅ Sí, Rematar"}
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
    </>
  );
}