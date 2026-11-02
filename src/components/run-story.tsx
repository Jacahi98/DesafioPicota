"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";

// Fotos de gente corriendo en distintos puntos, a pantalla completa. Al hacer scroll la escena se queda fija y las fotos
// se funden una en otra, con texto enorme: Desafío Picota, Speed Trail, 2027 y, en la última, todo junto con el botón.
const SLIDES = [
  { id: "pinar", word: "Desafío\nPicota", alt: "Tres corredores entre los pinos", pos: "50% 45%" },
  { id: "ritmo", word: "Speed\nTrail", alt: "Corredor en movimiento con el pinar desenfocado detrás", pos: "50% 38%" },
  { id: "subida", word: "2027", alt: "Corredor subiendo por un sendero con el sol de frente", pos: "50% 62%" },
  { id: "cresta", word: "Desafío Picota\nSpeed Trail\n2027", alt: "Corredora de amarillo en la cresta con la ría detrás", pos: "50% 55%" },
] as const;
const N = SLIDES.length;

// Tamaño del texto: se ajusta a la línea más larga para que quepa siempre en el ancho de la pantalla.
const wordSize = (w: string) => `clamp(28px, ${Math.min(22, 140 / Math.max(...w.split("\n").map((l) => l.length)))}vw, 300px)`;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function Photo({ slide, index, p }: { slide: (typeof SLIDES)[number]; index: number; p: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => clamp((0.75 - Math.abs(v * N - (index + 0.5))) / 0.25));
  const scale = useTransform(p, (v) => 1.12 - 0.1 * clamp((v * N - (index - 0.25)) / 1.5));
  return (
    <motion.div style={{ opacity }} className="absolute inset-0">
      <motion.div style={{ scale }} className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/fotos/${slide.id}-720.webp`}
          srcSet={`/fotos/${slide.id}-720.webp 720w, /fotos/${slide.id}-1600.webp 1600w`}
          sizes="100vw"
          alt={slide.alt}
          width={1600}
          height={2400}
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          style={{ objectPosition: slide.pos }}
          className="h-full w-full object-cover"
        />
      </motion.div>
    </motion.div>
  );
}

function Word({ slide, index, p }: { slide: (typeof SLIDES)[number]; index: number; p: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => clamp((0.62 - Math.abs(v * N - (index + 0.5))) / 0.2));
  const y = useTransform(p, (v) => (v * N - (index + 0.5)) * -90);
  const last = index === N - 1;
  const pointerEvents = useTransform(p, (v) => (last && v * N > index + 0.2 ? "auto" : "none"));
  return (
    <motion.div style={{ opacity, y }} className="absolute inset-x-0 bottom-0 px-6 pb-16 sm:px-10 sm:pb-20">
      <p
        aria-hidden="true"
        style={{ fontSize: wordSize(slide.word) }}
        className="whitespace-pre-line font-black uppercase leading-[0.82] tracking-[-0.05em] text-[#f4ddb8]"
      >
        {slide.word}
      </p>
      {last && (
        <motion.div style={{ pointerEvents }} className="mt-8">
          <Link
            href="/preinscripcion"
            className="inline-flex items-center gap-2 rounded-sm bg-[#f4ddb8] px-8 py-3.5 text-base font-semibold uppercase tracking-wider text-[#2b0a0a] transition-opacity hover:opacity-90"
          >
            Inscríbete
          </Link>
        </motion.div>
      )}
    </motion.div>
  );
}

export function RunStory() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const counter = useTransform(p, (v) => String(Math.min(N, Math.floor(v * N) + 1)).padStart(2, "0"));
  const bar = useTransform(p, [0, 1], [0, 1]);

  // Con "reducir movimiento" no hay escena fija: cada foto va una debajo de otra, con su palabra.
  if (reduce) {
    return (
      <section aria-labelledby="corre-titulo" className="bg-[#2b0a0a]">
        <h2 id="corre-titulo" className="sr-only">
          Así se corre la Picota
        </h2>
        {SLIDES.map((s) => (
          <div key={s.id} className="relative h-[70svh] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/fotos/${s.id}-720.webp`}
              srcSet={`/fotos/${s.id}-720.webp 720w, /fotos/${s.id}-1600.webp 1600w`}
              sizes="100vw"
              alt={s.alt}
              width={1600}
              height={2400}
              loading="lazy"
              style={{ objectPosition: s.pos }}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
            <p
              aria-hidden="true"
              style={{ fontSize: wordSize(s.word) }}
              className="absolute bottom-8 left-6 whitespace-pre-line font-black uppercase leading-[0.82] tracking-[-0.05em] text-[#f4ddb8] sm:left-10"
            >
              {s.word}
            </p>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section
      ref={ref}
      aria-labelledby="corre-titulo"
      style={{ height: `${N * 75 + 25}svh` }}
      className="relative border-b border-[var(--border)] bg-[#2b0a0a]"
    >
      <h2 id="corre-titulo" className="sr-only">
        Así se corre la Picota
      </h2>
      <div className="sticky top-0 h-svh overflow-hidden">
        {SLIDES.map((s, i) => (
          <Photo key={s.id} slide={s} index={i} p={p} />
        ))}
        {/* Degradado para que la palabra se lea sobre cualquier foto, y una sombra arriba para los rótulos. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/40" />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-6 pt-24 font-mono text-[11px] uppercase tracking-[0.18em] text-[#f4ddb8] [text-shadow:0_1px_8px_rgba(0,0,0,.55)] sm:px-10 sm:pt-28">
          <span>Liencres · 24.04.2027</span>
          <span>
            <motion.span>{counter}</motion.span> / {String(N).padStart(2, "0")}
          </span>
        </div>

        {SLIDES.map((s, i) => (
          <Word key={s.id} slide={s} index={i} p={p} />
        ))}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-[#f4ddb8]/20">
          <motion.div style={{ scaleX: bar }} className="h-full origin-left bg-[#f4ddb8]" />
        </div>
      </div>
    </section>
  );
}
