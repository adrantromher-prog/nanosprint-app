import { useEffect, useState } from "react";

export function useUsuario() {
  const [usuario, setUsuario] = useState<{ nombre: string; saldo: number } | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.nombre) setUsuario({ nombre: data.nombre, saldo: Number(data.saldo) });
      });
  }, []);

  return { usuario, setUsuario };
}