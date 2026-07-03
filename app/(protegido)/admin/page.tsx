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
    <main className="p-10 text-white space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Panel del Administrador</h1>
        <button onClick={() => router.push("/home")}
          className="px-5 py-3 rounded-xl bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 text-white font-bold text-lg shadow-[0_0_22px_rgba(0,255,255,0.5)] hover:shadow-[0_0_35px_rgba(0,255,255,0.9)] active:scale-95 transition-all">
          Volver al Home
        </button>
      </div>

      <div className="bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-xl ${mantenimiento ? "bg-yellow-600" : "bg-gray-700"}`}>
              <FaTools size={40} />
            </div>
            <div>
              <h2 className="text-3xl font-semibold">Mantenimiento</h2>
              <p className="text-gray-400 mt-1">
                Estado actual:{" "}
                {mantenimiento ? (
                  <span className="text-yellow-400 font-bold">Activo — sitio en mantenimiento</span>
                ) : (
                  <span className="text-green-400 font-bold">Inactivo — sitio operativo</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => toggleMantenimiento(true)} disabled={mantenimiento || cargando}
              className="px-6 py-3 rounded-xl font-bold text-lg bg-yellow-600 border border-yellow-400 hover:bg-yellow-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              Activar mantenimiento
            </button>
            <button onClick={() => toggleMantenimiento(false)} disabled={!mantenimiento || cargando}
              className="px-6 py-3 rounded-xl font-bold text-lg bg-green-600 border border-green-400 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              Quitar mantenimiento
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div onClick={() => router.push("/admin/remates")}
          className="cursor-pointer bg-gray-900 hover:bg-gray-800 transition-all p-8 rounded-2xl shadow-xl border border-gray-700 hover:shadow-2xl hover:scale-[1.02]">
          <div className="flex items-center gap-6">
            <div className="bg-purple-700 p-4 rounded-xl">
              <FaHorseHead size={40} />
            </div>
            <div>
              <h2 className="text-3xl font-semibold">Remates</h2>
              <p className="text-gray-400 mt-2">Gestiona los remates y actividades relacionadas.</p>
            </div>
          </div>
        </div>

        <div onClick={() => router.push("/admin/usuarios")}
          className="cursor-pointer bg-gray-900 hover:bg-gray-800 transition-all p-8 rounded-2xl shadow-xl border border-gray-700 hover:shadow-2xl hover:scale-[1.02]">
          <div className="flex items-center gap-6">
            <div className="bg-blue-700 p-4 rounded-xl">
              <FaUsers size={40} />
            </div>
            <div>
              <h2 className="text-3xl font-semibold">Usuarios</h2>
              <p className="text-gray-400 mt-2">Consulta, edita y gestiona los usuarios registrados.</p>
            </div>
          </div>
        </div>

        <div onClick={() => router.push("/admin/movimientos")}
          className="cursor-pointer bg-gray-900 hover:bg-gray-800 transition-all p-8 rounded-2xl shadow-xl border border-gray-700 hover:shadow-2xl hover:scale-[1.02]">
          <div className="flex items-center gap-6">
            <div className="bg-green-700 p-4 rounded-xl">
              <FaChartBar size={40} />
            </div>
            <div>
              <h2 className="text-3xl font-semibold">Movimientos</h2>
              <p className="text-gray-400 mt-2">Estadísticas generales de remates.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}