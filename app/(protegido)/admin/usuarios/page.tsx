"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminUsuarios() {
  const router = useRouter();

  const [telefono, setTelefono] = useState("");
  const [usuario, setUsuario] = useState<any>(null);
  const [monto, setMonto] = useState<number>(0);
  const [asunto, setAsunto] = useState("");
  const [razonBloqueo, setRazonBloqueo] = useState("");

  const buscarUsuario = async () => {
    const res = await fetch("/api/admin/buscar", {
      method: "POST",
      body: JSON.stringify({ telefono }),
    });

    const data = await res.json();

    if (data.error) {
      alert(data.error);
      setUsuario(null);
      return;
    }

    setUsuario(data);
    setRazonBloqueo(data.razon_bloqueo || "");
  };

  const enviarMovimiento = async (tipo: "recarga" | "retiro") => {
    if (!usuario) return;

    await fetch("/api/admin/movimiento", {
      method: "POST",
      body: JSON.stringify({
        usuarioId: usuario.id,
        tipo,
        monto,
        asunto,
      }),
    });

    alert("Movimiento registrado");
    buscarUsuario();
  };

  const cambiarEstadoBloqueo = async (bloquear: boolean) => {
    if (!usuario) return;

    await fetch("/api/admin/bloqueo", {
      method: "POST",
      body: JSON.stringify({
        usuarioId: usuario.id,
        bloquear,
        razon: bloquear ? razonBloqueo : "",
      }),
    });

    alert(bloquear ? "Usuario bloqueado" : "Usuario desbloqueado");
    buscarUsuario();
  };

  return (
    <main className="p-8 text-white space-y-10 bg-[#0F172A] min-h-screen">

      {/* BOTÓN VOLVER */}
      <button
        onClick={() => router.push("/admin")}
        className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-white"
      >
        ← Volver al Panel
      </button>

      {/* TÍTULO */}
      <h1 className="text-4xl font-bold">Gestión de Usuarios</h1>

      {/* BUSCADOR */}
      <div className="bg-[#1E293B] p-6 rounded-xl border border-white/10 shadow-lg space-y-4">
        <h2 className="text-2xl font-semibold text-white">Buscar Usuario</h2>

        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Número de teléfono"
            className="bg-white text-black px-3 py-2 rounded w-64 border border-gray-300 focus:ring-2 focus:ring-blue-500"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />

          <button
            onClick={buscarUsuario}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded text-lg"
          >
            Buscar
          </button>
        </div>
      </div>

      {/* INFORMACIÓN DEL USUARIO */}
      {usuario && (
        <div className="bg-[#1E293B] p-6 rounded-xl border border-white/10 shadow-lg space-y-6">

          <h2 className="text-2xl font-semibold text-white">Información del Usuario</h2>

          <div className="grid grid-cols-2 gap-6">

            <div className="bg-[#0F172A] p-4 rounded-lg border border-white/10">
              <p><b>Nombre:</b> {usuario.nombre}</p>
              <p><b>Apellido:</b> {usuario.apellido}</p>
              <p><b>Comida favorita:</b> {usuario.comida_favorita}</p>
            </div>

            <div className="bg-[#0F172A] p-4 rounded-lg border border-white/10">
              <p><b>Teléfono:</b> {usuario.telefono}</p>
              <p><b>Saldo actual:</b> ${usuario.saldo}</p>
              <p><b>Creado:</b> {new Date(usuario.creado_en).toLocaleString()}</p>
              <p>
                <b>Estado:</b>{" "}
                {usuario.bloqueado ? (
                  <span className="text-red-400 font-bold">Bloqueado</span>
                ) : (
                  <span className="text-green-400 font-bold">Activo</span>
                )}
              </p>
              {usuario.bloqueado && usuario.razon_bloqueo && (
                <p className="text-gray-400 text-sm mt-2">
                  Razón: {usuario.razon_bloqueo}
                </p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* HISTORIAL */}
      {usuario && (
        <div className="bg-[#1E293B] p-6 rounded-xl border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Historial de Movimientos</h2>
            <p className="text-gray-400 mt-1">Ver todas las transacciones, apuestas y pujas del usuario</p>
          </div>
          <button onClick={() => router.push(`/historial?admin_user_id=${usuario.id}`)}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-lg font-semibold"
          >
            Ver Historial
          </button>
        </div>
      )}

      {/* OPERACIONES */}
      {usuario && (
        <div className="bg-[#1E293B] p-6 rounded-xl border border-white/10 shadow-lg space-y-6">

          <h2 className="text-2xl font-semibold text-white">Operaciones</h2>

          <div className="grid grid-cols-2 gap-6">

            <div className="space-y-4">
              <label className="block text-lg text-gray-300">Monto:</label>
              <input
                type="number"
                className="bg-white text-black px-3 py-2 rounded w-full border border-gray-300 focus:ring-2 focus:ring-blue-500"
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
              />
            </div>

            <div className="space-y-4">
              <label className="block text-lg text-gray-300">Asunto:</label>
              <input
                type="text"
                className="bg-white text-black px-3 py-2 rounded w-full border border-gray-300 focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Bonus por fidelidad"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
              />
            </div>

          </div>

          <div className="flex gap-6 pt-4">
            <button
              onClick={() => enviarMovimiento("recarga")}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-lg"
            >
              Recargar
            </button>

            <button
              onClick={() => enviarMovimiento("retiro")}
              className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded text-lg"
            >
              Retirar
            </button>
          </div>

        </div>
      )}

      {/* BLOQUEO DE USUARIO */}
      {usuario && (
        <div className="bg-[#1E293B] p-6 rounded-xl border border-white/10 shadow-lg space-y-6">

          <h2 className="text-2xl font-semibold text-white">Control de Bloqueo</h2>

          <div className="space-y-4">
            <label className="block text-lg text-gray-300">Razón del bloqueo:</label>
            <input
              type="text"
              className="bg-white text-black px-3 py-2 rounded w-full border border-gray-300 focus:ring-2 focus:ring-red-500"
              placeholder="Ej: Actividad sospechosa, solicitud del usuario..."
              value={razonBloqueo}
              onChange={(e) => setRazonBloqueo(e.target.value)}
            />
          </div>

          <div className="flex gap-6 pt-4">
            <button
              onClick={() => cambiarEstadoBloqueo(true)}
              className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded text-lg"
            >
              Bloquear Usuario
            </button>

            <button
              onClick={() => cambiarEstadoBloqueo(false)}
              className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-lg"
            >
              Desbloquear Usuario
            </button>
          </div>

        </div>
      )}

    </main>
  );
}
