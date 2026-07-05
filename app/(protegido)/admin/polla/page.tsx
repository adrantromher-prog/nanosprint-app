"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPolla() {
  const router = useRouter();
  const [hipodromo, setHipodromo] = useState("");
  const [carreras, setCarreras] = useState<{ nombre: string; cantidad_caballos: number; numero: string }[]>(
    Array(6).fill(null).map(() => ({ nombre: "", cantidad_caballos: 0, numero: "" }))
  );
  const [pollaActiva, setPollaActiva] = useState<any>(null);
  const [resultados, setResultados] = useState<{ [carreraOrden: number]: { primer_lugar: number; segundo_lugar: number; tercer_lugar: number } }>({});
  const [guardando, setGuardando] = useState<number | null>(null);

  const fetchPollaActiva = async () => {
    const res = await fetch("/api/polla/activa");
    const data = await res.json();
    if (data.ok) {
      setPollaActiva(data.polla);
      if (data.polla) {
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
    }
  };

  useEffect(() => { fetchPollaActiva(); }, []);

  const actualizarCarrera = (index: number, field: "nombre" | "cantidad_caballos" | "numero", val: string | number) => {
    const copia = [...carreras];
    copia[index] = { ...copia[index], [field]: val };
    setCarreras(copia);
  };

  const crearPolla = async () => {
    if (!hipodromo.trim()) { alert("Escribe el nombre del hipódromo"); return; }
    for (let i = 0; i < carreras.length; i++) {
      if (!carreras[i].nombre.trim()) {
        alert(`Escribe el nombre de la carrera ${i + 1} (ej: Carrera 1, Carrera 4, etc.)`);
        return;
      }
      if (carreras[i].cantidad_caballos < 2) {
        alert(`La carrera "${carreras[i].nombre}" debe tener al menos 2 caballos`);
        return;
      }
    }
    const res = await fetch("/api/admin/polla/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hipodromo: hipodromo.trim(), carreras }),
    });
    const data = await res.json();
    if (data.ok) {
      alert("Polla creada exitosamente");
      fetchPollaActiva();
    } else {
      alert(data.error || "Error al crear polla");
    }
  };

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
        polla_id: pollaActiva.id,
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
      fetchPollaActiva();
    } else {
      alert(data.error || "Error al guardar resultados");
    }
  };

  const cerrarPolla = async () => {
    if (!confirm("¿Estás seguro? 1er lugar recibe el 65% del pozo, 2do lugar el 20%.")) return;
    const res = await fetch("/api/admin/polla/cerrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polla_id: pollaActiva.id }),
    });
    const data = await res.json();
    if (data.ok) {
      alert(`Polla cerrada. 1ro: Bs.${data.premio1}, 2do: Bs.${data.premio2}`);
      fetchPollaActiva();
    } else {
      alert(data.error || "Error al cerrar polla");
    }
  };

  const verClasificacion = () => {
    if (pollaActiva) router.push(`/polla/clasificacion?polla_id=${pollaActiva.id}&admin=1`);
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
            <p className="text-green-200/70">Hipódromo: {pollaActiva.hipodromo}</p>
            <p className="text-green-200/70">Costo: Bs. {Number(pollaActiva.costo).toLocaleString()}</p>
          </div>

          <div className="space-y-3 mb-6">
            <h2 className="text-xl font-bold text-cyan-300">Resultados por Carrera</h2>
            <p className="text-gray-400 text-xs">Ingresa los resultados de cada carrera y presiona "Guardar" para calcular puntos.</p>
            {pollaActiva.carreras?.map((c: any) => {
              const tieneResultado = resultados[c.orden]?.primer_lugar != null;
              return (
                <div key={c.orden} className={`rounded-2xl p-4 border ${
                  tieneResultado
                    ? "bg-green-900/20 border-green-500/30"
                    : "bg-gray-900/70 border-gray-700"
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-white text-sm">
                      {c.numero || c.orden} — {c.nombre}
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
                      return (
                        <div key={puesto}>
                          <label className="text-[10px] text-gray-400 block mb-1">{labels[idx]}</label>
                          <select
                            value={(resultados[c.orden] as any)?.[puesto] || ""}
                            onChange={(e) => setResultado(c.orden, puesto as any, Number(e.target.value))}
                            className="w-full px-2 py-1.5 rounded-xl bg-black/40 border border-purple-300/40 text-white text-sm"
                          >
                            <option value="">—</option>
                            {nums.map(n => (
                              <option key={n} value={n}>#{n}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
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

          <div className="flex gap-3 flex-wrap">
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
          <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 max-w-xl">
            <h2 className="text-xl font-bold text-cyan-300 mb-4">Crear Nueva Polla</h2>

            <label className="block mb-4">
              <span className="text-sm font-semibold">Nombre del Hipódromo</span>
              <input type="text" value={hipodromo} onChange={e => setHipodromo(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-cyan-300/40 text-white text-sm"
                placeholder="Ej: La Rinconada" />
            </label>

            <p className="text-sm font-semibold text-gray-300 mb-3">Carreras (6)</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {carreras.map((c, i) => (
                <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-bold mb-2">Carrera #{i + 1}</p>
                  <label className="block mb-2">
                    <span className="text-[10px] text-gray-500">Nombre</span>
                    <input type="text" value={c.nombre}
                      onChange={e => actualizarCarrera(i, "nombre", e.target.value)}
                      className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-black/40 border border-cyan-300/30 text-white text-sm"
                      placeholder="Ej: Carrera 1, C4, 8va..." />
                  </label>
                  <label className="block mb-2">
                    <span className="text-[10px] text-gray-500">Caballos</span>
                    <input type="number" min={2} max={20} value={c.cantidad_caballos || ""}
                      onChange={e => actualizarCarrera(i, "cantidad_caballos", Number(e.target.value))}
                      className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-black/40 border border-purple-300/30 text-white text-sm"
                      placeholder="Ej: 8" />
                  </label>
                  <label className="block">
                    <span className="text-[10px] text-gray-500">Número (opcional)</span>
                    <input type="number" min={1} value={c.numero}
                      onChange={e => actualizarCarrera(i, "numero", e.target.value)}
                      className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-black/40 border border-amber-300/30 text-white text-sm"
                      placeholder="Ej: 1" />
                  </label>
                </div>
              ))}
            </div>

            <button onClick={crearPolla}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 border border-yellow-400/70 text-white font-bold shadow-[0_0_18px_rgba(255,200,0,0.5)] hover:brightness-110 active:scale-95 transition-all">
              🏆 Crear Polla (Bs. 700)
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
