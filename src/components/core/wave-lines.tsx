"use client";

// Líneas de nivel que sugieren las dunas de Liencres vistas desde arriba —
// no es decoración genérica, es el propio terreno de la carrera. Fondo fijo
// de TODA la web (no solo del hero), en desplazamiento continuo tipo ola y
// no en vaivén: cada línea se dibuja dos veces, una a continuación de la
// otra, y el par entero se desliza exactamente un ancho de tesela en bucle
// infinito, así el salto del final al principio cae en un punto idéntico y
// no se nota.
import { motion } from "framer-motion";

const LINES = [
  "M-40,120 C120,60 260,180 440,90 C580,20 720,140 880,70",
  "M-40,200 C100,150 260,260 440,180 C600,110 740,220 880,160",
  "M-40,280 C90,240 250,330 440,270 C610,210 750,300 880,250",
  "M-40,360 C110,330 260,400 440,350 C600,300 760,380 880,340",
];
const TILE_W = 880;

export function WaveLines() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <svg viewBox="0 0 880 420" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        {LINES.map((d, i) => (
          <motion.g
            key={i}
            animate={{ x: [0, -TILE_W] }}
            transition={{ duration: 24 + i * 5, repeat: Infinity, ease: "linear" }}
          >
            <path d={d} fill="none" stroke="var(--accent-rose)" strokeWidth="1" opacity={0.16 + i * 0.03} />
            <path
              d={d}
              fill="none"
              stroke="var(--accent-rose)"
              strokeWidth="1"
              opacity={0.16 + i * 0.03}
              transform={`translate(${TILE_W}, 0)`}
            />
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
