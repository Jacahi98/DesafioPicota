"use server";

import { headers } from "next/headers";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { registrations } from "@/db/schema";
import { REFERENCE_PATTERN, REF_WINDOW_MIN, REF_MAX_PER_IP } from "@/lib/registration";
import { clientIp } from "@/lib/client-ip";
import { tooManyAttempts, recordAttempt } from "@/lib/rate-limit";

export type CheckState = {
  status: "idle" | "found" | "notfound" | "invalid" | "limited" | "error";
  // Número de corredor: orden de llegada de la preinscripción (1 = la primera). Solo con status "found".
  runnerNumber?: number;
  // Modalidad de esa preinscripción (para dibujar su recorrido en la imagen de compartir). Solo con status "found".
  modality?: "trekking" | "andarines";
};

// Comprobador de preinscripción: se mete el localizador y solo se responde SI o NO.
// A propósito no devuelve ningún dato de la persona (ni nombre): el localizador de 8 caracteres
// es lo único que se pide, así que lo que se enseña tiene que ser lo mínimo.
// Límite por IP propio ("chk:") para frenar el barrido de localizadores.
export async function checkPreinscriptionAction(_prev: CheckState, formData: FormData): Promise<CheckState> {
  const raw = formData.get("reference");
  const reference = (typeof raw === "string" ? raw : "").trim().toUpperCase().replace(/\s+/g, "");
  // Se acepta también sin el prefijo "DP27-" (lo que la gente copia o escribe a mano).
  const candidate = /^[A-Z2-9]{6,8}$/.test(reference) ? `DP27-${reference}` : reference.replace(/^DP27[-_ ]?/, "DP27-");
  if (!REFERENCE_PATTERN.test(candidate)) return { status: "invalid" };

  try {
    const ip = clientIp(await headers());
    if (await tooManyAttempts("chk:", ip, REF_WINDOW_MIN, REF_MAX_PER_IP)) return { status: "limited" };
    await recordAttempt("chk:", ip);

    const db = getDb();
    const [row] = await db
      .select({ id: registrations.id, createdAt: registrations.createdAt, modality: registrations.modality })
      .from(registrations)
      .where(
        and(
          eq(registrations.paymentReference, candidate),
          isNull(registrations.deletedAt),
          ne(registrations.paymentStatus, "cancelled")
        )
      )
      .limit(1);
    if (!row) return { status: "notfound" };
    // Número de corredor = cuántas filas hay creadas hasta esa (contando también las bajas, para que el número no cambie si alguien se da de baja).
    // Se cuenta dentro de la base de datos: pasar la fecha por JavaScript recorta los microsegundos y la propia fila se quedaba fuera (daba uno menos).
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(registrations)
      .where(sql`${registrations.createdAt} <= (select r.created_at from registrations r where r.id = ${row.id})`);
    return { status: "found", runnerNumber: n, modality: row.modality };
  } catch {
    return { status: "error" };
  }
}
