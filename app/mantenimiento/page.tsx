"use client";

import { useEffect, useState } from "react";

export default function MantenimientoPage() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/admin/mantenimiento");
        const data = await res.json();
        if (!data.mantenimiento) {
          setOnline(true);
        }
      } catch {}
    };
    const id = setInterval(check, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (online) window.location.href = "/home";
  }, [online]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center text-white p-10 text-center"
      style={{
        background:
          "linear-gradient(135deg, #0a0f1e 0%, #0d1f3c 50%, #091428 100%)",
      }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-900/20 blur-[120px]" />
      </div>
      <div className="relative flex flex-col items-center gap-6 max-w-lg">
        <div className="text-7xl animate-pulse">🔧</div>
        <h1 className="text-4xl font-extrabold text-cyan-300 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]">
          Sitio en Mantenimiento
        </h1>
        <p className="text-white/70 text-lg leading-relaxed">
          Estamos realizando mejoras para brindarte una mejor experiencia.
          Vuelve en unos minutos.
        </p>
        <div className="w-full h-px bg-white/10 my-2" />
        <p className="text-white/40 text-sm font-mono tracking-widest">
          Nos disculpamos por los inconvenientes.
        </p>
      </div>
    </main>
  );
}
