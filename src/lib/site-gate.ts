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
    "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};

// Los dos logos de marca (claro/oscuro) son lo único, aparte del propio
// formulario, que se sirve sin contraseña: la pantalla de acceso los
// necesita para parecerse a la web. No contienen nada sensible.
export const GATE_PUBLIC_ASSETS = ["/logo-wordmark-light-sm.webp", "/logo-wordmark-dark-sm.webp"];

// Pantalla de acceso con el aspecto de la web: misma paleta (claro u oscuro
// según el sistema), el wordmark y las líneas de nivel de las dunas en
// movimiento. HTML plano sin JS: así no depende de nada que esté detrás de
// la contraseña (la tipografía de la web, por eso, se sustituye por la del
// sistema).
const WAVES = [
  "M-40,120 C120,60 260,180 440,90 C580,20 720,140 880,70",
  "M-40,200 C100,150 260,260 440,180 C600,110 740,220 880,160",
  "M-40,280 C90,240 250,330 440,270 C610,210 750,300 880,250",
  "M-40,360 C110,330 260,400 440,350 C600,300 760,380 880,340",
];

function wavesSvg(): string {
  const lines = WAVES.map(
    (d, i) =>
      `<g class="w w${i}"><path d="${d}"/><path d="${d}" transform="translate(880,0)"/></g>`
  ).join("");
  return `<svg viewBox="0 0 880 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${lines}</svg>`;
}

export function loginPage(message?: string): string {
  const note = message ? `<p class="m" role="alert">${message}</p>` : "";
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<meta name="color-scheme" content="light dark"><title>Acceso · Desafío Picota</title><style>
:root{--paper:#f4ddb8;--raised:#faecd4;--border:#dcb787;--ink:#4a1010;--dim:#7a3624;--pine:#621719;--pine-ink:#f4ddb8;--sea:#355c5e;--rose:#a9353a}
@media(prefers-color-scheme:dark){:root{--paper:#1c0f0c;--raised:#271713;--border:#3d2620;--ink:#f2e2c8;--dim:#d9b89a;--pine:#ef484d;--pine-ink:#1c0f0c;--sea:#57979b;--rose:#d16d71}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--paper);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden}
svg{position:fixed;inset:0;width:100%;height:100%;z-index:0}
.w path{fill:none;stroke:var(--rose);stroke-width:1}
.w0{opacity:.16;animation:s 24s linear infinite}.w1{opacity:.19;animation:s 29s linear infinite}.w2{opacity:.22;animation:s 34s linear infinite}.w3{opacity:.25;animation:s 39s linear infinite}
@keyframes s{to{transform:translateX(-880px)}}
@media(prefers-reduced-motion:reduce){.w{animation:none!important}}
main{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:14px;width:min(360px,88vw);text-align:center}
img{width:min(260px,70vw);height:auto;aspect-ratio:790/525}
.k{margin:4px 0 0;font:600 11px ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.22em;text-transform:uppercase;color:var(--sea)}
h1{margin:0 0 8px;font-size:26px;line-height:1.15;letter-spacing:-.01em}
form{display:flex;flex-direction:column;gap:12px;width:100%}
input,button{font:inherit;padding:12px 14px;border-radius:4px;border:1px solid var(--border);background:var(--raised);color:var(--ink);outline:none}
input:focus{border-color:var(--pine)}
button{background:var(--pine);border-color:var(--pine);color:var(--pine-ink);font-weight:600;cursor:pointer;transition:opacity .15s}
button:hover{opacity:.9}
.m{margin:0;color:var(--rose);font-size:14px}
</style></head><body>${wavesSvg()}<main>
<picture><source media="(prefers-color-scheme: dark)" srcset="/logo-wordmark-dark-sm.webp"><img src="/logo-wordmark-light-sm.webp" alt="Desafío Picota Speed Trail" width="260" height="173"></picture>
<p class="k">Liencres · Parque Natural de las Dunas</p>
<h1>¿Tienes ganas de trail? 🏃</h1>
<form method="POST" action="${GATE_PATH}" autocomplete="off">${note}
<input type="password" name="password" aria-label="Contraseña" required autofocus maxlength="256" autocomplete="current-password">
<button type="submit">Entrar</button></form></main></body></html>`;
}
