import { and, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { registrations } from "@/db/schema";
import { priceCents, type RegistrationInput } from "@/lib/registration";

// Vive aquí y no en actions.ts porque un fichero "use server" solo puede
// exportar acciones (cualquier otro export quedaría expuesto como endpoint),
// y así la sentencia real se puede probar suelta.

// Clave fija del advisory lock que serializa las altas (cualquier bigint
// constante sirve; solo tiene que ser siempre el mismo).
const REGISTRATION_LOCK_KEY = 7270424001;

// Plazas ocupadas = filas VIVAS: no eliminadas (deleted_at IS NULL) y no
// canceladas.
export async function countActiveRegistrations(): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(registrations)
    .where(and(isNull(registrations.deletedAt), ne(registrations.paymentStatus, "cancelled")));
  return row.n;
}

// Alta ATÓMICA con aforo y DNI único. neon-http no soporta db.transaction,
// pero db.batch ejecuta las sentencias en UNA transacción HTTP:
//   1) un advisory lock de transacción: dos envíos simultáneos se serializan;
//   2) el INSERT … SELECT … WHERE, que arranca DESPUÉS del lock con snapshot
//      nuevo (READ COMMITTED) y solo inserta si quedan plazas y el DNI no está
//      ya en una fila viva (no eliminada y no cancelada). Así la plaza
//      `maxPlazas` no se supera ni con envíos a la vez.
// El predicado de "fila viva" del DNI es IDÉNTICO al del índice único parcial
// registrations_dni_active_uniq (deleted_at IS NULL AND payment_status <>
// 'cancelled'): si uno cambia, el otro también.
// Devuelve true si insertó la fila, false si no había plazas o el DNI ya
// existía (el llamador decide qué decir: nunca revelar que el DNI existe).
// Todos los valores van parametrizados y con cast explícito: en un
// INSERT … SELECT los parámetros sin tipo llegan como text.
export async function insertRegistrationIfRoom(
  data: RegistrationInput,
  reference: string,
  maxPlazas: number
): Promise<boolean> {
  const db = getDb();
  const [, inserted] = await db.batch([
    db.execute(registrationLockSql()),
    db.execute(registrationInsertSql(data, reference, maxPlazas)),
  ]);
  return inserted.rows.length === 1;
}

// Las dos sentencias del alta, exportadas para poder probar EXACTAMENTE las
// mismas (p. ej. en una transacción con rollback forzado) sin duplicar el SQL.
export function registrationLockSql() {
  return sql`SELECT pg_advisory_xact_lock(${sql.raw(String(REGISTRATION_LOCK_KEY))})`;
}

export function registrationInsertSql(data: RegistrationInput, reference: string, maxPlazas: number) {
  const club = data.club || null;
  const price = priceCents(data.modality, data.federated);

  return sql`
      INSERT INTO registrations (
        modality, first_name, last_name, dni, birth_date, email, phone, address, emergency_phone, shirt_size,
        club, federated, price_cents, payment_reference, privacy_consent_at, club_consent_at
      )
      SELECT
        ${data.modality}::modality, ${data.firstName}::text, ${data.lastName}::text, ${data.dni}::text,
        ${data.birthDate}::date, ${data.email}::text, ${data.phone}::text, ${data.address}::text,
        ${data.emergencyPhone}::text, ${data.shirtSize}::text, ${club}::text, ${data.federated}::boolean,
        ${price}::integer, ${reference}::text, now(), now()
      WHERE (SELECT count(*) FROM registrations WHERE deleted_at IS NULL AND payment_status <> 'cancelled') < ${maxPlazas}::integer
        AND NOT EXISTS (
          SELECT 1 FROM registrations
          WHERE dni = ${data.dni}::text AND deleted_at IS NULL AND payment_status <> 'cancelled'
        )
      RETURNING id
    `;
}

// Si el error es una violación de unicidad de Postgres (23505), devuelve el
// nombre de la restricción (o el mensaje, que también lo lleva); si no, null.
// Mira también `cause` por si algún día el driver envuelve el error.
export function uniqueViolationOf(err: unknown): string | null {
  let current: unknown = err;
  for (let depth = 0; depth < 3 && current && typeof current === "object"; depth++) {
    const { code, constraint, message, cause } = current as {
      code?: string;
      constraint?: string;
      message?: string;
      cause?: unknown;
    };
    if (code === "23505") return constraint ?? message ?? "";
    current = cause;
  }
  return null;
}
