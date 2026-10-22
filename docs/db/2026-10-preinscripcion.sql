-- Preinscripción: cambios de esquema YA APLICADOS a la base de datos real (Neon)
-- el 2026-10-21. Es un registro histórico: NO hace falta ejecutarlo, y si se
-- ejecuta de nuevo no cambia nada (todo es idempotente).
--
-- Este proyecto no tiene historial de migraciones de drizzle: estos cambios se
-- aplicaron a mano, sentencia a sentencia, y src/db/schema.ts los declara para
-- que el esquema en código y el de la base coincidan. No se usa drizzle-kit
-- push para esto (compararía todo el esquema).

-- 1) Dirección y teléfono de emergencia del formulario de preinscripción.
--    NOT NULL DEFAULT '' para que las filas anteriores sigan siendo válidas
--    (un NOT NULL sin valor por defecto habría roto el ALTER con filas
--    existentes). Las filas antiguas tienen '' y la confirmación no enseña
--    una fila vacía.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS emergency_phone text NOT NULL DEFAULT '';

-- 2) Borrado lógico: una fila con deleted_at no cuenta para plazas, DNI ni
--    confirmación, y no sale en el panel. Toda lectura de negocio filtra
--    deleted_at IS NULL. Nullable y sin valor por defecto.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 3) Un DNI solo puede estar en UNA fila viva (no eliminada y no cancelada).
--    Es la red de seguridad de la base de datos; el INSERT de la aplicación ya
--    lo comprueba con el mismo predicado (src/lib/register-db.ts): si uno
--    cambia, el otro también.
CREATE UNIQUE INDEX IF NOT EXISTS registrations_dni_active_uniq
  ON registrations (dni)
  WHERE deleted_at IS NULL AND payment_status <> 'cancelled';

-- NOTA (esto NO es una sentencia): el borrado lógico de las 4 filas de prueba
-- que existían entonces (poner deleted_at a esas filas) fue una operación de
-- DATOS puntual, ya realizada el 2026-10-21, y no se repite. No forma parte de
-- este esquema y no debe ejecutarse otra vez.

-- 4) Consentimiento al tratamiento de datos por el grupo deportivo organizador
--    (segunda casilla del formulario). Nullable: las filas anteriores a la
--    casilla no lo tienen. Aplicado a la Neon real el 2026-10-21.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS club_consent_at timestamptz;

-- 5) Talla de camiseta (obligatoria en el formulario para filas nuevas; la
--    validación está en el servidor). Nullable: las filas anteriores no la
--    tienen. Aplicado a la Neon real el 2026-10-22.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS shirt_size text;
