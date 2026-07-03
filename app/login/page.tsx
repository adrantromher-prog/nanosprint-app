"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefono, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error);
      return;
    }

    router.push("/home");
  };

  return (
    <main className="relative h-screen w-full overflow-hidden">

      {/* ⭐ FONDO DIFUMINADO + OSCURECIDO */}
      <img
        src="/fondos/fondologin.png"
        alt="Fondo futurista"
        className="
          absolute top-0 left-0 w-full h-full object-cover 
          blur-md brightness-50
        "
      />

      {/* CONTENIDO */}
      <div className="relative z-10 flex items-end justify-center h-full pb-10 px-4">

        {/* TARJETA FUTURISTA */}
        <div
          className="
            w-full max-w-sm 
            bg-white/10 
            backdrop-blur-xl 
            border border-cyan-300/30 
            shadow-[0_0_15px_rgba(0,255,255,0.4)] 
            rounded-xl 
            p-5
          "
        >
          <h1 className="text-2xl font-bold text-center text-white mb-4 drop-shadow">
            Iniciar Sesión
          </h1>

          {/* FORMULARIO */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">

            {/* ⭐ INPUT TELEFONO OSCURECIDO */}
            <input
              type="tel"
              placeholder="Número de teléfono"
              value={telefono}
              onChange={(e) => {
                setTelefono(e.target.value);
                setMessage("");
              }}
              className="
                w-full p-3 
                bg-black/40 
                text-white 
                border border-cyan-300/40 
                rounded-lg 
                focus:outline-none 
                focus:border-cyan-300 
                focus:shadow-[0_0_12px_rgba(0,255,255,0.7)]
                placeholder-white/50
                text-sm
              "
            />

            {/* ⭐ INPUT PASSWORD OSCURECIDO */}
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setMessage("");
              }}
              className="
                w-full p-3 
                bg-black/40 
                text-white 
                border border-cyan-300/40 
                rounded-lg 
                focus:outline-none 
                focus:border-cyan-300 
                focus:shadow-[0_0_12px_rgba(0,255,255,0.7)]
                placeholder-white/50
                text-sm
              "
            />

            {/* BOTÓN LOGIN */}
            <button
              type="submit"
              className="
                w-full py-2.5 
                text-base font-bold 
                text-white 
                rounded-lg 
                border border-orange-400 
                shadow-[0_0_12px_rgba(255,150,0,0.7)] 
                hover:shadow-[0_0_20px_rgba(255,150,0,1)] 
                hover:border-orange-300 
                transition 
                duration-300 
                backdrop-blur-sm 
                bg-orange-500/20
                active:scale-95
              "
            >
              Entrar
            </button>

            {/* BOTÓN REGISTRO */}
            <button
              type="button"
              onClick={() => router.push("/registro")}
              className="
                w-full py-2.5 
                text-base font-bold 
                text-cyan-300 
                rounded-lg 
                border border-cyan-300 
                shadow-[0_0_8px_rgba(0,255,255,0.4)] 
                hover:shadow-[0_0_15px_rgba(0,255,255,0.8)] 
                hover:border-cyan-200 
                transition 
                duration-300 
                backdrop-blur-sm 
                bg-white/10
                active:scale-95
              "
            >
              Registrarse
            </button>

            {message && (
              <p className="text-center text-red-400 text-sm mt-1">{message}</p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}
