import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_PATH, ADMIN_PROXY_HEADER } from "@/lib/admin-auth";
import { GATE_COOKIE, GATE_HEADERS, GATE_PATH, gateConfigured, loginPage, verifyToken } from "@/lib/site-gate";

// Reescribe la ruta secreta (ADMIN_PATH_SECRET, solo en variables de
// entorno, nunca en el repo) hacia /panel, y marca la petición como
// "llegó por aquí" con una cabecera. panel/layout.tsx exige esa cabecera
// o devuelve 404 -- así una visita directa a /panel (adivinando el nombre
// desde el código público) no llega a ningún sitio.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // PUERTA DE CONTRASEÑA de toda la web (ver lib/site-gate.ts). Va la
  // primera y cubre TODO: páginas, imágenes, JS estático y APIs. Lo único
  // abierto es el propio formulario (/api/gate), que se protege solo.
  // Sin configurar en producción => cerrado (503), nunca abierto.
  if (pathname !== GATE_PATH) {
    const configured = gateConfigured();
    if (!configured && process.env.NODE_ENV === "production") {
      return new NextResponse("Servicio no disponible", { status: 503, headers: GATE_HEADERS });
    }
    if (configured && !verifyToken(request.cookies.get(GATE_COOKIE)?.value)) {
      // Peticiones que no son una página (APIs, imágenes, JS): 401 seco,
      // sin enseñar nada. Las páginas reciben el formulario.
      const wantsPage = request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
      return wantsPage
        ? new NextResponse(loginPage(), { status: 401, headers: { "Content-Type": "text/html; charset=utf-8", ...GATE_HEADERS } })
        : new NextResponse("No autorizado", { status: 401, headers: GATE_HEADERS });
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(ADMIN_PROXY_HEADER); // nunca fiarse de lo que mande el cliente

  if (ADMIN_PATH && pathname === `/${ADMIN_PATH}`) {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    requestHeaders.set(ADMIN_PROXY_HEADER, "1");
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  if (pathname === "/panel" || pathname.startsWith("/panel/")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
}

export const config = {
  matcher: ["/:path*"],
};
