"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function AdminPollaGestionarId() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [polla, setPolla] = useState<any>(null);
  const [resultados, setResultados] = useState<{ [carreraOrden: number]: { primer_lugar: number; segundo_lugar: number; tercer_lugar: number } }>({});
  const [guardando, setGuardando] = useState<number | null>(null);
  const [retirando, setRetirando] = useState<string | null>(null);

  const fetchPolla = async () => {
    const res = await fetch(`/api/admin/polla/detalle?id=${id}`);
    const data = await res.json();
    if (data.ok) {
      setPolla(data.polla);
      const r: any = {};
      for (const res of data.polla.resultados || []) {
        r[res.carrera_orden] = {
          primer_lugar: res.primer_lugar,
          segundo_lugar: res.segundo_lugar,
          tercer_lugar: res.tercer_lugar,
        };
      }
      setResultados(r);
    }
  };

  useEffect(() => { if (id) fetchPolla(); }, [id]);

  const setResultado = (carreraOrden: number, puesto: "primer_lugar" | "segundo_lugar" | "tercer_lugar", caballoNum: number) => {
    setResultados(prev => ({
      ...prev,
      [carreraOrden]: { ...prev[carreraOrden], [puesto]: caballoNum }
    }));
  };

  const guardarResultadosCarrera = async (carrera: any) => {
    const r = resultados[carrera.orden];
    if (!r?.primer_lugar || !r?.segundo_lugar || !r?.tercer_lugar) {
      alert("Completa los 3 puestos (1ro, 2do, 3ro)");
      return;
    }
    setGuardando(carrera.orden);
    const res = await fetch("/api/admin/polla/resultados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        polla_id: id,
        resultados: [{
          carrera_orden: carrera.orden,
          primer_lugar: r.primer_lugar,
          segundo_lugar: r.segundo_lugar,
          tercer_lugar: r.tercer_lugar,
        }],
      }),
    });
    const data = await res.json();
    setGuardando(null);
    if (data.ok) {
      alert(`Resultados guardados — ${carrera.nombre}`);
      fetchPolla();
    } else {
      alert(data.error || "Error al guardar resultados");
    }
  };

  const retirarCaballo = async (carreraOrden: number, caballoNum: number) => {
    const key = `${carreraOrden}-${caballoNum}`;
    setRetirando(key);
    const res = await fetch("/api/admin/polla/retirar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polla_id: id, carrera_orden: carreraOrden, caballo_numero: caballoNum }),
    });
    const data = await res.json();
    setRetirando(null);
    if (data.ok) {
      fetchPolla();
    } else {
      alert(data.error || "Error al retirar caballo");
    }
  };

  const cerrarPolla = async () => {
    if (!confirm("¿Estás seguro? 1er lugar recibe el 65% del pozo, 2do lugar el 20%.")) return;
    const res = await fetch("/api/admin/polla/cerrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polla_id: id }),
    });
    const data = await res.json();
    if (data.ok) {
      alert(`Polla cerrada. 1ro: Bs.${data.premio1}, 2do: Bs.${data.premio2}`);
      fetchPolla();
    } else {
      alert(data.error || "Error al cerrar polla");
    }
  };

  if (!polla) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white bg-[#0a0f1e]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Cargando...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 text-white bg-[#0a0f1e]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold">Polla #{polla.id}</h1>
          <p className="text-gray-400 text-sm">{polla.hipodromo} — Bs. {Number(polla.costo).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push(`/polla/clasificacion?polla_id=${polla.id}&admin=1`)}
            className="px-4 py-2 rounded-xl bg-blue-700/70 border border-blue-400/70 text-white font-bold text-sm shadow-[0_0_18px_rgba(0,100,255,0.5)] hover:brightness-110 active:scale-95 transition-all">
            📊 Clasificación
          </button>
          <button onClick={() => router.push("/admin/polla/gestionar")}
            className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 text-white font-bold shadow-[0_0_18px_rgba(0,255,255,0.5)] hover:shadow-[0_0_28px_rgba(0,255,255,0.9)] active:scale-95 transition-all">
            ← Volver
          </button>
        </div>
      </div>

      {polla.cerrada_en && (
        <div className="bg-red-900/30 border border-red-400/40 rounded-2xl p-4 mb-6">
          <p className="text-red-300 font-bold text-lg">🔒 Polla cerrada</p>
          <p className="text-red-200/70 text-sm mt-1">Cerrada el {new Date(polla.cerrada_en).toLocaleString()}</p>
          <div className="flex gap-6 mt-2">
            <p className="text-amber-300 font-bold">1ro: Bs. {Number(polla.premio_1).toLocaleString()}</p>
            <p className="text-gray-300 font-bold">2do: Bs. {Number(polla.premio_2).toLocaleString()}</p>
          </div>
        </div>
      )}

      {polla.activa && (
        <div className="bg-green-900/40 border border-green-400/50 rounded-2xl p-4 mb-6">
          <p className="text-green-300 font-bold text-lg">✅ Polla activa</p>
          <p className="text-green-200/70 text-sm">{polla.total_tickets} ticket{polla.total_tickets !== 1 ? "s" : ""} recibidos</p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        <h2 className="text-xl font-bold text-cyan-300">Resultados</h2>
        <p className="text-gray-400 text-xs">Ingresa los resultados de cada carrera y presiona "Guardar" para calcular puntos.</p>
        {polla.carreras?.map((c: any) => {
          const tieneResultado = resultados[c.orden]?.primer_lugar != null;
          return (
            <div key={c.orden} className={`rounded-2xl p-4 border ${
              tieneResultado
                ? "bg-green-900/20 border-green-500/30"
                : "bg-gray-900/70 border-gray-700"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-sm">
                  {c.nombre}
                  <span className="text-gray-500 font-normal ml-1">({c.cantidad_caballos} caballos)</span>
                </h3>
                {tieneResultado && (
                  <span className="text-[10px] text-green-400/70 font-semibold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-400/20">
                    ✓ Guardado
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {["primer_lugar", "segundo_lugar", "tercer_lugar"].map((puesto, idx) => {
                  const labels = ["1er Lugar (5 pts)", "2do Lugar (3 pts)", "3er Lugar (1 pt)"];
                  const nums = Array.from({ length: c.cantidad_caballos }, (_, i) => i + 1);
                  const retirados: number[] = c.retirados || [];
                  return (
                    <div key={puesto}>
                      <label className="text-[10px] text-gray-400 block mb-1">{labels[idx]}</label>
                      <select
                        value={(resultados[c.orden] as any)?.[puesto] || ""}
                        onChange={(e) => setResultado(c.orden, puesto as any, Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-xl bg-black/40 border border-purple-300/40 text-white text-sm"
                      >
                        <option value="">—</option>
                        {nums.filter(n => !retirados.includes(n)).map(n => (
                          <option key={n} value={n}>#{n}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {polla.activa && !polla.cerrada_en && (
                <div className="mb-3 pt-2 border-t border-white/5">
                  <p className="text-[10px] text-gray-500 font-semibold mb-1.5">Caballos retirados</p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: c.cantidad_caballos }, (_, i) => i + 1).map(n => {
                      const retirados: number[] = c.retirados || [];
                      const esRetirado = retirados.includes(n);
                      const key = `${c.orden}-${n}`;
                      return (
                        <button key={n}
                          onClick={() => retirarCaballo(c.orden, n)}
                          disabled={retirando === key}
                          className={`w-7 h-7 rounded-md border flex items-center justify-center text-[10px] font-bold transition-all
                            ${esRetirado
                              ? "border-red-400/40 bg-red-500/15 text-red-300 line-through"
                              : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20 hover:text-white/60"
                            }
                            ${retirando === key ? "opacity-40" : "cursor-pointer active:scale-90"}
                            `}>
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button onClick={() => guardarResultadosCarrera(c)}
                disabled={guardando === c.orden}
                className="w-full py-2 rounded-xl bg-emerald-600/60 border border-emerald-400/50 text-white font-semibold text-xs
                  hover:brightness-110 active:scale-95 transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed">
                {guardando === c.orden ? "Guardando..." : tieneResultado ? "Actualizar Resultados" : "Guardar Resultados"}
              </button>
            </div>
          );
        })}
      </div>

      {!polla.cerrada_en && (
        <button onClick={cerrarPolla}
          className="px-6 py-3 rounded-xl bg-red-700/70 border border-red-400/70 text-white font-bold shadow-[0_0_18px_rgba(255,0,0,0.5)] hover:brightness-110 active:scale-95 transition-all">
          🔒 Cerrar Polla & Entregar Premios
        </button>
      )}
    </main>
  );
}