import { pgTable, text, integer, timestamp, uuid, date, pgEnum } from "drizzle-orm/pg-core";

export const modalityEnum = pgEnum("modality", ["trekking", "andarines"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "confirmed", "cancelled"]);

export const registrations = pgTable("registrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  modality: modalityEnum("modality").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dni: text("dni").notNull(),
  birthDate: date("birth_date").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  club: text("club"),

  priceCents: integer("price_cents").notNull(),
  paymentReference: text("payment_reference").notNull().unique(),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  paymentUpdatedBy: text("payment_updated_by"),
  paymentUpdatedAt: timestamp("payment_updated_at", { withTimezone: true }),

  privacyConsentAt: timestamp("privacy_consent_at", { withTimezone: true }).notNull(),
});

export type Registration = typeof registrations.$inferSelect;
export type NewRegistration = typeof registrations.$inferInsert;

// Intentos de login en /admin, para limitar por IP y frenar fuerza bruta —
// no hace falta borrar filas antiguas: el volumen de un panel de dos
// personas es insignificante y las consultas siempre acotan por fecha.
export const adminLoginAttempts = pgTable("admin_login_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ip: text("ip").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
});

// Fila única (id fijo "singleton"): el patrón de puntos 3x3, primera puerta
// de /admin. Solo se guarda hash+sal, nunca el patrón en claro — se
// configura dibujándolo dentro del panel ya autenticado por contraseña, así
// que nadie puede fijarlo antes que Javier/Carlos.
export const adminPatternConfig = pgTable("admin_pattern_config", {
  id: text("id").primaryKey().default("singleton"),
  patternHash: text("pattern_hash"),
  patternSalt: text("pattern_salt"),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});
