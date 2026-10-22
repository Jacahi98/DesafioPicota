"use client";

import { useEffect, useState } from "react";
import { REGISTRATION_DEADLINE, REGISTRATION_OPENS_AT, REGISTRATION_RING_MS } from "@/lib/registration-window";

const SIZE = 20;
const STROKE = 3.5;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function humanize(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  if (d >= 1) return `${d} ${d === 1 ? "día" : "días"}${h ? ` y ${h} h` : ""}`;
  if (h >= 1) return `${h} h y ${min % 60} min`;
  return `${min} min`;
}

// Círculo junto a "Preinscripción" en el menú. Antes de la apertura se va
// llenando con el tiempo que pasa hasta que abre; con la preinscripción abierta
// se vacía con el tiempo que queda hasta el cierre. Se calcula solo en el
// cliente (el HTML del servidor lo deja fuera) porque cambia con la hora.
export function RegistrationRing() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;
  const opens = REGISTRATION_OPENS_AT.getTime();
  const closes = REGISTRATION_DEADLINE.getTime();
  if (now >= closes) return null;

  const before = now < opens;
  const progress = before
    ? Math.min(1, Math.max(0, 1 - (opens - now) / REGISTRATION_RING_MS))
    : Math.min(1, Math.max(0, (closes - now) / (closes - opens)));
  const color = before ? "var(--accent-rose)" : "var(--pine)";
  const label = before
    ? `La preinscripción abre en ${humanize(opens - now)}`
    : `Preinscripción abierta: cierra en ${humanize(closes - now)}`;

  return (
    <span
      title={label}
      role="img"
      aria-label={label}
      className="pointer-events-none absolute -right-1.5 -top-1.5 grid place-items-center rounded-full bg-[var(--paper-raised)] shadow-[0_0_0_1px_var(--border)]"
      style={{ width: SIZE + 2, height: SIZE + 2 }}
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${progress * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
    </span>
  );
}
