"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaUsers, FaHorseHead, FaTools, FaChartBar } from "react-icons/fa";

export default function AdminHome() {
  const router = useRouter();
  const [mantenimiento, setMantenimiento] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/mantenimiento")
      .then((r) => r.json())
      .then((d) => setMantenimiento(d.mantenimiento));
  }, []);

  const toggleMantenimiento = async (activo: boolean) => {
    setCargando(true);
    await fetch("/api/admin/mantenimiento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo }),
    });
    setMantenimiento(activo);
    setCargando(false);
  };

  return (
    <main className="p-4 md:p-8 lg:p-10 text-white space-y-6 md:space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl md:text-4xl font-bold">Panel del Administrador</h1>
        <button onClick={() => router.push("/home")}
          className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 text-white font-bold text-sm md:text-base shadow-[0_0_22px_rgba(0,255,255,0.5)] hover:shadow-[0_0_35px_rgba(0,255,255,0.9)] active:scale-95 transition-all">
          Volver al Home
        </button>
      </div>

      <div className="bg-gray-900 p-4 md:p-8 rounded-2xl shadow-xl border border-gray-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 md:p-4 rounded-xl ${mantenimiento ? "bg-yellow-600" : "bg-gray-700"}`}>
              <FaTools size={28} className="md:w-10 md:h-10" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-semibold">Mantenimiento</h2>
              <p className="text-gray-400 mt-1 text-sm md:text-base">
                Estado actual:{" "}
                {mantenimiento ? (
                  <span className="text-yellow-400 font-bold">Activo — sitio en mantenimiento</span>
                ) : (
                  <span className="text-green-400 font-bold">Inactivo — sitio operativo</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button onClick={() => toggleMantenimiento(true)} disabled={mantenimiento || cargando}
              className="px-4 py-2 rounded-xl font-bold text-sm bg-yellow-600 border border-yellow-400 hover:bg-yellow-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              Activar mantenimiento
            </button>
            <button onClick={() => toggleMantenimiento(false)} disabled={!mantenimiento || cargando}
              className="px-4 py-2 rounded-xl font-bold text-sm bg-green-600 border border-green-400 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              Quitar mantenimiento
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10">
        <div onClick={() => router.push("/admin/remates")}
          className="cursor-pointer bg-gray-900 hover:bg-gray-800 transition-all p-4 md:p-8 rounded-2xl shadow-xl border border-gray-700 hover:shadow-2xl hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="bg-purple-700 p-3 md:p-4 rounded-xl">
              <FaHorseHead size={28} className="md:w-10 md:h-10" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-semibold">Remates</h2>
              <p className="text-gray-400 mt-1 text-sm md:text-base">Gestiona los remates y actividades relacionadas.</p>
            </div>
          </div>
        </div>

        <div onClick={() => router.push("/admin/usuarios")}
          className="cursor-pointer bg-gray-900 hover:bg-gray-800 transition-all p-4 md:p-8 rounded-2xl shadow-xl border border-gray-700 hover:shadow-2xl hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="bg-blue-700 p-3 md:p-4 rounded-xl">
              <FaUsers size={28} className="md:w-10 md:h-10" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-semibold">Usuarios</h2>
              <p className="text-gray-400 mt-1 text-sm md:text-base">Consulta, edita y gestiona los usuarios registrados.</p>
            </div>
          </div>
        </div>

        <div onClick={() => router.push("/admin/movimientos")}
          className="cursor-pointer bg-gray-900 hover:bg-gray-800 transition-all p-4 md:p-8 rounded-2xl shadow-xl border border-gray-700 hover:shadow-2xl hover:scale-[1.02]">
          <div className="flex items-center gap-4">
            <div className="bg-green-700 p-3 md:p-4 rounded-xl">
              <FaChartBar size={28} className="md:w-10 md:h-10" />
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-semibold">Movimientos</h2>
              <p className="text-gray-400 mt-1 text-sm md:text-base">Estadísticas generales de remates.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}