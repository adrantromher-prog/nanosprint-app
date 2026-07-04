"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPolla() {
  const router = useRouter();
  const [carreras, setCarreras] = useState<any[]>([]);
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
  const [pollaActiva, setPollaActiva] = useState<any>(null);
  const [resultados, setResultados] = useState<{ [carreraId: number]: { primer_lugar: number; segundo_lugar: number; tercer_lugar: number } }>({});

  const fetchCarreras = async () => {
    const res = await fetch("/api/remates/activas");
    const data = await res.json();
    if (data.ok) setCarreras(data.carreras);
  };

  const fetchPollaActiva = async () => {
    const res = await fetch("/api/polla/activa");
    const data = await res.json();
    if (data.ok) {
      setPollaActiva(data.polla);
      if (data.polla) {
        const r: any = {};
        for (const res of data.polla.resultados || []) {
          r[res.carrera_remate_id] = {
            primer_lugar: res.primer_lugar,
            segundo_lugar: res.segundo_lugar,
            tercer_lugar: res.tercer_lugar,
          };
        }
        setResultados(r);
      }
    }
  };

  useEffect(() => {
    fetchCarreras();
    fetchPollaActiva();
  }, []);

  const toggleCarrera = (id: number) => {
    setSeleccionadas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const crearPolla = async () => {
    if (seleccionadas.length !== 6) {
      alert("Selecciona exactamente 6 carreras");
      return;
    }
    const res = await fetch("/api/admin/polla/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrera_ids: seleccionadas }),
    });
    const data = await res.json();
    if (data.ok) {
      alert("Polla creada exitosamente");
      fetchPollaActiva();
      setSeleccionadas([]);
    } else {
      alert(data.error || "Error al crear polla");
    }
  };

  const setResultado = (carreraId: number, puesto: "primer_lugar" | "segundo_lugar" | "tercer_lugar", caballoId: number) => {
    setResultados(prev => ({
      ...prev,
      [carreraId]: { ...prev[carreraId], [puesto]: caballoId }
    }));
  };

  const guardarResultados = async () => {
    if (!pollaActiva) return;
    for (const [carreraId, res] of Object.entries(resultados)) {
      if (!res.primer_lugar || !res.segundo_lugar || !res.tercer_lugar) {
        alert(`Completa los 3 puestos para la carrera ${carreraId}`);
        return;
      }
    }
    for (const [carreraId, res] of Object.entries(resultados)) {
      await fetch("/api/admin/polla/resultados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          polla_id: pollaActiva.id,
          carrera_remate_id: parseInt(carreraId),
          ...res,
        }),
      });
    }
    alert("Resultados guardados y puntajes calculados");
    fetchPollaActiva();
  };

  const cerrarPolla = async () => {
    if (!confirm("¿Estás seguro? Se entregarán los premios a los ganadores según la configuración (50%, 30%, 20%).")) return;
    const res = await fetch("/api/admin/polla/cerrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polla_id: pollaActiva.id }),
    });
    const data = await res.json();
    if (data.ok) {
      alert(`Polla cerrada. Premios: 1ro Bs.${data.premio1}, 2do Bs.${data.premio2}, 3ro Bs.${data.premio3}`);
      fetchPollaActiva();
    } else {
      alert(data.error || "Error al cerrar polla");
    }
  };

  const verClasificacion = () => {
    if (pollaActiva) router.push(`/polla/clasificacion?polla_id=${pollaActiva.id}`);
  };

  return (
    <main className="min-h-screen p-4 text-white bg-[#0a0f1e]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-4xl font-bold">Administrar Polla Hípica</h1>
        <button onClick={() => router.push("/admin")}
          className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 text-white font-bold shadow-[0_0_18px_rgba(0,255,255,0.5)] hover:shadow-[0_0_28px_rgba(0,255,255,0.9)] active:scale-95 transition-all">
          ← Volver
        </button>
      </div>

      {pollaActiva?.activa ? (
        <div>
          <div className="bg-green-900/40 border border-green-400/50 rounded-2xl p-4 mb-6">
            <p className="text-green-300 font-bold text-lg">✅ Polla activa #{pollaActiva.id}</p>
            <p className="text-green-200/70">Costo: Bs. {Number(pollaActiva.costo).toLocaleString()}</p>
          </div>

          <div className="space-y-4 mb-6">
            <h2 className="text-xl font-bold text-cyan-300">Resultados por Carrera</h2>
            {pollaActiva.carreras?.map((c: any) => (
              <div key={c.carrera_remate_id} className="bg-gray-900/70 border border-gray-700 rounded-2xl p-4">
                <h3 className="font-bold text-white mb-2">
                  Carrera #{c.orden}: {c.hipodromo} - #{c.numero_carrera}
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {["primer_lugar", "segundo_lugar", "tercer_lugar"].map((puesto, idx) => {
                    const labels = ["1er Lugar (5 pts)", "2do Lugar (3 pts)", "3er Lugar (1 pt)"];
                    return (
                      <div key={puesto}>
                        <label className="text-xs text-gray-400 block mb-1">{labels[idx]}</label>
                        <select
                          value={(resultados[c.carrera_remate_id] as any)?.[puesto] || ""}
                          onChange={(e) => setResultado(c.carrera_remate_id, puesto as any, Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-xl bg-black/40 border border-purple-300/40 text-white text-sm"
                        >
                          <option value="">Seleccionar</option>
                          {c.caballos?.filter((h: any) => !h.retirado).map((h: any) => (
                            <option key={h.id} value={h.id}>#{h.numero} {h.nombre}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap">
            <button onClick={guardarResultados}
              className="px-6 py-3 rounded-xl bg-green-700/70 border border-green-400/70 text-white font-bold shadow-[0_0_18px_rgba(0,255,0,0.5)] hover:brightness-110 active:scale-95 transition-all">
              💾 Guardar Resultados
            </button>
            <button onClick={cerrarPolla}
              className="px-6 py-3 rounded-xl bg-red-700/70 border border-red-400/70 text-white font-bold shadow-[0_0_18px_rgba(255,0,0,0.5)] hover:brightness-110 active:scale-95 transition-all">
              🔒 Cerrar Polla & Entregar Premios
            </button>
            <button onClick={verClasificacion}
              className="px-6 py-3 rounded-xl bg-blue-700/70 border border-blue-400/70 text-white font-bold shadow-[0_0_18px_rgba(0,100,255,0.5)] hover:brightness-110 active:scale-95 transition-all">
              📊 Ver Clasificación
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-4 mb-6">
            <h2 className="text-xl font-bold text-cyan-300 mb-4">Selecciona 6 Carreras para la Polla</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {carreras.filter(c => c.estado === "abierta" && !c.ganador).map(c => (
                <div key={c.id}
                  onClick={() => toggleCarrera(c.id)}
                  className={`cursor-pointer p-3 rounded-xl border transition-all ${seleccionadas.includes(c.id) ? "bg-cyan-900/40 border-cyan-400/70 shadow-[0_0_12px_rgba(0,255,255,0.3)]" : "bg-gray-800/40 border-gray-600/50 hover:border-cyan-400/30"}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={seleccionadas.includes(c.id)} readOnly className="accent-cyan-400" />
                    <div>
                      <p className="font-bold text-white text-sm">{c.hipodromo}</p>
                      <p className="text-gray-400 text-xs">Carrera #{c.numero_carrera} — {c.hora_cierre}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {seleccionadas.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-gray-300">{seleccionadas.length}/6 carreras seleccionadas</span>
                {seleccionadas.length === 6 && (
                  <button onClick={crearPolla}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 border border-yellow-400/70 text-white font-bold shadow-[0_0_18px_rgba(255,200,0,0.5)] hover:brightness-110 active:scale-95 transition-all">
                    🏆 Crear Polla (Bs. 700)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
