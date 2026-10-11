import { createHmac, scryptSync, timingSafeEqual } from "crypto";

// Puerta de contraseña para TODA la web (ver proxy.ts). Diseño:
//  - La contraseña nunca está en el repo ni en claro en ningún sitio del
//    servidor: solo su hash scrypt (SITE_GATE_HASH = "salt:hash" en hex).
//  - La cookie de acceso es un token firmado con HMAC (SITE_GATE_SECRET) que
//    solo lleva una caducidad; no contiene la contraseña ni se puede forjar
//    sin el secreto. Además la clave de firma se deriva del hash, así que
//    cambiar la contraseña invalida todas las cookies ya emitidas.
//  - Sin variables configuradas en producción la web se queda CERRADA
//    (falla cerrando, nunca abierta).

export const GATE_COOKIE = "__Host-picota_gate";
export const GATE_PATH = "/api/gate";
export const GATE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días

// scrypt con N=2^17, r=8, p=1: el mínimo que recomienda OWASP para scrypt.
const SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

function config() {
  const hash = process.env.SITE_GATE_HASH ?? "";
  const secret = process.env.SITE_GATE_SECRET ?? "";
  if (!hash.includes(":") || secret.length < 32) return null;
  return { hash, secret };
}

export function gateConfigured(): boolean {
  return config() !== null;
}

export function hashPassword(password: string, saltHex: string): string {
  const derived = scryptSync(password, Buffer.from(saltHex, "hex"), 64, SCRYPT);
  return `${saltHex}:${derived.toString("hex")}`;
}

// Compara siempre con timingSafeEqual (tiempo constante) y con la longitud
// fija del hash, para que ni el tiempo de respuesta ni la longitud de lo
// escrito filtren nada.
export function verifyPassword(password: string): boolean {
  const cfg = config();
  if (!cfg) return false;
  const [saltHex] = cfg.hash.split(":");
  const candidate = Buffer.from(hashPassword(password.slice(0, 256), saltHex));
  const expected = Buffer.from(cfg.hash);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function signingKey(cfg: { hash: string; secret: string }): Buffer {
  return createHmac("sha256", cfg.secret).update(cfg.hash).digest();
}

export function issueToken(): string | null {
  const cfg = config();
  if (!cfg) return null;
  const expires = Math.floor(Date.now() / 1000) + GATE_TTL_SECONDS;
  const sig = createHmac("sha256", signingKey(cfg)).update(String(expires)).digest("hex");
  return `${expires}.${sig}`;
}

export function verifyToken(token: string | undefined): boolean {
  const cfg = config();
  if (!cfg || !token) return false;
  const [expiresRaw, sig] = token.split(".");
  const expires = Number(expiresRaw);
  if (!sig || !Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", signingKey(cfg)).update(String(expires)).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const GATE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Robots-Tag": "noindex, nofollow",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};

export function loginPage(message?: string): string {
  const note = message ? `<p class="m">${message}</p>` : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Acceso</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1a1212;color:#f3ece4;font-family:system-ui,sans-serif}
form{display:flex;flex-direction:column;gap:12px;width:min(320px,86vw)}
h1{font-size:15px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin:0 0 4px}
input,button{font:inherit;padding:12px 14px;border-radius:6px;border:1px solid #4a3a38;background:#241a19;color:inherit}
button{background:#e8433a;border-color:#e8433a;font-weight:600;cursor:pointer}.m{color:#ff8a80;margin:0;font-size:14px}
</style></head><body><form method="POST" action="${GATE_PATH}" autocomplete="off">
<h1>Desafío Picota</h1>${note}
<input type="password" name="password" placeholder="Contraseña" required autofocus maxlength="256" autocomplete="current-password">
<button type="submit">Entrar</button></form></body></html>`;
}
