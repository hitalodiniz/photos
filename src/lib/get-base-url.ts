/**
 * Retorna a base URL atual do ambiente, funcionando no client e no server.
 */
export function getBaseUrl(): string {
  // Client-side (navegador)
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Server-side (Next.js)
  // Produção Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Preview Vercel
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }

  // Localhost padrão
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}
