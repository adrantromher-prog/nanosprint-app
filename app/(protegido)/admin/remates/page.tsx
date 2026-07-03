"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminRemates() {
  const router = useRouter();
  const [hipodromo, setHipodromo] = useState("");
  const [numeroCarrera, setNumeroCarrera] = useState("");
  const [horaCierre, setHoraCierre] = useState("");
  const [tipoCarrera, setTipoCarrera] = useState("nacional");
  const [cantidadCaballos, setCantidadCaballos] = useState(0);
  const [caballos, setCaballos] = useState<string[]>([]);
  const [imagen, setImagen] = useState<string>("");
  const [imagenPreview, setImagenPreview] = useState<string>("");

  const generarInputs = (cantidad: number) => {
    setCantidadCaballos(cantidad);
    setCaballos(Array(cantidad).fill(""));
  };

  const actualizarCaballo = (index: number, valor: string) => {
    const copia = [...caballos];
    copia[index] = valor;
    setCaballos(copia);
  };

  const crearCarrera = async () => {
    if (!horaCierre) { alert("Selecciona la hora de cierre"); return; }
    if (!hipodromo.trim()) { alert("Escribe el nombre del hipódromo"); return; }
    if (caballos.length === 0 || caballos.some(c => !c.trim())) { alert("Completa todos los nombres de caballos"); return; }

    const res = await fetch("/api/admin/remates/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hipodromo,
        numeroCarrera,
        horaCierre,
        tipoCarrera,
        caballos,
        imagen: imagen || null,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      alert("Carrera creada correctamente");
      window.location.reload();
    } else {
      alert(data.error || "Error al crear la carrera");
    }
  };

  const reiniciarJackpot = async () => {
    if (!confirm("¿Estás seguro? Se reiniciará el Jackpot y la Clasificación a 0.")) return;
    const res = await fetch("/api/admin/remates/reiniciar-jackpot", { method: "POST" });
    const data = await res.json();
    alert(data.ok ? "Jackpot y Clasificación reiniciados." : "Error al reiniciar.");
    router.refresh();
  };

  return (
    <main className="min-h-screen p-4 text-white">

      {/* BOTÓN VOLVER ARRIBA DERECHA */}
      <div className="w-full flex justify-end">
        <button
          onClick={() => (window.location.href = "/admin")}
          className="
            px-4 py-2 rounded-xl
            bg-gradient-to-b from-[#003344] to-[#0077AA]
            border border-cyan-300/70
            text-white font-bold text-base
            shadow-[0_0_18px_rgba(0,255,255,0.5)]
            hover:shadow-[0_0_28px_rgba(0,255,255,0.9)]
            hover:border-cyan-200
            hover:from-[#005577] hover:to-[#0099CC]
            active:scale-95
            transition-all duration-300
          "
        >
          ← Volver
        </button>
      </div>

      {/* TÍTULO */}
      <h1 className="text-xl md:text-3xl font-bold mt-0 mb-3 drop-shadow-[0_0_12px_rgba(0,255,255,0.6)]">
        Crear Carrera de Remate
      </h1>

      {/* FORMULARIO */}
      <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-4 shadow-xl max-w-xl">

        {/* Hipódromo */}
        <label className="block mb-2">
          <span className="text-sm font-semibold">Nombre del Hipódromo</span>
          <input
            type="text"
            value={hipodromo}
            onChange={(e) => setHipodromo(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-cyan-300/40 text-white text-sm"
          />
        </label>

        {/* Número de carrera */}
        <label className="block mb-2">
          <span className="text-sm font-semibold">Número de la Carrera</span>
          <input
            type="number"
            value={numeroCarrera}
            onChange={(e) => setNumeroCarrera(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-cyan-300/40 text-white text-sm"
          />
        </label>

        {/* Hora de cierre */}
        <label className="block mb-2">
          <span className="text-sm font-semibold">Hora de Cierre de la Subasta</span>
          <input
            type="time"
            value={horaCierre}
            onChange={(e) => setHoraCierre(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-cyan-300/40 text-white text-sm"
          />
        </label>

        {/* Tipo de carrera */}
        <label className="block mb-3">
          <span className="text-sm font-semibold">Tipo de Carrera</span>
          <div className="flex gap-6 mt-1 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tipo"
                value="nacional"
                checked={tipoCarrera === "nacional"}
                onChange={() => setTipoCarrera("nacional")}
              />
              Nacional
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tipo"
                value="americana"
                checked={tipoCarrera === "americana"}
                onChange={() => setTipoCarrera("americana")}
              />
              Americana
            </label>
          </div>
        </label>

        {/* Cantidad de caballos */}
        <label className="block mb-3">
          <span className="text-sm font-semibold">Cantidad de Caballos</span>
          <input
            type="number"
            min="1"
            max="20"
            value={cantidadCaballos}
            onChange={(e) => generarInputs(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-cyan-300/40 text-white text-sm"
          />
        </label>

        {/* Inputs dinámicos */}
        {caballos.length > 0 && (
          <div className="mb-3">
            <h2 className="text-lg font-bold mb-2 text-cyan-300">Nombres de los Caballos</h2>
            {caballos.map((caballo, index) => (
              <div key={index} className="mb-2">
                <label className="block">
                  <span className="text-sm">Caballo {index + 1}</span>
                  <input
                    type="text"
                    value={caballo}
                    onChange={(e) => actualizarCaballo(index, e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-purple-300/40 text-white text-sm"
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        {/* Imagen de la carrera */}
        <label className="block mb-3">
          <span className="text-sm font-semibold">Imagen de la Carrera (opcional)</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result as string;
                  setImagen(dataUrl);
                  setImagenPreview(dataUrl);
                };
                reader.readAsDataURL(file);
              }
            }}
            className="w-full mt-1 text-sm text-white file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-purple-700/70 file:text-white file:font-bold file:text-sm hover:file:bg-purple-700/90 cursor-pointer"
          />
          {imagenPreview && (
            <div
              onClick={() => { setImagen(""); setImagenPreview(""); }}
              className="relative mt-2 inline-block cursor-pointer group"
            >
              <img src={imagenPreview} alt="Preview" className="h-24 rounded-xl border border-purple-400/50" />
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</span>
            </div>
          )}
        </label>

        {/* Botón Crear */}
        <button
          onClick={crearCarrera}
          className="
            w-full py-3 rounded-xl
            bg-purple-700/70 border border-purple-400/70
            text-white font-bold text-lg
            shadow-[0_0_18px_rgba(200,0,255,0.7)]
            hover:shadow-[0_0_28px_rgba(200,0,255,1)]
            hover:bg-purple-700/90
            active:scale-95
            transition-all duration-300
          "
        >
          Crear Carrera
        </button>

        {/* Botón Gestionar */}
        <button
          onClick={() => (window.location.href = "/admin/remates/gestionar")}
          className="
            w-full py-3 rounded-xl mt-3
            bg-gradient-to-b from-[#003344] to-[#0077AA]
            border border-cyan-300/70
            text-white font-bold text-lg
            shadow-[0_0_18px_rgba(0,255,255,0.5)]
            hover:shadow-[0_0_28px_rgba(0,255,255,0.9)]
            hover:border-cyan-200
            hover:from-[#005577] hover:to-[#0099CC]
            active:scale-95
            transition-all duration-300
          "
        >
          📋 Gestionar Carreras
        </button>

        {/* Botón Reiniciar Jackpot */}
        <button
          onClick={reiniciarJackpot}
          className="
            w-full py-3 rounded-xl mt-3
            bg-gradient-to-b from-red-950 to-red-700
            border border-red-400/70
            text-white font-bold text-lg
            shadow-[0_0_18px_rgba(255,0,0,0.5)]
            hover:shadow-[0_0_28px_rgba(255,0,0,0.9)]
            hover:border-red-300
            hover:from-red-800 hover:to-red-600
            active:scale-95
            transition-all duration-300
          "
        >
          🔄 Reiniciar Jackpot y Clasificación
        </button>

      </div>
    </main>
  );
}