"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { registrations, adminLoginAttempts, adminPatternConfig } from "@/db/schema";
import {
  checkPassword,
  sessionCookieValue,
  isValidSession,
  adminLabel,
  ADMIN_COOKIE,
  PATTERN_GATE_COOKIE,
  PATTERN_MIN_DOTS,
  isValidPatternGate,
  patternGateCookieValue,
  hashPattern,
  verifyPatternHash,
  newPatternSalt,
} from "@/lib/admin-auth";

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_ATTEMPTS = 8;

async function getClientIp(): Promise<string> {
  const h = await headers();
  // x-forwarded-for puede traer varias IPs separadas por coma (cliente,
  // proxies intermedios) — la primera es la del visitante real.
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

async function recentFailedAttempts(ip: string): Promise<number> {
  const db = getDb();
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adminLoginAttempts)
    .where(and(eq(adminLoginAttempts.ip, ip), gt(adminLoginAttempts.attemptedAt, since)));
  return count;
}

async function getPatternConfig() {
  const db = getDb();
  const [row] = await db
    .select()
    .from(adminPatternConfig)
    .where(eq(adminPatternConfig.id, "singleton"))
    .limit(1);
  return row;
}

function parseSequence(raw: string): number[] | null {
  const parts = raw.split(",").filter(Boolean).map(Number);
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 8)) return null;
  if (new Set(parts).size !== parts.length) return null;
  if (parts.length < PATTERN_MIN_DOTS) return null;
  return parts;
}

export async function verifyPatternAction(formData: FormData) {
  const ip = await getClientIp();

  if ((await recentFailedAttempts(ip)) >= RATE_LIMIT_MAX_ATTEMPTS) {
    redirect("/sendero-f74ad7?error=ratelimited");
  }

  const config = await getPatternConfig();
  // Sin patrón configurado todavía no hay nada que verificar — no debería
  // llegar aquí (la página no muestra el candado en ese caso), pero por si
  // acaso deja pasar en vez de bloquear el arranque inicial.
  if (!config?.patternHash || !config.patternSalt) {
    redirect("/sendero-f74ad7");
  }

  const raw = String(formData.get("sequence") ?? "");
  const sequence = parseSequence(raw);
  const valid = sequence && verifyPatternHash(sequence.join(","), config.patternSalt, config.patternHash);

  if (!valid) {
    await getDb().insert(adminLoginAttempts).values({ ip });
    redirect("/sendero-f74ad7?error=pattern");
  }

  // Dura solo lo justo para sobrevivir a la redirección que viene a
  // continuación (esta acción no puede renderizar la página directamente,
  // así que hace falta ALGUNA cookie para cruzar ese salto) — no una
  // "sesión" de verdad. En la práctica hay que dibujar el patrón en cada
  // visita, tal cual se pidió: nada de recordar el patrón un rato.
  const cookieStore = await cookies();
  cookieStore.set(PATTERN_GATE_COOKIE, patternGateCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/sendero-f74ad7",
    maxAge: 20,
  });
  redirect("/sendero-f74ad7");
}

export async function loginAction(formData: FormData) {
  const ip = await getClientIp();

  if ((await recentFailedAttempts(ip)) >= RATE_LIMIT_MAX_ATTEMPTS) {
    redirect("/sendero-f74ad7?error=ratelimited");
  }

  // El patrón, si está configurado, es la primera puerta — se exige aquí
  // también (no solo en la UI) para que nadie pueda saltárselo llamando al
  // formulario de contraseña directamente.
  const config = await getPatternConfig();
  if (config?.patternHash) {
    const cookieStore = await cookies();
    if (!isValidPatternGate(cookieStore.get(PATTERN_GATE_COOKIE)?.value)) {
      redirect("/sendero-f74ad7");
    }
  }

  const password = String(formData.get("password") ?? "");
  const adminId = checkPassword(password);

  if (!adminId) {
    await getDb().insert(adminLoginAttempts).values({ ip });
    redirect("/sendero-f74ad7?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, sessionCookieValue(adminId), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/sendero-f74ad7",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/sendero-f74ad7");
}

export async function logoutAction() {
  // Borra las DOS cookies, no solo la de contraseña — "salir" tiene que
  // dejar todo como si fuera la primera visita, patrón incluido, si no la
  // puerta del patrón queda abierta de fondo aunque ya no haya sesión.
  // El path tiene que coincidir EXACTO con el usado al crearlas (Next.js
  // solo borra una cookie si el path declarado aquí es el mismo con el que
  // se creó) — sin esto, delete(nombre) a secas apunta a path "/" por
  // defecto y no coincide con "/sendero-f74ad7", así que no borraba nada.
  const cookieStore = await cookies();
  cookieStore.delete({ name: ADMIN_COOKIE, path: "/sendero-f74ad7" });
  cookieStore.delete({ name: PATTERN_GATE_COOKIE, path: "/sendero-f74ad7" });
  redirect("/sendero-f74ad7");
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const adminId = isValidSession(cookieStore.get(ADMIN_COOKIE)?.value);
  if (!adminId) throw new Error("No autorizado");
  return adminId;
}

export async function setPaymentStatusAction(formData: FormData) {
  const adminId = await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as "pending" | "confirmed" | "cancelled";
  await getDb()
    .update(registrations)
    .set({ paymentStatus: status, paymentUpdatedBy: adminLabel(adminId), paymentUpdatedAt: new Date() })
    .where(eq(registrations.id, id));
  revalidatePath("/sendero-f74ad7");
}

// Solo alcanzable ya autenticado por contraseña — así nadie puede fijar el
// patrón antes que Javier/Carlos con solo visitar la ruta. Además, solo
// Javier puede tocarlo — comprobado aquí en servidor, no solo ocultando el
// botón en la UI (eso solo evita que Carlos lo vea, no que lo llame).
export async function setPatternAction(formData: FormData) {
  const adminId = await requireAdmin();
  if (adminId !== "javier") throw new Error("Solo Javier puede cambiar el patrón");
  const raw = String(formData.get("sequence") ?? "");
  const sequence = parseSequence(raw);
  if (!sequence) throw new Error("Patrón no válido");

  const salt = newPatternSalt();
  const hash = hashPattern(sequence.join(","), salt);

  await getDb()
    .insert(adminPatternConfig)
    .values({
      id: "singleton",
      patternHash: hash,
      patternSalt: salt,
      updatedBy: adminLabel(adminId),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: adminPatternConfig.id,
      set: { patternHash: hash, patternSalt: salt, updatedBy: adminLabel(adminId), updatedAt: new Date() },
    });

  revalidatePath("/sendero-f74ad7");
}
