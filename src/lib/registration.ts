import { z } from "zod";

// Todo esto es información real del evento salvo el IBAN/NIF, marcados
// explícitamente como placeholder — sustituir antes de abrir inscripciones
// de verdad.
export const RACE_DATE = new Date("2027-04-24T00:00:00Z");
// Ventana de la PREINSCRIPCIÓN (cartel: "3 noviembre 2026, solo 48 horas").
// Abre a las 00:00 del 3 de noviembre (hora de España, CET = +01:00) y cierra
// 48 h después, a las 00:00 del 5. Hora confirmada por Javier (2026-10-22).
export const REGISTRATION_OPENS_AT = new Date("2026-11-03T00:00:00+01:00");
export const REGISTRATION_DEADLINE = new Date(REGISTRATION_OPENS_AT.getTime() + 48 * 60 * 60 * 1000);

export const MODALITIES = {
  trekking: { label: "Trail" },
  andarines: { label: "Andarines" },
} as const;

export type Modality = keyof typeof MODALITIES;

// Precio por modalidad y por si el corredor tiene licencia federativa. Es la
// ÚNICA fuente de precios: el servidor lo recalcula al guardar la inscripción
// (registerAction) y nunca se fía de un importe que venga del navegador.
export const PRICES_CENTS = {
  trekking: { federated: 1800, standard: 2000 },
  andarines: { federated: 1300, standard: 1500 },
} as const;

export function priceCents(modality: Modality, federated: boolean): number {
  return PRICES_CENTS[modality][federated ? "federated" : "standard"];
}

// La licencia federativa ya no se pide en el formulario: quien se marca como
// federado debe llevar el documento acreditativo EN PERSONA y se comprueba el
// día de la carrera (ver FederatedLicenseNotice).
export const FEDERATED_LICENSE_NOTICE =
  "Es obligatorio llevar, de forma presencial, el documento que acredite tu licencia federativa. Se comprobará el día de la carrera. Si te has inscrito como federado y no llevas el documento, tendrás que abonar el importe correspondiente el día de la carrera.";

// Correo de contacto para incidencias (p. ej. si no llega el email de
// confirmación). Confirmado por Javier el 2026-10-22.
export const CONTACT_EMAIL = "desafiopicota@gmail.com";

// Versión corta para la confirmación y el email.
export const FEDERATED_LICENSE_SHORT =
  "Lleva el documento acreditativo, de forma presencial. Si no lo llevas, tendrás que abonar el importe correspondiente el día de la carrera.";

export const BANK_TRANSFER = {
  // PLACEHOLDER — sustituir por el IBAN real antes de abrir inscripciones.
  iban: "ES00 0000 0000 0000 0000 0000",
  holder: "Carlos Castañeda",
};

// Responsable del tratamiento (RGPD). Entidad y NIF confirmados como
// definitivos por Javier (2026-10-21).
export const ORGANIZER = {
  legalName: "Club Deportivo Elemental A Vista SADC",
  nif: "G05724489",
};

// Tallas de camiseta de la prueba (lista confirmada por Javier, 2026-10-22).
export const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

// Edad mínima calculada el día de la carrera, no hoy: alguien que hoy tiene
// 17 pero los cumple antes del 24 de abril de 2027 puede inscribirse.
export const MIN_AGE = 16;
export const ADULT_AGE = 18;
// Documento descargable que firman padre/madre/tutor (ver docs/).
export const GUARDIAN_AUTH_PATH = "/autorizacion-menores.pdf";

function ageAt(birthDate: Date, at: Date): number {
  let age = at.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = at.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }
  return age;
}

// Edad que tendrá el día de la carrera, o null si la fecha no es válida.
export function ageAtRace(birthDate: string): number | null {
  const parsed = Date.parse(birthDate);
  return Number.isNaN(parsed) ? null : ageAt(new Date(parsed), RACE_DATE);
}

// 16 y 17 años: pueden correr, pero con autorización firmada de sus tutores.
export function needsGuardianConsent(birthDate: string): boolean {
  const age = ageAtRace(birthDate);
  return age !== null && age >= MIN_AGE && age < ADULT_AGE;
}


