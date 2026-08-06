"use client";

import { useRef } from "react";

function applyTheme(next: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("picota-theme", next);
}

// Círculo que se expande desde el propio botón, revelando el tema nuevo por
// encima del viejo, con la View Transition API nativa. Las coordenadas del
// clip-path van en PORCENTAJE del viewport, nunca en píxeles absolutos:
// Chrome tiene un bug conocido por el que un clip-path en px sobre
// ::view-transition-new(root) no se escala bien en pantallas con factor de
// escala fraccionario (el caso típico de un Mac Retina) — el círculo
// aparece desplazado hacia el centro y con el radio equivocado, que es
// justo lo que se veía. En porcentaje del propio viewport no depende de
// esa conversión y siempre cae en el sitio correcto (referencia:
// magicui.design/docs/components/animated-theme-toggler).
function useThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  function toggleTheme() {
    const button = buttonRef.current;
    if (!button) return;

    const root = document.documentElement;
    const current =
      root.getAttribute("data-theme") ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof document.startViewTransition !== "function" || reduceMotion) {
      applyTheme(next);
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { top, left, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;

    const maxRadiusPx = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y));
    // circle()'s porcentaje de radio se resuelve contra hypot(vw,vh)/√2 de
    // la caja de referencia — hay que deshacer esa fórmula para que el
    // porcentaje elegido equivalga exactamente al radio en px que se quiere.
    const radiusPct = (maxRadiusPx / (Math.hypot(vw, vh) / Math.SQRT2)) * 100;
    const cx = `${(x / vw) * 100}%`;
    const cy = `${(y / vh) * 100}%`;

    const transition = document.startViewTransition(() => applyTheme(next));

    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0% at ${cx} ${cy})`, `circle(${radiusPct}% at ${cx} ${cy})`] },
        { duration: 900, easing: "ease-in-out", fill: "forwards", pseudoElement: "::view-transition-new(root)" }
      );
    });
  }

  return { buttonRef, toggleTheme };
}

export function ThemeToggle() {
  const { buttonRef, toggleTheme } = useThemeToggle();

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggleTheme}
      aria-label="Cambiar entre modo claro y oscuro"
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-dim)] transition-colors hover:border-[var(--pine)] hover:text-[var(--pine)] sm:h-9 sm:w-9"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="icon-light"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5Z"
        />
      </svg>
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        className="icon-dark"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.5" />
        <path
          strokeLinecap="round"
          d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        />
      </svg>
    </button>
  );
}
