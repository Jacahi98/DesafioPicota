import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_PATH, ADMIN_PROXY_HEADER } from "@/lib/admin-auth";

// Reescribe la ruta secreta (ADMIN_PATH_SECRET, solo en variables de
// entorno, nunca en el repo) hacia /panel, y marca la petición como
// "llegó por aquí" con una cabecera. panel/layout.tsx exige esa cabecera
// o devuelve 404 -- así una visita directa a /panel (adivinando el nombre
// desde el código público) no llega a ningún sitio.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
