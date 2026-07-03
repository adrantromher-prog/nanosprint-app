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
  creado_en,
  saldo,
  rol,
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

  const fecha = creado_en ? new Date(creado_en).toLocaleDateString("es-VE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }) : "";

  return (
    <main className="relative min-h-screen w-full overflow-hidden">
      <video src="/fondos/fondohome.mp4" autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover scale-[1.1] brightness-[0.6] contrast-[1.1] saturate-[1.1]"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/80" />

      <div className="relative z-10 w-full min-h-screen flex flex-col px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push("/home")}
            className="px-4 py-2 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] text-white font-semibold text-sm tracking-wide hover:bg-white/[0.12] active:scale-95 transition-all">
            ← Volver
          </button>
          <h1 className="text-white text-xl font-extrabold tracking-wide">Mi Perfil</h1>
          <div className="w-20" />
        </div>

        <div className="flex flex-col items-center gap-6 max-w-md mx-auto w-full">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-3xl shadow-[0_0_20px_rgba(0,255,255,0.3)]">
            {nombre?.charAt(0).toUpperCase()}
          </div>

          {codigo_referido && (
            <button onClick={handleCopyCode}
              className="w-full p-4 rounded-2xl bg-gradient-to-b from-yellow-900/40 to-yellow-900/20 backdrop-blur-xl border border-yellow-400/40 shadow-[0_0_20px_rgba(255,200,0,0.15)] hover:shadow-[0_0_30px_rgba(255,200,0,0.3)] active:scale-[0.98] transition-all duration-300 text-left">
              <p className="text-yellow-300/70 text-[10px] font-semibold tracking-[0.15em] uppercase mb-2">Código de referido</p>
              <div className="flex items-center justify-between">
                <span className="text-yellow-100 font-black text-3xl tracking-[0.1em] drop-shadow-[0_0_8px_rgba(255,200,0,0.3)]">
                  {codigo_referido}
                </span>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all duration-300 ${copied ? "text-green-300 border-green-400/60 bg-green-900/30" : "text-yellow-300 border-yellow-400/40 bg-yellow-900/20"}`}>
                  {copied ? "¡Copiado!" : "Copiar"}
                </span>
              </div>
            </button>
          )}

          <div className="w-full space-y-3">
            <div className="p-4 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <h2 className="text-white/50 text-[10px] font-semibold tracking-[0.15em] uppercase mb-3">Datos de registro</h2>
              <div className="space-y-3">
                <DataRow label="Nombre" value={`${nombre} ${apellido}`} />
                <DataRow label="Sobrenombre" value={sobrenombre} />
                <DataRow label="Teléfono" value={telefono} />
                <DataRow label="Sexo" value={sexo === "M" ? "Masculino" : "Femenino"} />
                <DataRow label="Comida favorita" value={comida_favorita} />
                <DataRow label="Fecha de registro" value={fecha} />
                <DataRow label="Rol" value={rol} />
                <div className="pt-2 mt-2 border-t border-white/[0.06]">
                  <DataRow label="Saldo actual" value={`Bs. ${Number(saldo).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`} />
                </div>
              </div>
            </div>

            <button onClick={() => { setShowPasswordForm(!showPasswordForm); setMessage(""); }}
              className="w-full py-3 rounded-xl bg-gradient-to-b from-cyan-600 to-cyan-800 border border-cyan-400/50 text-white font-bold text-sm tracking-wide shadow-[0_0_18px_rgba(0,200,255,0.25)] hover:shadow-[0_0_28px_rgba(0,200,255,0.5)] active:scale-95 transition-all">
              {showPasswordForm ? "Cancelar" : "Cambiar contraseña"}
            </button>

            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="p-4 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.4)] space-y-3">
                <input type="password" placeholder="Contraseña actual" value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  className="w-full p-3 bg-black/40 text-white border border-cyan-300/40 rounded-lg focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(0,255,255,0.7)] placeholder-white/50 text-sm" />
                <input type="password" placeholder="Nueva contraseña" value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  className="w-full p-3 bg-black/40 text-white border border-cyan-300/40 rounded-lg focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(0,255,255,0.7)] placeholder-white/50 text-sm" />
                <input type="password" placeholder="Repetir nueva contraseña" value={passwordConfirmar}
                  onChange={(e) => setPasswordConfirmar(e.target.value)}
                  className="w-full p-3 bg-black/40 text-white border border-cyan-300/40 rounded-lg focus:outline-none focus:border-cyan-300 focus:shadow-[0_0_12px_rgba(0,255,255,0.7)] placeholder-white/50 text-sm" />
                <button type="submit"
                  className="w-full py-2.5 text-base font-bold text-white rounded-lg border border-orange-400 shadow-[0_0_12px_rgba(255,150,0,0.7)] hover:shadow-[0_0_20px_rgba(255,150,0,1)] hover:border-orange-300 transition duration-300 backdrop-blur-sm bg-orange-500/20 active:scale-95">
                  Guardar contraseña
                </button>
                {message && (
                  <p className={`text-center text-xs font-bold py-1.5 px-3 rounded-lg backdrop-blur-sm ${isError ? "text-red-300 bg-red-900/40 border border-red-500/60" : "text-green-300 bg-green-900/40 border border-green-500/60"}`}>
                    {message}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/50 text-xs font-medium tracking-wide">{label}</span>
      <span className="text-white text-sm font-semibold">{value}</span>
    </div>
  );
}
