import { NextResponse } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { adminLoginAttempts } from "@/db/schema";
import {
  GATE_COOKIE,
  GATE_HEADERS,
  GATE_TTL_SECONDS,
  gateConfigured,
  issueToken,
  loginPage,
  verifyPassword,
} from "@/lib/site-gate";

const WINDOW_MINUTES = 15;
const MAX_PER_IP = 6; // fallos por IP en la ventana
// Fallos entre TODAS las IPs. Umbral de FRENO SUAVE, no de bloqueo: por encima
// de él cada intento se ralentiza, pero sigue pudiendo entrar quien sabe la
// contraseña. Bloquear a todos al llegar a 100 era un DoS contra los usuarios
// legítimos (cualquiera podía provocarlo con 100 contraseñas falsas).
const MAX_GLOBAL = 100;
const GLOBAL_SLOWDOWN_MS = 1500;

function html(body: string, status: number, extra: Record<string, string> = {}) {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...GATE_HEADERS, ...extra },
  });
}

// En Vercel x-vercel-forwarded-for lo pone la plataforma (el cliente no
// puede falsificarlo); el resto son respaldo para local.
function clientIp(request: Request): string {
  const h = request.headers;
  return (
    h.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

export function GET() {
  if (!gateConfigured()) return html("Servicio no disponible", 503);
  return html(loginPage(), 200);
}

export async function POST(request: Request) {
  if (!gateConfigured()) return html("Servicio no disponible", 503);

  // Anti-CSRF: el formulario solo vale si viene de esta misma web.
  // Sec-Fetch-Site lo pone el navegador y no se puede falsificar desde una
  // web ajena; Origin puede llegar como "null" (privacidad), por eso se
  // lee con cuidado en vez de asumir que es una URL.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return html("Petición no válida", 403);
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== "null") {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {}
    if (originHost !== request.headers.get("host")) return html("Petición no válida", 403);
  }

  // Límite ANTES de gastar CPU en scrypt, para que intentar colapsar el
  // login no salga barato. Esto se suma a la regla de rate limit del WAF
  // de Vercel, que corta antes de llegar aquí.
  const db = getDb();
  const ip = clientIp(request);
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const [{ perIp }] = await db
    .select({ perIp: sql<number>`count(*)::int` })
    .from(adminLoginAttempts)
    .where(and(eq(adminLoginAttempts.ip, `gate:${ip}`), gt(adminLoginAttempts.attemptedAt, since)));
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(adminLoginAttempts)
    .where(and(sql`${adminLoginAttempts.ip} like 'gate:%'`, gt(adminLoginAttempts.attemptedAt, since)));
  if (perIp >= MAX_PER_IP) {
    return html(loginPage("Demasiados intentos. Prueba más tarde."), 429, {
      "Retry-After": String(WINDOW_MINUTES * 60),
    });
  }
  if (total >= MAX_GLOBAL) await new Promise((r) => setTimeout(r, GLOBAL_SLOWDOWN_MS));

  // La contraseña solo se acepta por POST en el cuerpo, nunca por URL.
  const form = await request.formData().catch(() => null);
  const password = typeof form?.get("password") === "string" ? (form.get("password") as string) : "";

  if (!password || !verifyPassword(password)) {
    await db.insert(adminLoginAttempts).values({ ip: `gate:${ip}` });
    return html(loginPage("Contraseña incorrecta. Esa cuesta aún no la has subido."), 401);
  }

  const token = issueToken();
  if (!token) return html("Servicio no disponible", 503);

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/", ...GATE_HEADERS },
  });
  response.cookies.set(GATE_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: GATE_TTL_SECONDS,
  });
  return response;
}
