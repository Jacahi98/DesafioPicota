"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// Momento exacto de la salida: 24 abril 2027 a las 10:00, hora de España
// (horario de verano, +02:00). Si la hora cambia, se cambia solo aquí.
const RACE_START = Date.parse("2027-04-24T10:00:00+02:00");

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function partsLeft(now: number): Parts | null {
  const diff = Math.floor((RACE_START - now) / 1000);
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400),
    hours: Math.floor((diff % 86400) / 3600),
    minutes: Math.floor((diff % 3600) / 60),
    seconds: diff % 60,
  };
}

// Un dígito que "rueda": el viejo sale hacia arriba y el nuevo entra desde
// abajo. Se muestra siempre, también el cero de la izquierda (05, 07...).
function RollDigit({ char }: { char: string }) {
  return (
    <span className="relative inline-block h-[1.1em] w-[0.62em] overflow-hidden text-center leading-[1.1em] tabular-nums">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={char}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="inline-block"
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Tile({ value, label, digits, live }: { value: number; label: string; digits: number; live?: boolean }) {
  return (
    <div className="relative flex min-w-[64px] flex-col items-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--paper-raised)] px-3 pb-2.5 pt-3 shadow-[0_0_24px_-12px_var(--accent-rose)] sm:min-w-[84px] sm:px-4 sm:pb-3 sm:pt-4">
      {/* Brillo superior suave: da volumen sin pintar un degradado entero. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-rose)] to-transparent opacity-70" />
      <div className="flex text-3xl font-semibold text-[var(--ink)] sm:text-5xl">
        {String(value)
          .padStart(digits, "0")
          .split("")
          .map((c, i, all) => (
            <RollDigit key={all.length - i} char={c} />
          ))}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[var(--sea)] sm:text-[11px]">
        {live && (
          <motion.span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent-rose)]"
            animate={{ opacity: [1, 0.25, 1], scale: [1, 0.7, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {label}
      </p>
    </div>
  );
}

export function Countdown() {
  // Se calcula tras montar y no en el render del servidor: el HTML
  // prerenderizado y el del navegador no coincidirían (cambia cada segundo).
  const [parts, setParts] = useState<Parts | null | undefined>(undefined);

  useEffect(() => {
    const tick = () => setParts(partsLeft(Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (parts === undefined) return <div className="h-[92px] sm:h-[124px]" aria-hidden />;
  if (parts === null) {
    return <p className="font-mono text-2xl text-[var(--accent-rose)]">¡Hoy es el Desafío Picota!</p>;
  }

  const label = `Faltan ${parts.days} días, ${parts.hours} horas, ${parts.minutes} minutos y ${parts.seconds} segundos`;
  return (
    <div className="font-mono" role="timer" aria-label={label}>
      <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-[var(--sea)] lg:text-left">
        Cuenta atrás
      </p>
      <div className="flex items-start justify-center gap-2 sm:gap-3 lg:justify-start" aria-hidden>
        <Tile value={parts.days} label="días" digits={2} />
        <Tile value={parts.hours} label="horas" digits={2} />
        <Tile value={parts.minutes} label="min" digits={2} />
        <Tile value={parts.seconds} label="seg" digits={2} live />
      </div>
    </div>
  );
}
