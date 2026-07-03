"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PerfilClient({
  nombre,
  apellido,
  sobrenombre,
  telefono,
  comida_favorita,
  sexo,
  fechaRegistro,
  codigo_referido,
}: any) {
  const router = useRouter();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(codigo_referido);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
      setMessage("Todos los campos son obligatorios");
      setIsError(true);
      return;
    }

    if (passwordNueva !== passwordConfirmar) {
      setMessage("Las contraseñas nuevas no coinciden");
      setIsError(true);
      return;
    }

    if (passwordNueva.length < 6) {
      setMessage("La nueva contraseña debe tener al menos 6 caracteres");
      setIsError(true);
      return;
    }

    const res = await fetch("/api/perfil/cambiar-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password_actual: passwordActual, password_nueva: passwordNueva }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error);
      setIsError(true);
      return;
    }

    setMessage("Contraseña cambiada exitosamente");
    setIsError(false);
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordConfirmar("");
    setShowPasswordForm(false);
  };

  return (
    <main className="relative h-screen w-full overflow-hidden select-none bg-gray-950">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950" />

      <div className="relative z-10 h-full flex flex-col px-3 py-2 gap-1.5">
        <div className="flex items-center justify-between flex-shrink-0">
          <button onClick={() => router.push("/home")}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] backdrop-blur border border-white/[0.12] text-white font-semibold text-xs tracking-wide hover:bg-white/[0.12] active:scale-95 transition-all">
            ← Volver
          </button>
          <h1 className="text-white text-base font-extrabold tracking-wide">Mi Perfil</h1>
          <div className="w-16" />
        </div>

        <div className="flex-1 flex flex-col items-center gap-1.5 max-w-md mx-auto w-full justify-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-[0_0_14px_rgba(0,255,255,0.25)] flex-shrink-0">
            {nombre?.charAt(0).toUpperCase()}
          </div>

          {codigo_referido && (
            <button onClick={handleCopyCode}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-b from-yellow-900/40 to-yellow-900/20 backdrop-blur border border-yellow-400/40 shadow-[0_0_12px_rgba(255,200,0,0.12)] hover:shadow-[0_0_20px_rgba(255,200,0,0.25)] active:scale-[0.98] transition-all duration-300 text-left flex-shrink-0">
              <p className="text-yellow-300/70 text-[10px] font-semibold tracking-[0.15em] uppercase mb-1">Código de referido</p>
              <div className="flex items-center justify-between">
                <span className="text-yellow-100 font-black text-2xl tracking-[0.1em] drop-shadow-[0_0_6px_rgba(255,200,0,0.25)]">
                  {codigo_referido}
                </span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all duration-300 ${copied ? "text-green-300 border-green-400/60 bg-green-900/30" : "text-yellow-300 border-yellow-400/40 bg-yellow-900/20"}`}>
                  {copied ? "¡Copiado!" : "Copiar"}
                </span>
              </div>
            </button>
          )}

          {!showPasswordForm ? (
            <div className="w-full py-2.5 px-3 rounded-xl bg-white/[0.05] backdrop-blur border border-white/[0.10] shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex-shrink-0">
              <h2 className="text-white/50 text-[10px] font-semibold tracking-[0.15em] uppercase mb-2">Datos de registro</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <DataRow label="Nombre" value={`${nombre} ${apellido}`} />
                <DataRow label="Sobrenombre" value={sobrenombre} />
                <DataRow label="Teléfono" value={telefono} />
                <DataRow label="Sexo" value={sexo === "M" ? "Masculino" : "Femenino"} />
                <DataRow label="Comida" value={comida_favorita} />
                <DataRow label="Registro" value={fechaRegistro} />

              </div>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="w-full py-2.5 px-3 rounded-xl bg-white/[0.05] backdrop-blur border border-white/[0.10] shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex-shrink-0 space-y-2">
              <h2 className="text-white/50 text-[8px] font-semibold tracking-[0.15em] uppercase mb-1.5">Cambiar contraseña</h2>
              <input type="password" placeholder="Contraseña actual" value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                className="w-full p-2.5 bg-black/40 text-white border border-cyan-300/40 rounded-lg focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_10px_rgba(0,255,255,0.6)] placeholder-white/50 text-xs" />
              <input type="password" placeholder="Nueva contraseña" value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                className="w-full p-2.5 bg-black/40 text-white border border-cyan-300/40 rounded-lg focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_10px_rgba(0,255,255,0.6)] placeholder-white/50 text-xs" />
              <input type="password" placeholder="Repetir nueva contraseña" value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
                className="w-full p-2.5 bg-black/40 text-white border border-cyan-300/40 rounded-lg focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_10px_rgba(0,255,255,0.6)] placeholder-white/50 text-xs" />
              <div className="flex gap-2">
                <button type="submit"
                  className="flex-1 py-2 text-sm font-bold text-white rounded-lg border border-orange-400 shadow-[0_0_10px_rgba(255,150,0,0.6)] hover:shadow-[0_0_16px_rgba(255,150,0,0.9)] hover:border-orange-300 transition duration-300 backdrop-blur-sm bg-orange-500/20 active:scale-95">
                  Guardar
                </button>
                <button type="button" onClick={() => { setShowPasswordForm(false); setMessage(""); }}
                  className="px-4 py-2 text-sm font-bold text-white rounded-lg bg-white/[0.08] border border-white/[0.15] hover:bg-white/[0.12] active:scale-95 transition-all">
                  Cancelar
                </button>
              </div>
              {message && (
                <p className={`text-center text-[10px] font-bold py-1 px-2 rounded-lg backdrop-blur-sm ${isError ? "text-red-300 bg-red-900/40 border border-red-500/60" : "text-green-300 bg-green-900/40 border border-green-500/60"}`}>
                  {message}
                </p>
              )}
            </form>
          )}

          <button onClick={() => { setShowPasswordForm(!showPasswordForm); setMessage(""); }}
            className="w-full py-2 rounded-xl bg-gradient-to-b from-cyan-600 to-cyan-800 border border-cyan-400/40 text-white font-bold text-xs tracking-wide shadow-[0_0_12px_rgba(0,200,255,0.2)] hover:shadow-[0_0_20px_rgba(0,200,255,0.4)] active:scale-95 transition-all flex-shrink-0">
            {showPasswordForm ? "Ver datos" : "Cambiar contraseña"}
          </button>
        </div>
      </div>
    </main>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center min-w-0">
      <span className="text-white/50 text-xs font-medium tracking-wide truncate mr-1">{label}</span>
      <span className="text-white text-sm font-semibold truncate text-right">{value}</span>
    </div>
  );
}
