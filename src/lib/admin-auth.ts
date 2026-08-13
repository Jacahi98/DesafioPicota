import { createHmac, timingSafeEqual, randomBytes, scryptSync } from "crypto";

export const ADMIN_COOKIE = "picota_admin_session";
export const PATTERN_GATE_COOKIE = "picota_pattern_gate";
export const PATTERN_MIN_DOTS = 4;

// La ruta del panel ya no es un secreto de por vida como antes (el repo es
// público, así que cualquier nombre de carpeta se ve en el código) — ahora
// es un valor que solo existe en la variable de entorno, nunca commiteado.
// proxy.ts reescribe esta ruta hacia /panel; visitar /panel directamente
// (sin pasar por aquí) da 404, ver ADMIN_PROXY_HEADER más abajo.
export const ADMIN_PATH = process.env.ADMIN_PATH_SECRET ?? "";

// Cabecera que proxy.ts añade SOLO cuando la petición llegó por ADMIN_PATH
// -- panel/layout.tsx exige que esté presente o devuelve 404. Un cliente no
// puede falsificarla: proxy.ts la borra de la petición entrante antes de
// decidir si la vuelve a poner.
export const ADMIN_PROXY_HEADER = "x-picota-admin-proxied";

// Contraseñas nombradas por persona (no cuentas de verdad, pero cada una
// identifica a quién pertenece) — así "quién marcó esto como pagado" tiene
// respuesta, y se puede cambiar la contraseña de uno sin tocar la del otro.
const ADMINS = [
  { id: "javier", label: "Javier", passwordEnv: "ADMIN_PASSWORD_JAVIER" },
  { id: "carlos", label: "Carlos", passwordEnv: "ADMIN_PASSWORD_CARLOS" },
] as const;

export type AdminId = (typeof ADMINS)[number]["id"];

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Comprueba SIEMPRE contra las dos contraseñas (nunca corta en el primer
// fallo) para que el tiempo de respuesta no filtre cuál de las dos casi
// coincidió.
export function checkPassword(password: string): AdminId | null {
  let match: AdminId | null = null;
  for (const admin of ADMINS) {
    const expected = process.env[admin.passwordEnv];
    if (expected && timingSafeStringEqual(password, expected)) match = admin.id;
  }
  return match;
}

export function adminLabel(id: AdminId): string {
  return ADMINS.find((a) => a.id === id)?.label ?? id;
}

function sign(value: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("Falta ADMIN_SESSION_SECRET");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function sessionCookieValue(id: AdminId): string {
  return `${id}.${sign(id)}`;
}

export function isValidSession(cookieValue: string | undefined): AdminId | null {
  if (!cookieValue) return null;
  const [id, signature] = cookieValue.split(".");
  if (!id || !signature) return null;
  if (!ADMINS.some((a) => a.id === id)) return null;
  if (!timingSafeStringEqual(signature, sign(id))) return null;
  return id as AdminId;
}

// --- Patrón de puntos 3x3 (primera puerta, ver src/app/admin/pattern-lock.tsx) ---
// Solo se guarda hash+sal en la base de datos (admin_pattern_config) —
// Claude nunca ve el patrón en claro, y ni siquiera queda en el historial
// de este chat: se configura dibujándolo dentro del panel ya autenticado.

export function normalizePatternSequence(dots: number[]): string {
  return dots.join(",");
}

export function hashPattern(sequence: string, salt: string): string {
  return scryptSync(sequence, salt, 64).toString("hex");
}

export function newPatternSalt(): string {
  return randomBytes(16).toString("hex");
}

export function verifyPatternHash(sequence: string, salt: string, expectedHash: string): boolean {
  const actual = hashPattern(sequence, salt);
  return timingSafeStringEqual(actual, expectedHash);
}

// Puerta de patrón: la cookie dura segundos, solo para cruzar la
// redirección tras verificarlo — no es una sesión. Hay que dibujarlo en
// cada visita (ver maxAge en verifyPatternAction).
export function patternGateCookieValue(): string {
  return sign("pattern-ok");
}

export function isValidPatternGate(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  return timingSafeStringEqual(cookieValue, sign("pattern-ok"));
}
