import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminLoginAttempts } from "@/db/schema";

// Límites por IP sobre la tabla que ya existe (admin_login_attempts), con un
// prefijo en `ip` para no mezclarse con el gate ("gate:") ni con el panel (que
// cuenta por IP exacta, sin prefijo). Prefijos de este fichero: "reg:" (envíos
// del formulario) y "ref:" (consultas de la página de confirmación).
//
// El almacén es inyectable para poder probar los umbrales sin tocar la BD
// (el de verdad cuenta/inserta en admin_login_attempts).
export type AttemptStore = {
  count(key: string, since: Date): Promise<number>;
  record(key: string): Promise<void>;
};

export const dbAttemptStore: AttemptStore = {
  async count(key, since) {
    const [row] = await getDb()
      .select({ n: sql<number>`count(*)::int` })
      .from(adminLoginAttempts)
      .where(and(eq(adminLoginAttempts.ip, key), gt(adminLoginAttempts.attemptedAt, since)));
    return row.n;
  },
  async record(key) {
    await getDb().insert(adminLoginAttempts).values({ ip: key });
  },
};

// true si ya hay `max` o más intentos de esa IP en la ventana.
export async function tooManyAttempts(
  prefix: string,
  ip: string,
  windowMin: number,
  max: number,
  store: AttemptStore = dbAttemptStore
): Promise<boolean> {
  const since = new Date(Date.now() - windowMin * 60 * 1000);
  return (await store.count(`${prefix}${ip}`, since)) >= max;
}

export async function recordAttempt(prefix: string, ip: string, store: AttemptStore = dbAttemptStore): Promise<void> {
  await store.record(`${prefix}${ip}`);
}
