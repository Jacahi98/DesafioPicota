import { z } from "zod";

// Todo esto es información real del evento salvo el IBAN/NIF, marcados
// explícitamente como placeholder — sustituir antes de abrir inscripciones
// de verdad.
export const RACE_DATE = new Date("2027-04-24T00:00:00Z");
// 23:59:59 hora de Madrid (CEST, UTC+2 en abril) — en UTC son las 21:59:59
// del mismo día, así que toLocaleDateString con timeZone:"UTC" muestra el
// 20 y no el 21 (lo que pasaba formateando en la zona horaria del navegador).
export const REGISTRATION_DEADLINE = new Date("2027-04-20T21:59:59Z");

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

// Decide si el nº de licencia federativa que escribe el corredor tiene un
// formato aceptable. Solo mira el FORMATO (no puede saber si la licencia
// existe de verdad: eso se revisa a mano en el panel, "sin verificar").
// Se usa en el formulario (paso 3) y se vuelve a comprobar en el servidor.
//
// Deliberadamente permisiva: no se conoce el formato exacto de cada
// federación y una regla estricta rechazaría a federados de verdad. Pide
// solo lo mínimo que cualquier licencia real cumple: 4-20 caracteres
// (letras, números, guion, barra, punto o espacio), al menos un dígito y no
// ser un mismo carácter repetido ("0000", "aaaa").
export function licenseNumberIsValid(raw: string): boolean {
  const value = raw.trim();
  if (!/^[A-Za-z0-9\-\/. ]{4,20}$/.test(value)) return false;
  if (!/[0-9]/.test(value)) return false;
  if (new Set(value.replace(/[^A-Za-z0-9]/g, "").toLowerCase()).size < 2) return false;
  return true;
}

export const BANK_TRANSFER = {
  // PLACEHOLDER — sustituir por el IBAN real antes de abrir inscripciones.
  iban: "ES00 0000 0000 0000 0000 0000",
  holder: "Carlos Castañeda",
};

// PLACEHOLDER — responsable del tratamiento (RGPD), sustituir por la
// entidad/NIF real antes de abrir inscripciones.
export const ORGANIZER = {
  legalName: "Club Deportivo Elemental A Vista SADC",
  nif: "G05724489",
};

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
  dni: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9XYZ][0-9]{7}[A-Z]$/, "DNI/NIE no válido"),
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
  club: z.string().trim().max(100).optional().or(z.literal("")),
  federated: z.boolean(),
  licenseNumber: z.string().trim().max(30).optional().or(z.literal("")),
  privacyConsent: z.literal(true, { message: "Hay que aceptar la política de privacidad" }),
}).superRefine((data, ctx) => {
  // Federado => hace falta el nº de licencia, con un formato razonable.
  if (data.federated && !licenseNumberIsValid(data.licenseNumber ?? "")) {
    ctx.addIssue({
      code: "custom",
      path: ["licenseNumber"],
      message: data.licenseNumber ? "Número de licencia no válido" : "Falta el número de licencia",
    });
  }
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

// Interruptor general: las inscripciones aún no han abierto (previsiblemente
// en 2027). Con esto en false la página muestra el aviso y registerAction
// rechaza cualquier envío en el servidor, aunque alguien llame a la acción
// directamente sin pasar por el formulario. Ponerlo en true al abrirlas.
export const REGISTRATION_ENABLED = false;

export function isRegistrationOpen(): boolean {
  return REGISTRATION_ENABLED && new Date() < REGISTRATION_DEADLINE;
}

export function generatePaymentReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para evitar confusiones al escribir a mano
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `DP27-${code}`;
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}
