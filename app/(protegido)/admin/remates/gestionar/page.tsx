"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Caballo {
  id: number;
  numero: number;
  nombre: string;
  retirado: boolean;
}

interface Carrera {
  id: number;
  hipodromo: string;
  numero_carrera: number;
  hora_cierre: string;
  tipo: string;
  estado: string;
  ganador: number | null;
  caballos: Caballo[];
}

function Temporizador({ horaCierre, estado }: { horaCierre: string; estado?: string }) {
  const [tiempoRestante, setTiempoRestante] = useState("");
  const [abierto, setAbierto] = useState(true);

  const cerrado = estado === "cerrada";

  useEffect(() => {
    if (cerrado) {
      setAbierto(false);
      setTiempoRestante("");
      return;
    }
    const calcular = () => {
      const ahora = new Date();
      const [horas, minutos] = horaCierre.split(":").map(Number);
      const cierre = new Date();
      cierre.setHours(horas, minutos, 0, 0);
      const diff = cierre.getTime() - ahora.getTime();

      if (diff <= 0) {
        setAbierto(false);
        setTiempoRestante("00:00:00");
        return;
      }
      setAbierto(true);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTiempoRestante(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    calcular();
    const intervalo = setInterval(calcular, 1000);
    return () => clearInterval(intervalo);
  }, [horaCierre, cerrado]);

  return (
    <div className="flex items-center gap-2">
      <span className={`px-3 py-1 rounded-full text-sm font-bold ${abierto ? "bg-green-500/20 text-green-300 border border-green-400/50" : "bg-red-500/20 text-red-300 border border-red-400/50"}`}>
        {abierto ? "● ABIERTO" : "● CERRADO"}
      </span>
      {abierto && <span className="text-white font-mono text-sm">{tiempoRestante}</span>}
    </div>
  );
}

function TarjetaAdmin({ carrera, onCerrar, onRetirar, onDeclararGanador, onEliminar, onAnular }: {
  carrera: Carrera;
  onCerrar: (carrera_id: number) => void;
  onRetirar: (caballo_id: number) => void;
  onDeclararGanador: (carrera_id: number, numero: number) => void;
  onEliminar: (carrera_id: number) => void;
  onAnular: (carrera_id: number) => void;
}) {
  const [expandida, setExpandida] = useState(false);
  const [ganadorSeleccionado, setGanadorSeleccionado] = useState<number | "">("");

  const caballosActivos = carrera.caballos.filter((c) => !c.retirado);

  return (
    <div className="bg-gray-900/70 border border-gray-700 rounded-2xl p-4 shadow-xl mb-4">

      <div className="cursor-pointer" onClick={() => setExpandida(!expandida)}>
        <h3 className="text-lg font-bold text-white">{carrera.hipodromo}</h3>
        <p className="text-gray-400 text-sm">Carrera #{carrera.numero_carrera}</p>
        <Temporizador horaCierre={carrera.hora_cierre} estado={carrera.estado} />

        {carrera.ganador && (
          <div className="mt-2 px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-400/50 text-center">
            <span className="text-yellow-300 font-bold">🏆 GANADOR: Caballo #{carrera.ganador}</span>
          </div>
        )}

        <p className="text-gray-500 text-xs mt-2 text-right">
          {expandida ? "▲ Cerrar" : "▼ Gestionar"}
        </p>
      </div>

      {expandida && (
        <div className="mt-4 border-t border-gray-700 pt-4">

          <div className="space-y-2 mb-4">
            {carrera.caballos.map((caballo) => (
              <div
                key={caballo.id}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${
                  caballo.retirado
                    ? "bg-red-500/10 border border-red-400/20"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-gray-400">#{caballo.numero}</span>
                  <span className={caballo.retirado ? "line-through text-gray-500" : "text-white"}>
                    {caballo.nombre}
                  </span>
                  {caballo.retirado && (
                    <span className="text-red-400 text-xs font-bold">RETIRADO</span>
                  )}
                </div>

                {!caballo.retirado && (
                  <button
                    onClick={() => onRetirar(caballo.id)}
                    className="
                      px-3 py-1 rounded-lg text-xs font-bold
                      bg-red-500/20 border border-red-400/50 text-red-300
                      hover:bg-red-500/40 hover:shadow-[0_0_10px_rgba(255,0,0,0.4)]
                      active:scale-95 transition-all duration-200
                    "
                  >
                    Retirar
                  </button>
                )}
              </div>
            ))}
          </div>

          {!carrera.ganador && caballosActivos.length > 0 && (
            <div className="border-t border-gray-700 pt-4">
              <p className="text-sm font-bold text-white mb-2">Declarar Ganador:</p>
              <div className="flex gap-2">
                <select
                  value={ganadorSeleccionado}
                  onChange={(e) => setGanadorSeleccionado(Number(e.target.value))}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-purple-300/40 text-white text-sm"
                >
                  <option value="">Selecciona un caballo...</option>
                  {caballosActivos.map((c) => (
                    <option key={c.id} value={c.numero}>
                      #{c.numero} — {c.nombre}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    if (ganadorSeleccionado !== "") {
                      onDeclararGanador(carrera.id, Number(ganadorSeleccionado));
                    }
                  }}
                  className="
                    px-4 py-2 rounded-xl font-bold text-sm
                    bg-yellow-500/20 border border-yellow-400/50 text-yellow-300
                    hover:bg-yellow-500/40 hover:shadow-[0_0_10px_rgba(255,200,0,0.5)]
                    active:scale-95 transition-all duration-200
                  "
                >
                  🏆 Confirmar
                </button>
              </div>
            </div>
          )}

          {carrera.estado === "abierta" && !carrera.ganador && (
            <div className="border-t border-gray-700 pt-4 mt-4">
              <button
                onClick={() => onCerrar(carrera.id)}
                className="
                  w-full py-2 rounded-xl font-bold text-sm
                  bg-orange-500/20 border border-orange-400/50 text-orange-300
                  hover:bg-orange-500/40 hover:shadow-[0_0_10px_rgba(255,150,0,0.4)]
                  active:scale-95 transition-all duration-200
                "
              >
                🔒 Cerrar Carrera
              </button>
            </div>
          )}

          <div className="border-t border-gray-700 pt-4 mt-4 flex gap-2">
            <button
              onClick={() => onAnular(carrera.id)}
              className="
                flex-1 py-2 rounded-xl font-bold text-sm
                bg-purple-500/20 border border-purple-400/50 text-purple-300
                hover:bg-purple-500/40 hover:shadow-[0_0_10px_rgba(150,50,255,0.4)]
                active:scale-95 transition-all duration-200
              "
            >
              🚫 Anular Carrera
            </button>
            <button
              onClick={() => onEliminar(carrera.id)}
              className="
                flex-1 py-2 rounded-xl font-bold text-sm
                bg-red-500/20 border border-red-400/50 text-red-300
                hover:bg-red-500/40 hover:shadow-[0_0_10px_rgba(255,0,0,0.4)]
                active:scale-95 transition-all duration-200
              "
            >
              🗑️ Eliminar
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

export default function GestionarRemates() {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const router = useRouter();

  const fetchCarreras = async () => {
    const res = await fetch("/api/remates/activas");
    const data = await res.json();
    if (data.ok) setCarreras(data.carreras);
  };

  useEffect(() => {
    fetchCarreras();
    const intervalo = setInterval(fetchCarreras, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const cerrarCarrera = async (carrera_id: number) => {
    const confirmar = window.confirm("¿Estás seguro de cerrar esta carrera? Los usuarios no podrán seguir pujando.");
    if (!confirmar) return;

    await fetch("/api/admin/remates/cerrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrera_id }),
    });
    fetchCarreras();
  };

  const retirarCaballo = async (caballo_id: number) => {
    await fetch("/api/admin/remates/retirar-caballo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caballo_id }),
    });
    fetchCarreras();
  };

  const declararGanador = async (carrera_id: number, numero_ganador: number) => {
    await fetch("/api/admin/remates/declarar-ganador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrera_id, numero_ganador }),
    });
    fetchCarreras();
  };

  const eliminarCarrera = async (carrera_id: number) => {
    const confirmar = window.confirm("¿Estás seguro de eliminar esta carrera? Se borrarán todos sus caballos y pujas.");
    if (!confirmar) return;
    await fetch("/api/admin/remates/eliminar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrera_id }),
    });
    fetchCarreras();
  };

  const anularCarrera = async (carrera_id: number) => {
    const confirmar = window.confirm("¿Anular esta carrera? Se devolverá el dinero a todos los pujadores.");
    if (!confirmar) return;
    await fetch("/api/admin/remates/anular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrera_id }),
    });
    fetchCarreras();
  };

  const nacionales = carreras.filter((c) => c.tipo === "nacional");
  const americanas = carreras.filter((c) => c.tipo === "americana");

  return (
    <main className="relative min-h-screen w-full text-white overflow-hidden">

      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1f3c 50%, #091428 100%)" }} />

      <div className="relative z-10 p-6">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl md:text-3xl font-bold drop-shadow-[0_0_12px_rgba(0,255,255,0.6)]">
            Gestionar Carreras
          </h1>
          <button
            onClick={() => router.push("/admin/remates")}
            className="
              px-4 py-2 rounded-xl
              bg-gradient-to-b from-[#003344] to-[#0077AA]
              border border-cyan-300/70 text-white font-bold
              shadow-[0_0_18px_rgba(0,255,255,0.5)]
              hover:shadow-[0_0_28px_rgba(0,255,255,0.9)]
              active:scale-95 transition-all duration-300
            "
          >
            ← Volver
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

          <section>
            <h2 className="text-3xl font-semibold mb-4 text-cyan-300 drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
              Nacionales
            </h2>
            {nacionales.length === 0
              ? <p className="text-gray-400">No hay carreras nacionales.</p>
              : nacionales.map((c) => (
                <TarjetaAdmin
                  key={c.id}
                  carrera={c}
                  onCerrar={cerrarCarrera}
                  onRetirar={retirarCaballo}
                  onDeclararGanador={declararGanador}
                  onEliminar={eliminarCarrera}
                  onAnular={anularCarrera}
                />
              ))
            }
          </section>

          <section>
            <h2 className="text-3xl font-semibold mb-4 text-purple-300 drop-shadow-[0_0_10px_rgba(200,0,255,0.5)]">
              Americanos
            </h2>
            {americanas.length === 0
              ? <p className="text-gray-400">No hay carreras americanas.</p>
              : americanas.map((c) => (
                <TarjetaAdmin
                  key={c.id}
                  carrera={c}
                  onCerrar={cerrarCarrera}
                  onRetirar={retirarCaballo}
                  onDeclararGanador={declararGanador}
                  onEliminar={eliminarCarrera}
                  onAnular={anularCarrera}
                />
              ))
            }
          </section>

        </div>
      </div>
    </main>
  );
}