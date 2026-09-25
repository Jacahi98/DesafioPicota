import { cn } from "@/lib/utils";

// El wordmark claro/oscuro como fondo CSS en vez de <img> — ver el porqué en
// el comentario junto a .logo-mark-sm/.logo-mark-lg en globals.css: con
// <img> + display:none se descargaban las dos variantes siempre, aquí solo
// se pide a la red la que realmente aplica. Sin <img>, la accesibilidad va
// por role="img" + aria-label en vez de alt.
export function Logo({
  size = "sm",
  label = "Desafío Picota · Speed Trail",
  className,
}: {
  size?: "sm" | "lg";
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(size === "sm" ? "logo-mark-sm" : "logo-mark-lg", "inline-block aspect-[790/525]", className)}
    />
  );
}
