"use client";

type Usuario = {
  nombre: string;
  saldo: number;
};

type Props = {
  usuario: Usuario;
  cuotas: number[];
  apuestas: number[];
  ganador: number;
  gananciaTotal: number;
  carreraNum: number; // â­
};

export default function ResultadoView({
  usuario,
  cuotas,
  apuestas,
  ganador,
  gananciaTotal,
  carreraNum,
}: Props) {
  const caballoGanador = ganador + 1;
  const cuotaGanadora = cuotas[ganador];

  const totalApostado = apuestas.reduce((a, b) => a + b, 0);
  const aposto = totalApostado > 0;
  const esGanancia = gananciaTotal > 0;

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center text-white overflow-hidden">

      {/* FONDO */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[-1]" />

      {/* â­ ID CARRERA â€” esquina inferior izquierda */}
      <div className="absolute bottom-3 left-4">
        <p className="text-white/60 font-bold text-sm">
          Carrera #{String(carreraNum).padStart(4, "0")}
        </p>
      </div>

      {/* CONTENIDO */}
      <div className="relative text-center px-6">

        {/* â­ ID arriba del caballo ganador */}
        <p className="text-white/40 text-xs font-mono mb-6">
          Carrera #{String(carreraNum).padStart(4, "0")}
        </p>

        <h1 className="text-6xl font-extrabold mb-4 text-white/90">
          Caballo {caballoGanador}
        </h1>

        <p className="text-4xl font-bold mb-10 text-green-400">
          Cuota: {cuotaGanadora}
        </p>

        {aposto ? (
          <p className={`text-3xl font-extrabold mt-4 drop-shadow-[0_0_10px_rgba(0,0,0,0.7)] animate-bounceSoft ${esGanancia ? "text-green-400" : "text-red-400"}`}>
            {esGanancia
              ? `Ganancia: Bs. ${gananciaTotal.toFixed(2)}`
              : `Perdiste Bs. ${totalApostado.toFixed(2)}`}
          </p>
        ) : (
          <p className="text-2xl font-semibold mt-4 text-white/60 animate-bounceSoft">
            No participaste en esta carrera
          </p>
        )}

      </div>
    </div>
  );
}