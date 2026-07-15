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
      <div className="relative z-10 flex items-center justify-center h-full px-4">

        <div className="w-full max-w-sm bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

          <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600" />

          <div className="p-7">
            <h1 className="text-xl font-bold text-center text-white/90 mb-6 tracking-wide">
              {"Iniciar sesi\u00f3n"}
            </h1>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">

              <div className="space-y-1">
                <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider">{"N\u00famer" +
                "o de tel\u00e9fono"}</label>
                <input
                  type="tel"
                  placeholder=""
                  value={telefono}
                  onChange={(e) => {
                    setTelefono(e.target.value);
                    setMessage("");
                  }}
                  className="w-full px-4 py-3 bg-black/50 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 placeholder-white/30 text-sm transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-white/40 font-medium uppercase tracking-wider">{"Contrase\u00f1a"}</label>
                <input
                  type="password"
                  placeholder=""
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setMessage("");
                  }}
                  className="w-full px-4 py-3 bg-black/50 text-white border border-white/10 rounded-xl focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 placeholder-white/30 text-sm transition-all"
                />
              </div>

              <button type="submit"
                className="w-full py-3 text-sm font-bold text-white rounded-xl border border-white/20 bg-white/[0.08] hover:bg-white/[0.14] hover:border-white/30 active:scale-[0.98] transition-all mt-1 tracking-wide"
              >
                Entrar
              </button>

              <button type="button"
                onClick={() => router.push("/registro")}
                className="w-full py-3 text-sm font-bold text-white/50 rounded-xl border border-white/5 bg-transparent hover:bg-white/[0.04] hover:text-white/70 hover:border-white/15 active:scale-[0.98] transition-all tracking-wide"
              >
                Registrarse
              </button>

              {message && (
                <p className="text-center text-red-400 text-sm mt-1">{message}</p>
              )}

            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
