"use client";

import { useEffect, useRef } from "react";

// Caracteres katakana + dígitos, como el efecto original — no aleatorio
// puro por frame: cada columna es una cadena independiente que cae a su
// propio ritmo (setInterval propio), así las columnas se desincronizan
// solas en vez de caer todas a la vez, que es lo que las hace parecer
// "lluvia" y no una cortina uniforme.
const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789";

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const FONT_SIZE = 16;
    let columns = 0;
    let drops: number[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.ceil(canvas.width / FONT_SIZE);
      drops = Array.from({ length: columns }, () => Math.random() * -50);
    }
    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      // Un fotograma quieto en vez de animación continua: sigue leyéndose
      // como "esto es una terminal", sin movimiento para quien lo pidió.
      ctx!.fillStyle = "#030a04";
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.font = `${FONT_SIZE}px monospace`;
      for (let i = 0; i < columns; i++) {
        ctx!.fillStyle = "rgba(0, 255, 102, 0.25)";
        const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx!.fillText(ch, i * FONT_SIZE, Math.random() * canvas.height);
      }
      return () => window.removeEventListener("resize", resize);
    }

    let raf = 0;
    let lastTime = 0;
    function draw(time: number) {
      raf = requestAnimationFrame(draw);
      if (time - lastTime < 55) return; // ritmo de caída, no el de fps
      lastTime = time;
      if (!canvas || !ctx) return;

      ctx.fillStyle = "rgba(3, 10, 4, 0.15)"; // estela: no se limpia del todo cada frame
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FONT_SIZE}px monospace`;

      for (let i = 0; i < columns; i++) {
        const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
        const y = drops[i] * FONT_SIZE;
        // La cabeza de cada columna sale más brillante que la cola —
        // degradado en dos capas en vez de una sola, no una por carácter.
        ctx.fillStyle = "#c8ffd8";
        ctx.fillText(ch, i * FONT_SIZE, y);
        ctx.fillStyle = "rgba(0, 255, 102, 0.55)";
        ctx.fillText(ch, i * FONT_SIZE, y - FONT_SIZE);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        } else {
          drops[i] += 1;
        }
      }
    }
    raf = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 opacity-70"
    />
  );
}
