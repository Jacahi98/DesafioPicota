"use client";

// El bloque @media (prefers-reduced-motion) de globals.css solo frena
// animaciones y transiciones CSS. Framer Motion anima por JS
// (requestAnimationFrame + transform inline), así que se saltaba esa
// preferencia por completo: con "reducir movimiento" activado seguían
// corriendo las líneas del fondo, la tira de colaboradores, el border-trail
// y todo lo dirigido por scroll. reducedMotion="user" hace que Framer Motion
// lea la preferencia del sistema y desactive las animaciones de transform y
// layout (deja pasar opacidad y color, que no provocan mareo).
//
// Los children llegan ya renderizados en el servidor: envolverlos en un
// client component no los convierte en cliente ni rompe el prerender.
import { MotionConfig } from "framer-motion";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
