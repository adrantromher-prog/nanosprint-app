"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useWebSocket from "@/hooks/useWebSocket";

export default function PollaPage() {
  const router = useRouter();
  const [polla, setPolla] = useState<any>(null);
  const [usuario, setUsuario] = useState<any>(null);
  const [selecciones, setSelecciones] = useState<{ [carreraOrden: number]: number }>({});
  const [miApuesta, setMiApuesta] = useState<any>(null);
  const [cargando, setCargando] = useState(false);

  const fetchData = useCallback(async () => {
    const [resPolla, resUser, resApuesta] = await Promise.all([
      fetch("/api/polla/activa").then(r => r.json()),
      fetch(`/api/me?_t=${Date.now()}`).then(r => r.json()),
      fetch("/api/polla/mi-apuesta").then(r => r.json()),
    ]);
    if (resPolla.ok) setPolla(resPolla.polla);
    if (resUser.nombre) setUsuario(resUser);
    if (resApuesta.ok) setMiApuesta(resApuesta.apuesta);
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
      alert("¡Apuesta registrada con éxito!");
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

  const totalParticipantes = polla.resultados?.length > 0 ? (polla as any).total_participantes || 0 : 0;
  const yaParticipo = miApuesta !== null;
  const todasConResultado = polla.resultados?.length >= 6;

  return (
    <main className="relative min-h-screen w-full text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950" />
      <div className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% -20%, rgba(255,200,0,0.15), transparent),
                      radial-gradient(ellipse 60% 50% at 80% 80%, rgba(255,100,0,0.1), transparent)`
        }}
      />

      <div className="relative z-10 p-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-amber-300 drop-shadow-[0_0_12px_rgba(255,200,0,0.4)]">
              🏆 POLLA HÍPICA
            </h1>
            <p className="text-amber-400/80 font-bold text-lg">{polla.hipodromo}</p>
            <p className="text-gray-400 text-sm">{polla.carreras?.[0]?.nombre || "Carrera 1"} a {polla.carreras?.[5]?.nombre || "Carrera 6"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push(`/polla/clasificacion?polla_id=${polla.id}`)}
              className="px-4 py-2 rounded-xl bg-amber-700/70 border border-amber-400/70 text-white font-bold text-sm hover:brightness-110 active:scale-95 transition-all">
              📊 Clasificación
            </button>
            <button onClick={() => router.push("/home")}
              className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-sm hover:bg-white/20 active:scale-95 transition-all">
              ← Salir
            </button>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
              {usuario.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white text-sm font-bold">{usuario.nombre}</p>
              <p className="text-green-300 font-extrabold text-sm">Bs. {Number(usuario.saldo).toLocaleString()}</p>
            </div>
            {yaParticipo && (
              <div className="ml-auto px-3 py-1 rounded-full bg-green-500/20 border border-green-400/50 text-green-300 text-xs font-bold">
                ✅ Participas
              </div>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-900/30 via-yellow-800/20 to-amber-900/30 border border-yellow-400/30 rounded-2xl p-4 mb-4 text-sm">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-yellow-300 font-bold text-lg">65%</p>
              <p className="text-yellow-200/60 text-[10px] uppercase tracking-wide">1er Lugar</p>
            </div>
            <div>
              <p className="text-gray-300 font-bold text-lg">20%</p>
              <p className="text-gray-400/60 text-[10px] uppercase tracking-wide">2do Lugar</p>
            </div>
            <div>
              <p className="text-red-300 font-bold text-lg">15%</p>
              <p className="text-red-300/60 text-[10px] uppercase tracking-wide">Casa</p>
            </div>
          </div>
          <div className="text-center mt-2">
            <span className="text-amber-300/70 text-xs font-mono">Costo: Bs. {Number(polla.costo).toLocaleString()}</span>
          </div>
        </div>

        {!yaParticipo && !todasConResultado && (
          <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-3 text-sm text-amber-200 mb-4">
            Toca los cuadritos para seleccionar 1 caballo por cada carrera
          </div>
        )}

        {todasConResultado && (
          <div className="bg-green-500/10 border border-green-400/30 rounded-xl p-3 text-sm text-green-200 mb-4">
            Todas las carreras tienen resultados. Espera a que el admin cierre la polla.
          </div>
        )}

        <div className="space-y-3">
          {polla.carreras?.map((carrera: any) => {
            const resultado = polla.resultados?.find((r: any) => r.carrera_orden === carrera.orden);
            const miSeleccion = miApuesta?.selecciones?.find((s: any) => s.carrera_orden === carrera.orden);
            const seleccionLocal = selecciones[carrera.orden];
            const caballos = Array.from({ length: carrera.cantidad_caballos }, (_, i) => i + 1);

            return (
              <div key={carrera.orden}
                className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-400/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-300">#{carrera.orden}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{carrera.nombre}</h3>
                      <p className="text-[10px] text-gray-500">{polla.hipodromo}</p>
                    </div>
                  </div>
                  {resultado && (
                    <div className="flex gap-1 text-[10px]">
                      {resultado.primer_lugar && <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">1° #{resultado.primer_lugar}</span>}
                      {resultado.segundo_lugar && <span className="px-1.5 py-0.5 rounded bg-gray-400/20 text-gray-300 border border-gray-400/30">2° #{resultado.segundo_lugar}</span>}
                      {resultado.tercer_lugar && <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-400/30">3° #{resultado.tercer_lugar}</span>}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {caballos.map((num) => {
                    const selected = miSeleccion?.caballo_numero === num || seleccionLocal === num;
                    const esGanador = resultado?.primer_lugar === num;
                    const esSegundo = resultado?.segundo_lugar === num;
                    const esTercero = resultado?.tercer_lugar === num;

                    let borderColor = "border-gray-600/50 hover:border-amber-400/50";
                    if (selected && yaParticipo) {
                      if (esGanador) borderColor = "border-yellow-400/80 bg-yellow-500/20";
                      else if (esSegundo) borderColor = "border-gray-300/80 bg-gray-400/20";
                      else if (esTercero) borderColor = "border-orange-400/80 bg-orange-500/20";
                      else borderColor = "border-red-400/60 bg-red-500/15";
                    } else if (selected) {
                      borderColor = "border-amber-400/80 bg-amber-500/20 shadow-[0_0_12px_rgba(255,200,0,0.25)]";
                    }

                    return (
                      <button key={num}
                        onClick={() => !yaParticipo && !todasConResultado && seleccionarCaballo(carrera.orden, num)}
                        disabled={yaParticipo || todasConResultado}
                        className={`relative w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold text-base transition-all duration-150 ${borderColor} ${selected ? "scale-110" : "hover:scale-105"} ${(yaParticipo || todasConResultado) ? "cursor-default" : "cursor-pointer active:scale-95"}`}>
                        <span className={`${selected ? "text-white" : "text-gray-400"}`}>{num}</span>
                        {esGanador && <span className="absolute -top-1.5 -right-1.5 text-[10px]">👑</span>}
                        {esSegundo && <span className="absolute -top-1.5 -right-1.5 text-[10px]">🥈</span>}
                        {esTercero && <span className="absolute -top-1.5 -right-1.5 text-[10px]">🥉</span>}
                        {miSeleccion?.caballo_numero === num && miApuesta && (
                          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap">
                            <span className={`font-bold ${esGanador ? "text-yellow-300" : esSegundo ? "text-gray-300" : esTercero ? "text-orange-300" : "text-red-400"}`}>
                              {miSeleccion.puntos > 0 ? `+${miSeleccion.puntos}` : "0"}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!yaParticipo && !todasConResultado && (
          <button onClick={enviarApuesta} disabled={cargando || Object.keys(selecciones).length !== 6}
            className="mt-6 w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 border border-yellow-400/70 text-white font-bold text-lg shadow-[0_0_24px_rgba(255,200,0,0.4)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {cargando ? "Procesando..." : `Seleccionados ${Object.keys(selecciones).length}/6 — Bs. ${Number(polla.costo).toLocaleString()}`}
          </button>
        )}

        {yaParticipo && (
          <div className="mt-6 bg-green-900/30 border border-green-400/40 rounded-2xl p-4 text-center">
            <p className="text-green-300 font-bold text-lg">✅ Ya participas en esta Polla</p>
            <p className="text-green-200/70 text-sm">Tus puntos acumulados: <strong>{miApuesta.total_puntos}</strong></p>
          </div>
        )}
      </div>
    </main>
  );
}
