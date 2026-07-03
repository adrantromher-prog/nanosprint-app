"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegistroPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [sobrenombre, setSobrenombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [comida, setComida] = useState("");
  const [sexo, setSexo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre || !apellido || !sobrenombre || !telefono || !comida || !sexo || !password || !confirmar) {
      setMessage("Todos los campos son obligatorios");
      setIsError(true);
      return;
    }

    if (!/^04(12|14|16|24|26)\d{7}$/.test(telefono)) {
      setMessage("Número de teléfono inválido. Debe ser 04XX XXX XXXX (11 dígitos)");
      setIsError(true);
      return;
    }

    if (password !== confirmar) {
      setMessage("Las contraseñas no coinciden");
      setIsError(true);
      return;
    }

    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        apellido,
        sobrenombre,
        telefono,
        comida,
        sexo,
        password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error);
      setIsError(true);
      return;
    }

    setMessage("Registro exitoso ✔");
    setIsError(false);

    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  return (
    <main className="relative h-screen w-full overflow-hidden">
      <img
        src="/fondos/fondoregistro.png"
        alt="Fondo registro"
        className="absolute inset-0 w-full h-full object-cover blur-md brightness-50"
      />

      <button
        type="button"
        onClick={() => router.push("/login")}
        className="
          absolute top-4 right-4 z-20
          px-3 py-1.5 text-sm font-bold text-cyan-300
          rounded-lg border border-cyan-300/60
          shadow-[0_0_8px_rgba(0,255,255,0.4)]
          hover:shadow-[0_0_16px_rgba(0,255,255,0.8)]
          transition duration-300
          backdrop-blur-sm bg-white/10
          active:scale-95
        "
      >
        ← Volver
      </button>

      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4">
        <div className="w-full max-w-sm mx-auto">
          <h1 className="text-2xl font-extrabold text-center text-white mb-4 drop-shadow">
            Crear cuenta
          </h1>

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2.5">

            {/* Fila 1 */}
            <input
              type="text" placeholder="Nombre" value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={`p-3 bg-black/50 text-white border rounded-lg placeholder-white/60 text-sm focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(0,255,255,0.7)] transition-all duration-300 ${isError ? "border-red-500 shadow-[0_0_12px_rgba(255,0,0,0.7)] animate-shake" : "border-cyan-400/40"}`}
            />
            <input
              type="text" placeholder="Comida favorita" value={comida}
              onChange={(e) => setComida(e.target.value)}
              className={`p-3 bg-black/50 text-white border rounded-lg placeholder-white/60 text-sm focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(0,255,255,0.7)] transition-all duration-300 ${isError ? "border-red-500 shadow-[0_0_12px_rgba(255,0,0,0.7)] animate-shake" : "border-cyan-400/40"}`}
            />

            {/* Fila 2 */}
            <input
              type="text" placeholder="Apellido" value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className={`p-3 bg-black/50 text-white border rounded-lg placeholder-white/60 text-sm focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(0,255,255,0.7)] transition-all duration-300 ${isError ? "border-red-500 shadow-[0_0_12px_rgba(255,0,0,0.7)] animate-shake" : "border-cyan-400/40"}`}
            />
            <select
              value={sexo} onChange={(e) => setSexo(e.target.value)}
              className={`p-3 bg-black/50 text-white border rounded-lg text-sm focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(0,255,255,0.7)] transition-all duration-300 ${isError ? "border-red-500 shadow-[0_0_12px_rgba(255,0,0,0.7)] animate-shake" : "border-cyan-400/40"}`}
            >
              <option value="" disabled className="text-gray-400">Sexo</option>
              <option value="M" className="text-white">Masculino</option>
              <option value="F" className="text-white">Femenino</option>
            </select>

            {/* Fila 3 */}
            <input
              type="text" placeholder="Sobrenombre" value={sobrenombre}
              onChange={(e) => setSobrenombre(e.target.value)}
              className={`p-3 bg-black/50 text-white border rounded-lg placeholder-white/60 text-sm focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(0,255,255,0.7)] transition-all duration-300 ${isError ? "border-red-500 shadow-[0_0_12px_rgba(255,0,0,0.7)] animate-shake" : "border-cyan-400/40"}`}
            />
            <input
              type="password" placeholder="Contraseña" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`p-3 bg-black/50 text-white border rounded-lg placeholder-white/60 text-sm focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(0,255,255,0.7)] transition-all duration-300 ${isError ? "border-red-500 shadow-[0_0_12px_rgba(255,0,0,0.7)] animate-shake" : "border-cyan-400/40"}`}
            />

            {/* Fila 4 */}
            <input
              type="tel" placeholder="Teléfono" value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className={`p-3 bg-black/50 text-white border rounded-lg placeholder-white/60 text-sm focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(0,255,255,0.7)] transition-all duration-300 ${isError ? "border-red-500 shadow-[0_0_12px_rgba(255,0,0,0.7)] animate-shake" : "border-cyan-400/40"}`}
            />
            <input
              type="password" placeholder="Repetir contraseña" value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className={`p-3 bg-black/50 text-white border rounded-lg placeholder-white/60 text-sm focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(0,255,255,0.7)] transition-all duration-300 ${isError ? "border-red-500 shadow-[0_0_12px_rgba(255,0,0,0.7)] animate-shake" : "border-cyan-400/40"}`}
            />

            <button
              type="submit"
              className="
                col-span-2
                w-3/5 mx-auto mt-1 py-2.5
                text-base font-bold text-white
                rounded-lg border border-orange-400
                shadow-[0_0_15px_rgba(255,150,0,0.9)]
                hover:shadow-[0_0_25px_rgba(255,150,0,1)]
                hover:border-orange-300
                transition duration-300
                backdrop-blur-sm bg-orange-500/30
                active:scale-95
              "
            >
              Crear cuenta
            </button>

            {message && (
              <p
                className={`
                  col-span-2 text-center text-xs font-bold py-1.5 px-3 rounded-lg backdrop-blur-sm animate-pulse
                  ${isError ? "animate-shake" : ""} transition-all duration-300
                  ${
                    isError
                      ? "text-red-300 bg-red-900/40 border border-red-500/60 shadow-[0_0_12px_rgba(255,0,0,0.7)]"
                      : "text-green-300 bg-green-900/40 border border-green-500/60 shadow-[0_0_12px_rgba(0,255,0,0.7)]"
                  }
                `}
              >
                {message}
              </p>
            )}
          </form>
        </div>
      </div>

      <style>
        {`
          @keyframes shake {
            0% { transform: translateX(0); }
            20% { transform: translateX(-4px); }
            40% { transform: translateX(4px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
            100% { transform: translateX(0); }
          }

          .animate-shake {
            animation: shake 0.3s ease-in-out;
          }
        `}
      </style>
    </main>
  );
}