export const registrationSchema = z.object({
  modality: z.enum(["trekking", "andarines"]),
  firstName: z.string().trim().min(1, "Falta el nombre").max(100),
  lastName: z.string().trim().min(1, "Faltan los apellidos").max(100),
  // Se normaliza ANTES de validar: sin espacios ni guiones y en mayúsculas
  // ("12345678-z" y " 12345678 z " son el mismo DNI 12345678Z). Lo que se
  // guarda, y lo que se compara para detectar repetidos, es siempre esta forma.
  dni: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, "").toUpperCase())
    .pipe(z.string().regex(/^[0-9XYZ][0-9]{7}[A-Z]$/, "DNI/NIE no válido")),
  birthDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha de nacimiento no válida")
    .refine(
      (v) => (ageAtRace(v) ?? 0) >= MIN_AGE,
      `Hay que tener ${MIN_AGE} años cumplidos el día de la carrera`
    ),
  email: z.string().trim().toLowerCase().email("Email no válido"),
  phone: z
    .string()
    .trim()
    .regex(/^[679][0-9]{8}$/, "Teléfono no válido (9 dígitos)"),
  // Con el campo vacío fallan dos reglas a la vez; formulario y servidor solo
  // enseñan la primera de cada campo ("Falta…").
  address: z
    .string()
    .trim()
    .min(1, "Falta la dirección")
    .min(5, "Dirección demasiado corta")
    .max(200, "Dirección demasiado larga"),
  emergencyPhone: z
    .string()
    .trim()
    .min(1, "Falta el teléfono de emergencia")
    .regex(/^[679][0-9]{8}$/, "Teléfono de emergencia no válido (9 dígitos)"),
  shirtSize: z.enum(SHIRT_SIZES, { message: "Elige tu talla de camiseta" }),
  club: z.string().trim().max(100).optional().or(z.literal("")),
  federated: z.boolean(),
  privacyConsent: z.literal(true, { message: "Hay que aceptar la política de privacidad" }),
  clubConsent: z.literal(true, {
    message: "Hay que aceptar el tratamiento y la recogida de tus datos por parte del grupo deportivo",
  }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

// Interruptor general de la preinscripción. Con esto en false la página muestra
// el aviso y registerAction rechaza cualquier envío en el servidor, aunque
// alguien llame a la acción directamente sin pasar por el formulario. En true
// la preinscripción se rige por su ventana (REGISTRATION_OPENS_AT a
// REGISTRATION_DEADLINE) en registrationPhase().
export const REGISTRATION_ENABLED = true;

export type RegistrationPhase = "before" | "open" | "closed";

export function registrationPhase(now: Date = new Date()): RegistrationPhase {
  // En desarrollo local siempre abierta, para poder probar el formulario fuera
  // de la ventana. Las compilaciones de producción (incluidas las de Vercel)
  // ignoran esto.
  if (process.env.NODE_ENV !== "production") return "open";
  if (now < REGISTRATION_OPENS_AT) return "before";
  if (now >= REGISTRATION_DEADLINE) return "closed";
  return "open";
}

export function isRegistrationOpen(): boolean {
  return REGISTRATION_ENABLED && registrationPhase() === "open";
}

// Aforo y anti-abuso de la preinscripción: valores únicos, los usan el
// servidor (actions.ts, página y confirmación).
export const PLAZAS_MAX = 500; // total de plazas (filas vivas: no eliminadas y no canceladas), sin cupo por modalidad
export const REG_WINDOW_MIN = 15; // ventana del límite de envíos por IP
export const REG_MAX_PER_IP = 12;
export const REG_MIN_FILL_MS = 8000; // un envío más rápido que esto no lo hace una persona
export const REF_WINDOW_MIN = 15; // ventana del límite de consultas de la confirmación por IP
export const REF_MAX_PER_IP = 30;
// Localizador: DP27- y 6 (filas antiguas) u 8 caracteres.
export const REFERENCE_PATTERN = /^DP27-[A-Z2-9]{6,8}$/;

// 8 caracteres (las filas antiguas tienen 6 y siguen siendo válidas). Con el
// generador criptográfico y no con el aleatorio simple del motor: el
// localizador abre la página de confirmación, que enseña datos personales, así
// que no puede ser predecible. Se usa el crypto global de la plataforma y no el
// módulo de Node, porque este fichero también lo importa el cliente.
export function generatePaymentReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 símbolos, sin 0/O/1/I para evitar confusiones al escribir a mano
  // 256 % 32 === 0: cada byte % 32 cae en el alfabeto sin sesgo.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(8));
  let code = "";
  for (const b of bytes) code += chars[b % 32];
  return `DP27-${code}`;
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}
