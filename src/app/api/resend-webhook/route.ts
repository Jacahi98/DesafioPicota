import { createHmac, timingSafeEqual } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { registrations } from "@/db/schema";

// Aviso de Resend (webhook) cuando un correo se entrega, rebota, se retrasa o
// falla. Se guarda el estado en la preinscripción (columna email_status) para
// que el panel avise de los correos que no han llegado, por ejemplo por una
// errata en la dirección.
//
// Resend firma cada aviso con Svix: se comprueba la firma con el secreto
// RESEND_WEBHOOK_SECRET ("whsec_...") antes de fiarse de nada. Sin ese secreto
// la ruta responde 503 y no hace nada.

const TOLERANCE_S = 5 * 60;

const EVENT_TO_STATUS: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.delivery_delayed": "delayed",
  "email.complained": "complained",
  "email.failed": "failed",
};

function validSignature(body: string, headers: Headers, secret: string): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || !timestamp || !signatures) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > TOLERANCE_S) return false;
  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  // "v1,<base64> v1,<base64>": vale cualquiera de las firmas
  return signatures.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook no configurado", { status: 503 });

  const body = await request.text();
  if (!validSignature(body, request.headers, secret)) return new Response("Firma no válida", { status: 401 });

  let event: { type?: string; created_at?: string; data?: { subject?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Cuerpo no válido", { status: 400 });
  }

  const status = event.type ? EVENT_TO_STATUS[event.type] : undefined;
  const reference = /DP27-[A-Z0-9]{6,8}/.exec(event.data?.subject ?? "")?.[0];
  // Eventos que no interesan (abierto, clic...) o de otros correos: se aceptan sin hacer nada.
  if (!status || !reference) return new Response("ok", { status: 200 });

  await getDb()
    .update(registrations)
    .set({ emailStatus: status, emailStatusAt: event.created_at ? new Date(event.created_at) : new Date() })
    .where(and(eq(registrations.paymentReference, reference), isNull(registrations.deletedAt)));

  return new Response("ok", { status: 200 });
}
