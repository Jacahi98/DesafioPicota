"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Panel "en vivo": vuelve a pedir la página al servidor cada pocos segundos
// mientras la pestaña está a la vista (no gasta nada con la pestaña oculta) y
// al volver a ella se actualiza al instante. Se puede pausar.
export function AutoRefresh({ everyMs = 15000 }: { everyMs?: number }) {
  const router = useRouter();
  const [live, setLive] = useState(true);
  const [now, setNow] = useState<number | null>(null);
  const [lastAt, setLastAt] = useState<number | null>(null);

  const refresh = () => {
    router.refresh();
    setLastAt(Date.now());
    setNow(Date.now());
  };

  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setLastAt((prev) => prev ?? t);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!live) return;
    const tick = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setLastAt(Date.now());
      }
    };
    const id = setInterval(tick, everyMs);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [live, everyMs, router]);

  const secs = now !== null && lastAt !== null ? Math.max(0, Math.round((now - lastAt) / 1000)) : null;

  return (
    <div className="flex items-center gap-3 font-mono text-xs text-[var(--text-dim)]">
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`inline-block h-2 w-2 rounded-full ${live ? "bg-[var(--pine)]" : "bg-[var(--text-faint)]"}`}
        />
        {live ? "en vivo" : "pausado"}
        {secs !== null && <span className="text-[var(--text-faint)]">· actualizado hace {secs} s</span>}
      </span>
      <button
        type="button"
        onClick={() => setLive((v) => !v)}
        className="underline underline-offset-2 hover:text-[var(--ink)]"
      >
        [ {live ? "pausar" : "reanudar"} ]
      </button>
      <button type="button" onClick={refresh} className="underline underline-offset-2 hover:text-[var(--ink)]">
        [ actualizar ya ]
      </button>
    </div>
  );
}
