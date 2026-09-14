// Fuente unica de verdad: la version de package.json, inyectada en tiempo de
// build por next.config.ts (env.NEXT_PUBLIC_APP_VERSION). No escribir aqui el
// numero a mano: se desincronizaba con package.json en cada despliegue.
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
