"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPollaCrear() {
  const router = useRouter();
  const [hipodromo, setHipodromo] = useState("");
  const [horaCierre, setHoraCierre] = useState("");
  const [carreras, setCarreras] = useState<{ nombre: string; cantidad_caballos: number; numero: string }[]>(
    Array(6).fill(null).map(() => ({ nombre: "", cantidad_caballos: 0, numero: "" }))
  );

  const actualizarCarrera = (index: number, field: "nombre" | "cantidad_caballos" | "numero", val: string | number) => {
    const copia = [...carreras];
    copia[index] = { ...copia[index], [field]: val };
    setCarreras(copia);
  };

  const crearPolla = async () => {
    if (!hipodromo.trim()) { alert("Escribe el nombre del hipódromo"); return; }
    if (!horaCierre) { alert("Selecciona la hora de cierre"); return; }
    for (let i = 0; i < carreras.length; i++) {
      if (!carreras[i].nombre.trim()) {
        alert(`Escribe el nombre de la carrera ${i + 1}`);
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
      body: JSON.stringify({ hipodromo: hipodromo.trim(), carreras, hora_cierre: horaCierre }),
    });
    const data = await res.json();
    if (data.ok) {
      alert("Polla creada exitosamente");
      router.push("/admin/polla/gestionar");
    } else {
      alert(data.error || "Error al crear polla");
    }
  };

  return (
    <main className="min-h-screen p-4 text-white bg-[#0a0f1e]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-4xl font-bold">Crear Polla Hípica</h1>
        <button onClick={() => router.push("/admin/polla")}
          className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 text-white font-bold shadow-[0_0_18px_rgba(0,255,255,0.5)] hover:shadow-[0_0_28px_rgba(0,255,255,0.9)] active:scale-95 transition-all">
          ← Volver
        </button>
      </div>

      <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-6 max-w-xl">
        <label className="block mb-4">
          <span className="text-sm font-semibold">Nombre del Hipódromo</span>
          <input type="text" value={hipodromo} onChange={e => setHipodromo(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-cyan-300/40 text-white text-sm"
            placeholder="Ej: La Rinconada" />
        </label>

        <label className="block mb-4">
          <span className="text-sm font-semibold">Hora de cierre</span>
          <input type="time" value={horaCierre} onChange={e => setHoraCierre(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-red-300/40 text-white text-sm" />
          <p className="text-[10px] text-gray-500 mt-1">A esta hora se cierran las apuestas</p>
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
    </main>
  );
}