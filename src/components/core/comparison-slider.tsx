"use client";

// Adaptado del ImageComparison de motion-primitives, pero generalizado: los
// paneles aceptan CUALQUIER contenido (un <RouteMap>/<ElevationProfile>
// completos, no solo una <img>), y el arrastre solo empieza desde el
// tirador (ComparisonHandle) — no en cualquier punto del contenedor, a
// diferencia del original. Con mapas/perfiles interactivos dentro (hover
// para ver un punto, tarjeta de parada con su propio click), "cualquier
// movimiento del ratón sobre el contenedor mueve el slider" habría roto
// esas interacciones; con el arrastre atado al tirador, el resto del panel
// se comporta con normalidad y el slider es una interacción aparte.

import { cn } from "@/lib/utils";
import { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useRef } from "react";
import { animate, motion, type MotionValue, useMotionValue, useTransform } from "framer-motion";

const ComparisonSliderContext = createContext<
  | {
      position: MotionValue<number>;
      startDrag: () => void;
    }
  | undefined
>(undefined);

function useComparisonSlider() {
  const ctx = useContext(ComparisonSliderContext);
  if (!ctx) throw new Error("Comparison* components must be used within a ComparisonSlider");
  return ctx;
}

export type ComparisonSliderProps = {
  children: React.ReactNode;
  className?: string;
  defaultPosition?: number;
  // Porcentaje (0–100) en cada cambio — quien use el slider decide qué
  // hacer con él (p.ej. cambiar qué stats mostrar a partir del 50%).
  onPositionChange?: (percentage: number) => void;
  // Se dispara UNA vez por gesto/acción "confirmada": al soltar el arrastre
  // (ya con el imán aplicado, siempre 0 o 100) o al llamar a goTo() desde
  // fuera. A diferencia de onPositionChange (continuo, útil para una
  // vista previa en vivo), este es el punto para efectos que no deben
  // repetirse mientras el usuario todavía está arrastrando (p.ej. resetear
  // el scroll de la página).
  onCommit?: (side: 0 | 100) => void;
};

export type ComparisonSliderHandle = {
  // Desliza el slider al extremo indicado (uso: botones externos de
  // selección de modalidad). Dispara onCommit igual que soltar un arrastre.
  goTo: (side: 0 | 100) => void;
};

// Transición explícita (no un spring) para el "caer al lado" — tanto al
// soltar el arrastre (imán) como al pulsar un botón de modalidad. Un
// spring atado al mismo valor que sigue al cursor en vivo durante el
// arrastre podía leerse como un salto instantáneo (poco recorrido = casi
// sin tiempo de asentamiento); una duración fija con easing garantiza que
// el movimiento sea SIEMPRE visible y progresivo, sea cual sea la
// distancia a recorrer.
const SETTLE_TRANSITION = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

export const ComparisonSlider = forwardRef<ComparisonSliderHandle, ComparisonSliderProps>(
  function ComparisonSlider({ children, className, defaultPosition = 50, onPositionChange, onCommit }, ref) {
    const position = useMotionValue(defaultPosition);
    const containerRef = useRef<HTMLDivElement>(null);
    const draggingRef = useRef(false);
    const onCommitRef = useRef(onCommit);

    useEffect(() => {
      onCommitRef.current = onCommit;
    }, [onCommit]);

    useEffect(() => {
      if (!onPositionChange) return;
      return position.on("change", onPositionChange);
    }, [position, onPositionChange]);

    useImperativeHandle(
      ref,
      () => ({
        goTo: (side) => {
          animate(position, side, SETTLE_TRANSITION);
          onCommitRef.current?.(side);
        },
      }),
      [position],
    );

    useEffect(() => {
      const updateFromClientX = (clientX: number) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const pct = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100);
        // Durante el arrastre, la posición sigue al cursor 1:1 (sin
        // animación) — solo el ASENTAMIENTO al soltar (más abajo) usa una
        // transición.
        position.set(pct);
      };

      const onMouseMove = (e: MouseEvent) => {
        if (draggingRef.current) updateFromClientX(e.clientX);
      };
      const onTouchMove = (e: TouchEvent) => {
        if (draggingRef.current && e.touches[0]) {
          updateFromClientX(e.touches[0].clientX);
          e.preventDefault();
        }
      };
      // Imán: al soltar, el slider nunca se queda a medias — cae siempre al
      // extremo (0 o 100) más cercano a donde se soltó, así que cada
      // arrastre termina mostrando SIEMPRE una modalidad completa, nunca
      // una mezcla de las dos. La caída se anima (SETTLE_TRANSITION), no
      // se teletransporta.
      const stop = () => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        const side: 0 | 100 = position.get() >= 50 ? 100 : 0;
        animate(position, side, SETTLE_TRANSITION);
        onCommitRef.current?.(side);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("mouseup", stop);
      window.addEventListener("touchend", stop);
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("mouseup", stop);
        window.removeEventListener("touchend", stop);
      };
    }, [position]);

    const startDrag = () => {
      draggingRef.current = true;
    };

    return (
      <ComparisonSliderContext.Provider value={{ position, startDrag }}>
        <div ref={containerRef} className={cn("relative select-none", className)}>
          {children}
        </div>
      </ComparisonSliderContext.Provider>
    );
  },
);

export function ComparisonPanel({
  children,
  position: side,
  className,
}: {
  children: React.ReactNode;
  position: "left" | "right";
  className?: string;
}) {
  const { position } = useComparisonSlider();
  const leftClipPath = useTransform(position, (value) => `inset(0 0 0 ${value}%)`);
  const rightClipPath = useTransform(position, (value) => `inset(0 ${100 - value}% 0 0)`);

  return (
    <motion.div
      className={cn("absolute inset-0", className)}
      style={{ clipPath: side === "left" ? leftClipPath : rightClipPath }}
    >
      {children}
    </motion.div>
  );
}

export function ComparisonHandle({ className, children }: { className?: string; children?: React.ReactNode }) {
  const { position, startDrag } = useComparisonSlider();
  const left = useTransform(position, (value) => `${value}%`);

  return (
    <motion.div
      className={cn("absolute bottom-0 top-0 z-20 cursor-ew-resize touch-none", className)}
      style={{ left }}
      onMouseDown={(e) => {
        e.preventDefault();
        startDrag();
      }}
      onTouchStart={startDrag}
    >
      {children}
    </motion.div>
  );
}
