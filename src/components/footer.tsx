import Image from "next/image";
import { APP_VERSION } from "@/lib/version";
import { InfiniteSlider } from "@/components/core/infinite-slider";
import { ProgressiveBlur } from "@/components/core/progressive-blur";

// Placeholders — sustituir por los logos reales de los colaboradores
// cuando se confirmen.
const collaborators = [
  "Colaborador 01",
  "Colaborador 02",
  "Colaborador 03",
  "Colaborador 04",
  "Colaborador 05",
  "Colaborador 06",
];

function CollaboratorBadge({ label }: { label: string }) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-center rounded-sm border border-[var(--border)] px-6 font-mono text-[11px] uppercase tracking-wider text-[var(--text-faint)] opacity-70 grayscale transition-opacity hover:opacity-100 hover:grayscale-0">
      {label}
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--paper-sunken)] py-10">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--sea)]">
          Colaboradores
        </p>
      </div>

      {/* Los bordes de la tira se difuminan en vez de cortar en seco — dos
          capas de ProgressiveBlur (izquierda/derecha) sobre el mismo
          slider, cada una un degradado de varias capas de backdrop-blur
          creciente, no un simple fade de opacidad. */}
      <div className="relative mb-10">
        <InfiniteSlider gap={16} speed={28} speedOnHover={8}>
          {collaborators.map((label) => (
            <CollaboratorBadge key={label} label={label} />
          ))}
        </InfiniteSlider>
        {/* La posición (absolute inset-y-0 ...) va en un envoltorio aparte:
            ProgressiveBlur ya se marca "relative" a sí mismo por dentro, y
            pasarle "absolute" en el mismo className choca con eso (misma
            propiedad CSS, position, dos clases compitiendo) — el resultado
            era un elemento de alto 0 e invisible. Aquí solo se le pasa
            tamaño (h-full w-full), la posición la pone el div de fuera. */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28">
          <ProgressiveBlur direction="left" blurIntensity={1} className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28">
          <ProgressiveBlur direction="right" blurIntensity={1} className="h-full w-full" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        {/* items-start es imprescindible en el layout de móvil (flex-col): sin
            él, align-items vale "stretch" y los logos se estiran a todo el
            ancho del contenedor manteniendo h-8 de alto, o sea deformados a
            lo ancho. w-auto no lo impide — el estirado del flex manda sobre
            el ancho automático. En sm: el flex pasa a fila y ahí el eje
            transversal ya es la altura, así que items-center es correcto. */}
        <div className="flex flex-col items-start gap-4 border-t border-[var(--border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Image
            src="/logo-wordmark-light.png"
            alt="Desafío Picota Trail Run"
            width={790}
            height={525}
            className="icon-light h-8 w-auto"
          />
          <Image
            src="/logo-wordmark-dark.png"
            alt="Desafío Picota Trail Run"
            width={790}
            height={525}
            className="icon-dark h-8 w-auto"
          />
          <p className="text-sm text-[var(--text-faint)]">Liencres, Cantabria</p>
        </div>
        <p className="mt-6 font-mono text-[10px] text-[var(--text-faint)] opacity-60">v{APP_VERSION}</p>
      </div>
    </footer>
  );
}
