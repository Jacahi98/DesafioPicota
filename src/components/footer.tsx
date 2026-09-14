import { APP_VERSION } from "@/lib/version";
import { InfiniteSlider } from "@/components/core/infinite-slider";
import { ProgressiveBlur } from "@/components/core/progressive-blur";
import { Logo } from "@/components/core/logo";

// Logos cedidos por los colaboradores, recortados y pasados a WebP con
// transparencia: el turquesa de Piélagos se lee igual sobre el tema claro y
// sobre el oscuro, así que no hace falta una variante por tema.
const collaborators = [
  {
    name: "Ayuntamiento de Piélagos",
    src: "/logo-ayto-pielagos.webp",
    width: 315,
    height: 160,
  },
  {
    name: "Pasa x Piélagos",
    src: "/logo-pasa-x-pielagos.webp",
    width: 251,
    height: 160,
  },
];

// InfiniteSlider pinta {children}{children} y desplaza media tira, asi que
// UNA copia tiene que ser ya mas ancha que la pantalla o aparece un hueco
// vacio (es lo que pasaba con solo dos logos: antes habia seis etiquetas de
// texto y llegaban de sobra). Se repite la pareja hasta cubrir un monitor
// ancho; los ficheros son los mismos, o sea que el navegador los cachea y no
// hay descargas de mas.
const REPETITIONS = 10;

const collaboratorStrip = Array.from({ length: REPETITIONS }, () => collaborators).flat();

type Collaborator = (typeof collaborators)[number];

function CollaboratorBadge({ logo }: { logo: Collaborator }) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-center rounded-sm border border-[var(--border)] bg-[var(--paper)] px-8 transition-colors hover:border-[var(--sea)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo.src}
        alt={logo.name}
        width={logo.width}
        height={logo.height}
        loading="lazy"
        decoding="async"
        className="h-9 w-auto"
      />
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
          {collaboratorStrip.map((logo, i) => (
            <CollaboratorBadge key={`${logo.src}-${i}`} logo={logo} />
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
          <Logo className="h-8" />
          <div className="flex items-center gap-5">
            <a
              href="/privacidad"
              className="text-sm text-[var(--text-faint)] underline-offset-2 hover:text-[var(--text-dim)] hover:underline"
            >
              Privacidad
            </a>
            <p className="text-sm text-[var(--text-faint)]">Liencres, Cantabria</p>
          </div>
        </div>
        <p className="mt-6 font-mono text-[10px] text-[var(--text-faint)] opacity-60">v{APP_VERSION}</p>
      </div>
    </footer>
  );
}
