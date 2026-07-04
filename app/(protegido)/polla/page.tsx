"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";

export default function PollaPage() {
  const router = useRouter();
  const [polla, setPolla] = useState<any>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const [selecciones, setSelecciones] = useState<{ [carreraOrden: number]: number }>({});
  const [misTickets, setMisTickets] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  const fetchData = useCallback(async () => {
    const [resPolla, resUser, resApuesta] = await Promise.all([
      fetch("/api/polla/activa").then(r => r.json()),
      fetch(`/api/me?_t=${Date.now()}`).then(r => r.json()),
      fetch("/api/polla/mi-apuesta").then(r => r.json()),
    ]);
    if (resPolla.ok) setPolla(resPolla.polla);
    if (resUser.nombre) setUsuario(resUser);
    if (resApuesta.ok) setMisTickets(resApuesta.apuesta || []);
    setSelecciones({});
  }, []);

  useWebSocket(useCallback((event) => {
    if (["polla_creada", "polla_resultados", "polla_apuesta"].includes(event.type)) {
      fetchData();
    }
  }, [fetchData]));

  useEffect(() => { fetchData(); }, [fetchData]);

  const seleccionarCaballo = (carreraOrden: number, caballoNum: number) => {
    setSelecciones(prev => ({ ...prev, [carreraOrden]: caballoNum }));
  };

  const enviarApuesta = async () => {
    if (!polla) return;
    if (Object.keys(selecciones).length !== 6) {
      alert("Selecciona un caballo para cada una de las 6 carreras");
      return;
    }

    setCargando(true);
    const res = await fetch("/api/polla/apostar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        polla_id: polla.id,
        selecciones: Object.fromEntries(
          Object.entries(selecciones).map(([k, v]) => [k, v])
        ),
      }),
    });
    const data = await res.json();
    setCargando(false);

    if (data.ok) {
      setSelecciones({});
      alert(`¡Apuesta registrada! Ticket #${data.ticket}`);
      fetchData();
    } else {
      alert(data.error || "Error al registrar apuesta");
    }
  };

  if (!usuario) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Cargando...</span>
        </div>
      </main>
    );
  }

  if (!polla) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-white bg-gray-950 gap-4">
        <div className="text-6xl">🏇</div>
        <h1 className="text-2xl font-bold text-gray-300">No hay Polla activa</h1>
        <p className="text-gray-500">El administrador aún no ha creado una Polla Hípica</p>
        <button onClick={() => router.push("/home")}
          className="px-6 py-3 rounded-xl bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 text-white font-bold shadow-[0_0_18px_rgba(0,255,255,0.5)] hover:brightness-110 active:scale-95 transition-all">
          ← Volver al Home
        </button>
      </main>
    );
  }

  const todasConResultado = polla.resultados?.length >= 6;
  const costo = Number(polla.costo);

  const todoSeleccionado = Object.keys(selecciones).length === 6;

  return (
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950" />
      <div className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% -20%, rgba(255,200,0,0.15), transparent),
                      radial-gradient(ellipse 60% 50% at 80% 80%, rgba(255,100,0,0.1), transparent)`
        }}
      />

      <div className="relative z-10 p-3 md:p-4 max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="min-w-0">
            <h1 className="text-lg md:text-3xl lg:text-4xl font-bold text-amber-300 drop-shadow-[0_0_12px_rgba(255,200,0,0.4)] truncate">
              🏆 POLLA
            </h1>
            <p className="text-amber-400/80 font-bold text-sm md:text-lg truncate">{polla.hipodromo}</p>
            <p className="text-gray-400 text-[10px] md:text-sm truncate">{polla.carreras?.[0]?.nombre || "Carrera 1"} a {polla.carreras?.[5]?.nombre || "Carrera 6"}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => router.push(`/polla/clasificacion?polla_id=${polla.id}`)}
              className="px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-amber-700/70 border border-amber-400/70 text-white font-bold text-[10px] md:text-sm hover:brightness-110 active:scale-95 transition-all whitespace-nowrap">
              📊 Clasif.
            </button>
            <button onClick={() => router.push("/home")}
              className="px-2.5 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl bg-white/10 border border-white/20 text-white font-bold text-[10px] md:text-sm hover:bg-white/20 active:scale-95 transition-all whitespace-nowrap">
              ← Salir
            </button>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-bold text-[10px] md:text-sm shrink-0">
              {usuario.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs md:text-sm font-bold truncate">{usuario.nombre}</p>
              <p className="text-green-300 font-extrabold text-xs md:text-sm">Bs. {Number(usuario.saldo).toLocaleString()}</p>
            </div>
            {misTickets.length > 0 && (
              <div className="ml-auto px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-green-500/20 border border-green-400/50 text-green-300 text-[9px] md:text-xs font-bold shrink-0">
                {misTickets.length} ticket(s)
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-900/30 via-yellow-800/20 to-amber-900/30 border border-yellow-400/30 rounded-2xl p-3 md:p-4 mb-4">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <p className="text-yellow-300 font-bold text-base md:text-lg">Bs. {Math.floor(costo * (polla.total_tickets || 1) * 0.65).toLocaleString()}</p>
              <p className="text-yellow-200/60 text-[9px] md:text-[10px] uppercase tracking-wide">1° Lugar</p>
            </div>
            <div>
              <p className="text-gray-300 font-bold text-base md:text-lg">Bs. {Math.floor(costo * (polla.total_tickets || 1) * 0.20).toLocaleString()}</p>
              <p className="text-gray-400/60 text-[9px] md:text-[10px] uppercase tracking-wide">2° Lugar</p>
            </div>
          </div>
          <div className="text-center mt-1.5">
            <span className="text-amber-300/70 text-[10px] md:text-xs font-mono">{polla.total_tickets || 0} ticket(s) · Bs. {costo.toLocaleString()} c/u</span>
          </div>
        </div>

        {!todasConResultado && (
          <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg md:rounded-xl p-2 md:p-3 text-[10px] md:text-sm text-amber-200 mb-3">
            Toca los cuadritos para seleccionar 1 caballo por cada carrera
          </div>
        )}

        {todasConResultado && (
          <div className="bg-green-500/10 border border-green-400/30 rounded-lg md:rounded-xl p-2 md:p-3 text-[10px] md:text-sm text-green-200 mb-3">
            Todas las carreras tienen resultados. Espera a que el admin cierre la polla.
          </div>
        )}

        {misTickets.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {misTickets.map((t: any) => (
              <div key={t.ticket}
                className="px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-green-900/30 border border-green-400/30 text-green-300 text-[9px] md:text-xs font-bold">
                Ticket #{t.ticket} — {t.total_puntos} pts
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 md:space-y-3">
          {polla.carreras?.map((carrera: any) => {
            const resultado = polla.resultados?.find((r: any) => r.carrera_orden === carrera.orden);
            const seleccionLocal = selecciones[carrera.orden];
            const caballos = Array.from({ length: carrera.cantidad_caballos }, (_, i) => i + 1);

            return (
              <div key={carrera.orden}
                className="bg-gray-900/60 border border-gray-700/50 rounded-lg md:rounded-xl p-2.5 md:p-4">
                <div className="flex items-center justify-between mb-2 gap-1">
                  <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                    <div className="w-5 h-5 md:w-7 md:h-7 rounded-md md:rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-400/20 flex items-center justify-center shrink-0">
                      <span className="text-[9px] md:text-xs font-bold text-amber-300">#{carrera.orden}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[11px] md:text-sm font-bold text-white truncate">{carrera.nombre}</h3>
                      <p className="text-[8px] md:text-[10px] text-gray-500 truncate">{polla.hipodromo}</p>
                    </div>
                  </div>
                  {resultado && (
                    <div className="flex gap-0.5 md:gap-1 shrink-0">
                      {resultado.primer_lugar && <span className="px-1 md:px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 text-[8px] md:text-[10px]">1° #{resultado.primer_lugar}</span>}
                      {resultado.segundo_lugar && <span className="px-1 md:px-1.5 py-0.5 rounded bg-gray-400/20 text-gray-300 border border-gray-400/30 text-[8px] md:text-[10px]">2° #{resultado.segundo_lugar}</span>}
                      {resultado.tercer_lugar && <span className="px-1 md:px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-400/30 text-[8px] md:text-[10px]">3° #{resultado.tercer_lugar}</span>}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1 md:gap-1.5">
                  {caballos.map((num) => {
                    const selected = seleccionLocal === num;

                    let borderColor = "border-gray-600/50 hover:border-amber-400/50";
                    if (selected) {
                      borderColor = "border-amber-400/80 bg-amber-500/20 shadow-[0_0_12px_rgba(255,200,0,0.25)]";
                    }

                    const estaDeshabilitado = todasConResultado;

                    return (
                      <button key={num}
                        onClick={() => !estaDeshabilitado && seleccionarCaballo(carrera.orden, num)}
                        disabled={estaDeshabilitado}
                        className={`relative w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl border-2 flex items-center justify-center font-bold text-xs md:text-base transition-all duration-150 ${borderColor} ${selected ? "scale-110" : "hover:scale-105"} ${estaDeshabilitado ? "cursor-default" : "cursor-pointer active:scale-95"}`}>
                        <span className={`${selected ? "text-white" : "text-gray-400"}`}>{num}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!todasConResultado && (
          <button onClick={enviarApuesta} disabled={cargando || !todoSeleccionado}
            className="mt-4 md:mt-6 w-full py-3 md:py-4 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 border border-yellow-400/70 text-white font-bold text-sm md:text-lg shadow-[0_0_24px_rgba(255,200,0,0.4)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {cargando ? "Procesando..." : `Seleccionados ${Object.keys(selecciones).length}/6 — Bs. ${costo.toLocaleString()}`}
          </button>
        )}

        {misTickets.length > 0 && (
          <div className="mt-3 md:mt-4 bg-green-900/20 border border-green-400/20 rounded-xl md:rounded-2xl p-2.5 md:p-3 text-center">
            <p className="text-green-300/70 text-[10px] md:text-xs">
              Tienes {misTickets.length} ticket(s) activos. Puedes comprar más tickets si quieres.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
