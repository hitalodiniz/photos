/**
 * Retorna a base URL atual do ambiente, funcionando no client e no server.
 */
// lib/get-base-url.ts

export function getBaseUrl(): string {
  // Client-side
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Server-side (produção Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Server-side (preview Vercel)
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // Localhost
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    console.warn("Usando NEXT_PUBLIC_BASE_URL como fallback no server-side.");
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  return "http://localhost:3000";
}
