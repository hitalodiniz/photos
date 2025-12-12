
// src/lib/galeriaToken.ts
import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.GALERIA_TOKEN_SECRET ?? 'dev-secret-change-me';

type Payload = { gid: string; iat: number };

// Emite token "data.signature" using base64url
export function issueAccessToken(galeriaId: string): string {
  const payload: Payload = { gid: galeriaId, iat: Date.now() };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

// Verifica assinatura e se o token pertence à galeria
export function verifyAccessToken(token: string, galeriaId: string): boolean {
  if (!token || !token.includes('.')) return false;
  const [data, sig] = token.split('.');
  const expected = createHmac('sha256', SECRET).update(data).digest();
  const provided = Buffer.from(sig, 'base64url');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return false;

  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as Payload;
  return payload.gid === galeriaId;
}
