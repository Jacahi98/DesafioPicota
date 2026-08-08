import type { NextConfig } from "next";

// script-src y style-src necesitan 'unsafe-inline'. Se probó primero con un
// hash SHA-256 solo para el <script> del detector de tema (el único inline
// que escribe este proyecto) — build limpio, pero en el navegador la app se
// quedaba muerta: Next.js inyecta ADEMÁS sus propios <script> inline internos
// (bootstrap del runtime, self.__next_r para el streaming de RSC...), no
// documentados ni estables entre builds, y el hash bloqueaba esos también,
// lanzando "InvariantError: Expected a request ID..." antes de que React
// llegara a hidratar nada — por eso el hero se quedaba con opacity:0 para
// siempre (la animación de Framer Motion nunca llegaba a ejecutarse).
// Un nonce sí cubriría los scripts propios de Next.js automáticamente, pero
// solo se inyecta en páginas de renderizado dinámico — esta web es
// enteramente estática (○ Static en el build) y pasar a dinámica para esto
// sería un paso atrás real de rendimiento, no solo una cuestión de CSP.
// Nota también: un hash y 'unsafe-inline' a la vez no suman seguridad — la
// especificación CSP dice que en cuanto hay un hash o nonce en la lista,
// 'unsafe-inline' se ignora en los navegadores que soportan hashes, así que
// combinarlos deja el comportamiento inconsistente entre navegadores en vez
// de más estricto. Mejor uno solo, con la cabeza clara sobre qué hace cada
// cual: 'unsafe-inline' en script-src permite inyectar <script>, el mismo
// motivo por el que no protege frente a XSS con inyección de script — pero
// esta web no tiene formularios, ni contenido de usuario, ni superficie de
// API alguna, así que ese vector concreto no aplica aquí. Lo que sí importa
// de verdad en este sitio (frame-ancestors, que corta el clickjacking) sigue
// intacto.
// Solo en desarrollo: React usa eval() para reconstruir el stack trace del
// servidor en el navegador cuando hay un error (facilita depurar). Nunca lo
// usa en producción, así que la CSP real desplegada no lo necesita — visto
// en la consola del propio navegador con el mensaje exacto: "eval() is not
// supported... React requires eval() in development mode".
const isDev = process.env.NODE_ENV === "development";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self';
  font-src 'self';
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  // frame-ancestors de la CSP ya cubre esto en navegadores modernos;
  // X-Frame-Options queda como red de seguridad en los que no soportan CSP3.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Ninguna de estas APIs se usa en la web — se desactivan explícitamente.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Cache moderada (no "immutable"): varios ficheros de /public se han
      // ido regenerando con el MISMO nombre a lo largo de este proyecto
      // (favicons, og-image, fotos) — una caché agresiva dejaría a algunos
      // visitantes con la versión vieja durante mucho tiempo tras una
      // actualización. 1 día de caché de navegador con revalidación reduce
      // descargas en visitas repetidas sin ese riesgo.
      {
        // path-to-regexp no soporta la sintaxis {a,b,c} de llaves para
        // extensiones (esa es sintaxis de glob, no de path-to-regexp) — hay
        // que usar un grupo de captura real (a|b|c). Con llaves la regla no
        // hacía match nunca y el Cache-Control seguía en max-age=0.
        source: "/:path*.(ico|png|jpg|jpeg|webp|svg)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
