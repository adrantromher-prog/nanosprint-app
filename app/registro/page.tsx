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
      setMessage("N\u00famero de tel\u00e9fono inv\u00e1lido (11 d\u00edgitos, ej: 04121234567)");
      setIsError(true);
      return;
    }

    if (password !== confirmar) {
      setMessage("Las contrase\u00f1as no coinciden");
      setIsError(true);
      return;
    }

    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre, apellido, sobrenombre, telefono, comida, sexo, password,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error);
      setIsError(true);
      return;
    }

    setMessage("Registro exitoso");
    setIsError(false);

    setTimeout(() => {
      router.push("/login");
    }, 1000);
  };

  return (
    <main className="relative h-screen w-full overflow-hidden">

      <button type="button" onClick={() => router.push("/login")}
        className="absolute top-4 right-4 z-20 px-4 py-2 text-xs font-bold text-white/60 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.10] hover:text-white/80 hover:border-white/20 active:scale-95 transition-all backdrop-blur-sm"
      >
        {"\u2190"} Volver
      </button>

      <div className="relative z-10 flex items-center justify-center h-full px-4 pt-12">
        <div className="w-full max-w-sm bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

          <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600" />

          <div className="p-6">
            <h1 className="text-lg font-bold text-center text-white/90 mb-5 tracking-wide">
              Crear cuenta
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Nombre</label>
                  <input type="text" placeholder=""
                    value={nombre} onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/50 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 placeholder-white/30 text-sm transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Apellido</label>
                  <input type="text" placeholder=""
                    value={apellido} onChange={(e) => setApellido(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/50 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 placeholder-white/30 text-sm transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Sobrenombre</label>
                <input type="text" placeholder=""
                  value={sobrenombre} onChange={(e) => setSobrenombre(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black/50 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 placeholder-white/30 text-sm transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{"N\u00famero de tel\u00e9fono"}</label>
                <input type="tel" placeholder=""
                  value={telefono} onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black/50 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 placeholder-white/30 text-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Comida favorita</label>
                  <input type="text" placeholder=""
                    value={comida} onChange={(e) => setComida(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/50 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 placeholder-white/30 text-sm transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Sexo</label>
                  <select value={sexo} onChange={(e) => setSexo(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/50 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 text-sm transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Seleccionar</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{"Contrase\u00f1a"}</label>
                  <input type="password" placeholder=""
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/50 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 placeholder-white/30 text-sm transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{"Repetir contrase\u00f1a"}</label>
                  <input type="password" placeholder=""
                    value={confirmar} onChange={(e) => setConfirmar(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/50 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 placeholder-white/30 text-sm transition-all"
                  />
                </div>
              </div>

              <button type="submit"
                className="w-full py-2.5 text-sm font-bold text-white rounded-xl border border-white/20 bg-white/[0.08] hover:bg-white/[0.14] hover:border-white/30 active:scale-[0.98] transition-all mt-1 tracking-wide"
              >
                Crear cuenta
              </button>

              {message && (
                <p className={`text-center text-xs font-bold py-2 px-3 rounded-xl backdrop-blur-sm transition-all ${
                  isError
                    ? "text-red-300 bg-red-900/30 border border-red-500/30"
                    : "text-green-300 bg-green-900/30 border border-green-500/30"
                }`}>
                  {message}
                </p>
              )}

            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
