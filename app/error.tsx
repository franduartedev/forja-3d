"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep production diagnostics private while preserving a useful local trace.
    console.error("FORJA recovered from an application error", error);
  }, [error]);

  return (
    <main className="app-error" aria-labelledby="app-error-title">
      <div>
        <span aria-hidden="true">!</span>
        <p>RECUPERACIÓN SEGURA</p>
        <h1 id="app-error-title">FORJA encontró un problema inesperado.</h1>
        <p>
          Tu proyecto guardado permanece en este dispositivo. Podés intentar
          recuperar la interfaz o volver al inicio.
        </p>
        <div>
          <button onClick={reset}>Intentar nuevamente</button>
          <Link href="/">Volver al inicio</Link>
        </div>
      </div>
    </main>
  );
}
