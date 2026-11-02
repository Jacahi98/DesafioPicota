// Ventana de la PREINSCRIPCIÓN. Módulo ligero y sin dependencias a propósito:
// lo importan componentes de cliente que están en todas las páginas (el círculo
// del menú) y no deben arrastrar zod ni el resto de registration.ts.

// Abre a las 11:00 del 9 de noviembre de 2026 y cierra a las 11:00 del 11 de noviembre (hora de España, CET = +01:00): 48 horas.
// Javier lo cambió del 3 al 10 de noviembre el 2026-10-22 (el cartel original decía el 3) y, el 2026-11-02, al tramo actual.
export const REGISTRATION_OPENS_AT = new Date("2026-11-09T11:00:00+01:00");
export const REGISTRATION_DEADLINE = new Date("2026-11-11T11:00:00+01:00");

// El círculo del menú empieza a llenarse este tiempo antes de la apertura.
export const REGISTRATION_RING_MS = 14 * 24 * 60 * 60 * 1000;

export type RegistrationPhase = "before" | "open" | "closed";

// INTERRUPTOR TEMPORAL DE PRUEBA: con REGISTRATION_TEST_OPEN=1 en el entorno
// (Vercel) la preinscripción se considera abierta ANTES de la apertura real,
// para poder probar el envío completo en producción. Solo sirve antes de
// REGISTRATION_OPENS_AT (nunca alarga el plazo) y la página muestra un aviso de
// "modo prueba". Hay que quitar la variable y redesplegar al terminar.
export function isTestOpen(now: Date = new Date()): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    process.env.REGISTRATION_TEST_OPEN === "1" &&
    now < REGISTRATION_OPENS_AT
  );
}

export function registrationPhase(now: Date = new Date()): RegistrationPhase {
  // En desarrollo local siempre abierta, para poder probar el formulario fuera
  // de la ventana. Las compilaciones de producción (incluidas las de Vercel)
  // ignoran esto.
  if (process.env.NODE_ENV !== "production") return "open";
  if (isTestOpen(now)) return "open";
  if (now < REGISTRATION_OPENS_AT) return "before";
  if (now >= REGISTRATION_DEADLINE) return "closed";
  return "open";
}

// "jueves 5 de noviembre de 2026 a las 00:00", ensamblado con formatToParts:
// la puntuación que mete format() puede diferir entre Node y el navegador y
// rompería la hidratación. Con la zona horaria fija no depende de dónde corra.
export function madridDateTimeLabel(date: Date): string {
  const parts = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Madrid",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${weekdayCap} ${get("day")} de ${get("month")} de ${get("year")} a las ${get("hour")}:${get("minute")}`;
}
