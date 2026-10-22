"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Route, UserPlus } from "lucide-react";
import { BorderTrail } from "@/components/core/border-trail";
import { RegistrationRing } from "@/components/registration-ring";

// Antes esto era un único botón "Secciones" que se desplegaba en esta misma
// fila; ahora las tres secciones están siempre a la vista y la actual lleva
// el mismo borde animado (BorderTrail) que tenía aquel botón.
const SECTIONS = [
  { id: "top", href: "/#top", label: "Inicio", icon: Home },
  { id: "recorrido", href: "/#recorrido", label: "Recorrido", icon: Route },
  { id: "preinscripcion", href: "/preinscripcion", label: "Preinscripción", icon: UserPlus },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export function SectionNav() {
  const pathname = usePathname();
  const [homeSection, setHomeSection] = useState<"top" | "recorrido">("top");

  // En la portada, qué sección ocupa el centro de la pantalla. La franja de
  // observación es una línea fina a media altura: la sección que la cruza es
  // la "actual", sin parpadeos cuando dos se ven a la vez.
  useEffect(() => {
    if (pathname !== "/") return;
    const targets = (["top", "recorrido"] as const)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setHomeSection(entry.target.id as "top" | "recorrido");
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  const current: SectionId | null =
    pathname === "/" ? homeSection : pathname.startsWith("/preinscripcion") ? "preinscripcion" : null;

  return (
    <nav aria-label="Secciones" className="flex items-center gap-1.5 sm:gap-2">
      {SECTIONS.map((s) => {
        const active = s.id === current;
        const disabled = "disabled" in s && s.disabled;
        return (
          <Link
            key={s.id}
            href={s.href}
            aria-label={disabled ? `${s.label} (próximamente)` : s.label}
            title={disabled ? "Próximamente" : undefined}
            aria-current={active ? "page" : undefined}
            className={`${disabled ? "opacity-45 " : ""}relative flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border bg-[var(--paper-raised)] text-sm transition-colors sm:h-10 sm:w-auto sm:px-4 ${
              active
                ? "border-[var(--border)] font-semibold text-[var(--pine)]"
                : disabled
                  ? "border-dashed border-[var(--border)] font-medium text-[var(--text-faint)]"
                  : "border-[var(--border)] font-medium text-[var(--text-dim)] hover:border-[var(--pine)] hover:text-[var(--pine)]"
            }`}
          >
            {active && <BorderTrail size={18} style={{ backgroundColor: "var(--accent-rose)", opacity: 0.85 }} />}
            <s.icon size={16} className="shrink-0" />
            <span className="hidden sm:inline">{s.label}</span>
            {s.id === "preinscripcion" && <RegistrationRing />}
          </Link>
        );
      })}
    </nav>
  );
}
