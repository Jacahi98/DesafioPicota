"use client";

import { useRef, useState, useCallback } from "react";

// Rejilla 3x3 fija en coordenadas de viewBox (no en píxeles reales): el
// propio SVG escala al contenedor, así que el hit-test solo tiene que
// convertir la posición del puntero a este mismo sistema de coordenadas
// una vez (getBoundingClientRect + factor de escala), sin recalcular nada
// si cambia el tamaño en pantalla.
const VB = 300;
const CENTERS = [50, 150, 250];
const DOTS = CENTERS.flatMap((y) => CENTERS.map((x) => ({ x, y }))); // índices 0-8, fila a fila
const HIT_RADIUS = 40;
const DOT_RADIUS = 9;
const DOT_RADIUS_ACTIVE = 13;

type Status = "idle" | "error" | "success";

const STATUS_COLOR: Record<Status, string> = {
  idle: "var(--pine)",
  error: "var(--accent-rose)",
  success: "var(--pine)",
};

// El reseteo entre intentos (patrón incorrecto, o entre el primer y segundo
// dibujo al configurar uno nuevo) se hace remontando el componente con una
// `key` distinta desde el padre, no con un efecto interno — más simple y
// sin ventanas donde el estado quede a medio limpiar.
export function PatternLock({
  onComplete,
  minDots = 4,
  disabled = false,
  status = "idle",
}: {
  onComplete: (sequence: number[]) => void;
  minDots?: number;
  disabled?: boolean;
  status?: Status;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [path, setPath] = useState<number[]>([]);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const toViewBox = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VB,
      y: ((clientY - rect.top) / rect.height) * VB,
    };
  }, []);

  const nearestDot = useCallback((x: number, y: number) => {
    let best = -1;
    let bestDist = HIT_RADIUS;
    DOTS.forEach((d, i) => {
      const dist = Math.hypot(d.x - x, d.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  }, []);

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled) return;
    const p = toViewBox(e.clientX, e.clientY);
    if (!p) return;
    const dot = nearestDot(p.x, p.y);
    if (dot === -1) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPath([dot]);
    setCursor(p);
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging || disabled) return;
    const p = toViewBox(e.clientX, e.clientY);
    if (!p) return;
    setCursor(p);
    const dot = nearestDot(p.x, p.y);
    if (dot !== -1) {
      setPath((prev) => (prev.includes(dot) ? prev : [...prev, dot]));
    }
  }

  function finish() {
    if (!dragging) return;
    setDragging(false);
    setCursor(null);
    if (path.length >= minDots) {
      onComplete(path);
    } else {
      setPath([]);
    }
  }

  const color = STATUS_COLOR[status];
  const lastDot = path.length > 0 ? DOTS[path[path.length - 1]] : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB} ${VB}`}
      className="w-full max-w-[280px] touch-none select-none"
      style={{ opacity: disabled ? 0.6 : 1 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
      onPointerLeave={(e) => {
        if (dragging) handlePointerMove(e);
      }}
    >
      {path.length > 1 &&
        path.slice(1).map((dotIndex, i) => {
          const from = DOTS[path[i]];
          const to = DOTS[dotIndex];
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.85}
            />
          );
        })}
      {dragging && lastDot && cursor && (
        <line
          x1={lastDot.x}
          y1={lastDot.y}
          x2={cursor.x}
          y2={cursor.y}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.5}
        />
      )}
      {DOTS.map((d, i) => {
        const active = path.includes(i);
        return (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={active ? DOT_RADIUS_ACTIVE : DOT_RADIUS}
            fill={active ? color : "var(--paper-raised)"}
            stroke={active ? color : "var(--border)"}
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
}
