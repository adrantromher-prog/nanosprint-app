"use client";

import { useRouter } from "next/navigation";
import { FaPlusCircle, FaListUl, FaStore } from "react-icons/fa";

export default function AdminPollaHub() {
  const router = useRouter();

  return (
    <main className="min-h-screen p-4 text-white bg-[#0a0f1e]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-4xl font-bold">Polla Hípica</h1>
        <button onClick={() => router.push("/admin")}
          className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#003344] to-[#0077AA] border border-cyan-300/70 text-white font-bold shadow-[0_0_18px_rgba(0,255,255,0.5)] hover:shadow-[0_0_28px_rgba(0,255,255,0.9)] active:scale-95 transition-all">
          ← Volver
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
        <button onClick={() => router.push("/admin/polla/crear")}
          className="bg-gray-900 hover:bg-gray-800 transition-all p-8 rounded-2xl shadow-xl border border-gray-700 hover:shadow-2xl hover:scale-[1.02] text-left">
          <div className="bg-emerald-700 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
            <FaPlusCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Crear Polla</h2>
          <p className="text-gray-400 text-sm">Crea una nueva Polla Hípica con 6 carreras.</p>
        </button>

        <button onClick={() => router.push("/admin/polla/gestionar")}
          className="bg-gray-900 hover:bg-gray-800 transition-all p-8 rounded-2xl shadow-xl border border-gray-700 hover:shadow-2xl hover:scale-[1.02] text-left">
          <div className="bg-amber-700 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
            <FaListUl size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Gestionar Pollas</h2>
          <p className="text-gray-400 text-sm">Administra los resultados y cierra las pollas creadas.</p>
        </button>

        <button onClick={() => router.push("/admin/polla/taquillas")}
          className="bg-gray-900 hover:bg-gray-800 transition-all p-8 rounded-2xl shadow-xl border border-gray-700 hover:shadow-2xl hover:scale-[1.02] text-left">
          <div className="bg-purple-700 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
            <FaStore size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Taquillas</h2>
          <p className="text-gray-400 text-sm">Movimientos y ventas realizadas por las taquillas.</p>
        </button>
      </div>
    </main>
  );
}