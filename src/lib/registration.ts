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
  trekking: { label: "Trekking", priceCents: 2000 },
  andarines: { label: "Andarines", priceCents: 1000 },
} as const;

export type Modality = keyof typeof MODALITIES;

export const BANK_TRANSFER = {
  // PLACEHOLDER — sustituir por el IBAN real antes de abrir inscripciones.
  iban: "ES00 0000 0000 0000 0000 0000",
  holder: "Carlos Castañeda",
};

// PLACEHOLDER — responsable del tratamiento (RGPD), sustituir por la
// entidad/NIF real antes de abrir inscripciones.
export const ORGANIZER = {
  legalName: "Carlos Castañeda (placeholder — pendiente de entidad/NIF definitivos)",
  nif: "NIF pendiente",
};

// Edad mínima calculada el día de la carrera, no hoy: alguien que hoy tiene
// 17 pero los cumple antes del 24 de abril de 2027 puede inscribirse.
function ageAt(birthDate: Date, at: Date): number {
  let age = at.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = at.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }
  return age;
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
    .refine((v) => ageAt(new Date(v), RACE_DATE) >= 18, "Hay que ser mayor de edad el día de la carrera"),
  email: z.string().trim().toLowerCase().email("Email no válido"),
  phone: z
    .string()
    .trim()
    .regex(/^[679][0-9]{8}$/, "Teléfono no válido (9 dígitos)"),
  club: z.string().trim().max(100).optional().or(z.literal("")),
  privacyConsent: z.literal(true, { message: "Hay que aceptar la política de privacidad" }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export function isRegistrationOpen(): boolean {
  return new Date() < REGISTRATION_DEADLINE;
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
