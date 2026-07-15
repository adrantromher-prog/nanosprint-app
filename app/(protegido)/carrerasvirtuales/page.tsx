"use client";

import { useState, useEffect, useRef } from "react";
import ApuestasView from "./ApuestasView";
import CarreraView from "./CarreraView";
import ResultadoView from "./ResultadoView";
import { useUsuario } from "@/hooks/useUsuario";
import { useSSE } from "@/hooks/useSSE";

type Etapa = "apuestas" | "carrera" | "resultado";

export default function CarrerasVirtualesPage() {

  const { usuario, setUsuario } = useUsuario();

  const [etapa, setEtapa] = useState<Etapa>("apuestas");
  const [cuotas, setCuotas] = useState<number[]>([]);
  const [apuestas, setApuestas] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [apuestasConfirmadas, setApuestasConfirmadas] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [ganador, setGanador] = useState<number | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [gananciaTotal, setGananciaTotal] = useState<number>(0);
  const [tiempo, setTiempo] = useState<number>(10);
  const [carreraId, setCarreraId] = useState<number>(0);
  const [carreraNum, setCarreraNum] = useState<number>(1); // â­
  const [estadisticas, setEstadisticas] = useState<any[]>([]);
  const [ultimosGanadores, setUltimosGanadores] = useState<number[]>([]);
  const [transicionActiva, setTransicionActiva] = useState(false);
  const [premioCalculado, setPremioCalculado] = useState(false);
  const ultimaCarreraRestaurada = useRef(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/carrera", { cache: "no-store" });
        const data = await res.json();

        if (data.estado !== etapa) {
          setTransicionActiva(true);
          setTimeout(() => {
            setEtapa(data.estado);
            setTransicionActiva(false);
          }, 1100);
        }

        setTiempo(data.tiempoRestante);
        setCuotas(data.cuotas);
        setGanador(data.ganador);
        setVideoUrl(data.video ?? "");
        setCarreraNum(data.numeroCarrera ?? 1); // â­
        setEstadisticas(data.estadisticas ?? []);
        setUltimosGanadores(data.ultimosGanadores ?? []);

        if (data.carreraId) setCarreraId(data.carreraId);

      } catch (e) {
        console.error("Error obteniendo estado global:", e);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [etapa]);

  useSSE({
    channels: ["global:carrera"],
    onMessage: (channel, data: any) => {
      if (channel === "global:carrera") {
        if (data.estado !== etapa) {
          setTransicionActiva(true);
          setTimeout(() => { setEtapa(data.estado); setTransicionActiva(false); }, 1100);
        }
        setTiempo(data.tiempoRestante);
        setCuotas(data.cuotas);
        setGanador(data.ganador);
        setVideoUrl(data.video ?? "");
        setCarreraNum(data.numeroCarrera ?? 1);
        setEstadisticas(data.estadisticas ?? []);
        setUltimosGanadores(data.ultimosGanadores ?? []);
        if (data.carreraId) setCarreraId(data.carreraId);
      }
    },
  });

  useEffect(() => {
    if (etapa !== "apuestas" || carreraId === 0) return;

    const fetchMisApuestas = async () => {
      try {
        const res = await fetch(`/api/apostarcarreravirtual/mis-apuestas?carreraId=${carreraId}`, { cache: "no-store" });
        const data = await res.json();
        if (data.apuestas) {
          setApuestasConfirmadas(data.apuestas);
          ultimaCarreraRestaurada.current = carreraId;
        }
      } catch {}
    };

    if (carreraId !== ultimaCarreraRestaurada.current) {
      setPremioCalculado(false);
      setGananciaTotal(0);
      setApuestas([0, 0, 0, 0, 0, 0]);
      setApuestasConfirmadas([0, 0, 0, 0, 0, 0]);
    }
    fetchMisApuestas();
  }, [etapa, carreraId]);

  useEffect(() => {
    if (etapa !== "resultado") return;
    if (ganador === null) return;
    if (!usuario) return;
    if (premioCalculado) return;

    const calcularPremio = async () => {
      setPremioCalculado(true);

      const totalApostado = apuestasConfirmadas.reduce((a, b) => a + b, 0);
      if (totalApostado === 0) return;

      try {
        const res = await fetch("/api/apostarcarreravirtual/premio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ carreraId, ganador }),
        });

        const data = await res.json();

        if (res.ok) {
          if (data.nuevoSaldo !== null) {
            setUsuario({ ...usuario, saldo: data.nuevoSaldo });
          }
          setGananciaTotal(data.premio);
        }
      } catch (e) {
        console.error("Error calculando premio:", e);
      }
    };

    calcularPremio();
  }, [etapa, ganador]);

  const handleConfirmar = async () => {
    if (!usuario) return;
    const totalApostado = apuestas.reduce((a, b) => a + b, 0);
    if (totalApostado === 0) return;

    try {
      const res = await fetch("/api/apostarcarreravirtual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apuestas, cuotas, carreraId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        return;
      }

      setUsuario({ ...usuario, saldo: data.nuevoSaldo });
      setApuestasConfirmadas((prev) => prev.map((monto, i) => monto + apuestas[i]));
      setApuestas([0, 0, 0, 0, 0, 0]);

    } catch (e) {
      console.error("Error confirmando apuesta:", e);
      alert("Error de conexiÃ³n, intenta de nuevo.");
    }
  };

  const manejarFinCarrera = async () => {
    try {
      await fetch("/api/carrera", { method: "POST" });
    } catch (e) {
      console.error("Error enviando fin de carrera:", e);
    }
  };

  if (!usuario) return (
    <main className="min-h-screen w-full flex items-center justify-center bg-black">
      <p className="text-cyan-300 text-xl animate-pulse">Cargando...</p>
    </main>
  );

  return (
    <main className="relative min-h-screen w-full overflow-hidden text-white">

      <div
        className={`
          pointer-events-none fixed inset-0 z-[999]
          bg-gradient-to-b from-[#001a33] via-[#003366] to-[#000814]
          backdrop-blur-[12px]
          bg-[url('/transicion.png')] bg-contain bg-no-repeat bg-center
          transition-transform duration-[1100ms] ease-out
          ${transicionActiva ? "translate-y-0" : "-translate-y-full"}
        `}
      />

      {etapa === "apuestas" && cuotas.length === 6 && (
        <ApuestasView
          usuario={usuario}
          cuotas={cuotas}
          apuestas={apuestas}
          apuestasConfirmadas={apuestasConfirmadas}
          tiempo={tiempo}
          carreraNum={carreraNum} // â­
          estadisticas={estadisticas}
          ultimosGanadores={ultimosGanadores}
          onChangeApuestas={setApuestas}
          onConfirmar={handleConfirmar}
        />
      )}

      {etapa === "carrera" && videoUrl && (
        <CarreraView
          url={videoUrl}
          onFinCarrera={manejarFinCarrera}
          apuestasConfirmadas={apuestasConfirmadas}
          cuotas={cuotas}
          carreraNum={carreraNum} // â­
        />
      )}

      {etapa === "resultado" && ganador !== null && (
        <ResultadoView
          usuario={usuario}
          cuotas={cuotas}
          apuestas={apuestasConfirmadas}
          ganador={ganador}
          gananciaTotal={gananciaTotal}
          carreraNum={carreraNum} // â­
        />
      )}

    </main>
  );
}