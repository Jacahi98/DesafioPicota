"use client";

import { useEffect, useRef, useState } from "react";
import { motion, type Transition } from "framer-motion";
import { ArrowLeft, Home, Route, UserPlus } from "lucide-react";
import { BorderTrail } from "@/components/core/border-trail";

// Mismo timing que el split button original (spring bounce 0.55, 1s): el
// botón "Secciones" no abre un desplegable debajo, se transforma él mismo
// en la fila de secciones en el mismo sitio — por eso ambos estados viven
// superpuestos (absolute), anclados al borde derecho, y la fila siempre se
// despliega en horizontal (nunca en columna, aunque no quepa del todo).
const SPRING: Transition = { type: "spring", bounce: 0.55, duration: 1 };

const SECTIONS = [
  { href: "#top", label: "Inicio", icon: Home },
  { href: "#recorrido", label: "Recorrido", icon: Route },
  { href: "#inscripcion", label: "Inscripción", icon: UserPlus },
];

export function SectionsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center">
      {/* Botón cerrado: en flujo normal, es quien reserva el hueco real en
          la cabecera — la fila abierta es absolute y se apoya en su borde
          derecho, así que puede crecer hacia la izquierda sin desplazar el
          logo ni el ThemeToggle. */}
      <motion.button
        layout
        transition={SPRING}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="true"
        initial={false}
        animate={{
          scaleX: open ? 1.4 : 1,
          scaleY: open ? 0.85 : 1,
          opacity: open ? 0 : 1,
          filter: open ? "blur(8px)" : "blur(0px)",
          pointerEvents: open ? "none" : "auto",
        }}
        whileTap={{ scale: 0.95 }}
        className="relative whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--paper-raised)] px-4 py-2 text-sm font-semibold text-[var(--pine)] sm:py-2.5"
      >
        <BorderTrail size={18} style={{ backgroundColor: "var(--sand-gold)", opacity: 0.85 }} />
        Secciones
      </motion.button>

      <motion.div
        layout
        transition={SPRING}
        role="menu"
        initial={false}
        animate={{
          scaleX: open ? 1 : 0.3,
          scaleY: open ? 1 : 0.85,
          opacity: open ? 1 : 0,
          filter: open ? "blur(0px)" : "blur(8px)",
          pointerEvents: open ? "auto" : "none",
        }}
        className="absolute right-0 top-1/2 z-50 flex -translate-y-1/2 items-center gap-1.5 sm:gap-2"
      >
        <motion.button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú de secciones"
          whileTap={{ scale: 0.9 }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--paper-raised)] text-[var(--pine)] sm:h-10 sm:w-10"
        >
          <ArrowLeft size={16} />
        </motion.button>

        {SECTIONS.map((s) => (
          <motion.a
            key={s.href}
            href={s.href}
            role="menuitem"
            aria-label={s.label}
            onClick={() => setOpen(false)}
            whileTap={{ scale: 0.95 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--paper-raised)] text-sm font-medium text-[var(--text-dim)] transition-colors hover:border-[var(--pine)] hover:text-[var(--pine)] sm:h-10 sm:w-auto sm:px-4"
          >
            <s.icon size={16} className="shrink-0" />
            <span className="hidden sm:inline">{s.label}</span>
          </motion.a>
        ))}
      </motion.div>
    </div>
  );
}
