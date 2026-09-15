/**
 * Pilot admin auth (env credentials + signed httpOnly cookie).
 * Swap verifyPilotCredentials / session source later for APP_USERS + roles
 * without changing requireAdminSession call sites.
 */

export type AdminSession = {
  email: string;
  role: 'admin';
};

export const ADMIN_SESSION_COOKIE = 'dealerhub_admin_session';

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type SessionPayload = AdminSession & {
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('ADMIN_SESSION_SECRET is missing or too short');
  }
  return secret;
}

function bytesToBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < arr.length; i += 1) {
    binary += String.fromCharCode(arr[i]!);
  }
  const b64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const b64 = padded + pad;
  const binary =
    typeof atob === 'function'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signPayload(secret: string, payloadB64: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadB64)
  );
  return bytesToBase64Url(sig);
}

async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) {
    // still run a compare to reduce trivial timing leak on length
    const key = await importHmacKey('length-check-pad');
    const s1 = await crypto.subtle.sign('HMAC', key, aBytes);
    const s2 = await crypto.subtle.sign('HMAC', key, bBytes);
    void s1;
    void s2;
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i += 1) {
    diff |= aBytes[i]! ^ bBytes[i]!;
  }
  return diff === 0;
}

export async function verifyPilotCredentials(
  email: string,
  password: string
): Promise<boolean> {
  const expectedEmail = process.env.ADMIN_EMAIL;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) {
    return false;
  }
  const emailOk = await timingSafeEqualString(
    email.trim().toLowerCase(),
    expectedEmail.trim().toLowerCase()
  );
  const passwordOk = await timingSafeEqualString(password, expectedPassword);
  return emailOk && passwordOk;
}

export async function createAdminSession(
  identity: AdminSession
): Promise<string> {
  const secret = getSessionSecret();
  const payload: SessionPayload = {
    email: identity.email,
    role: 'admin',
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const sig = await signPayload(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function parseAndVerifySessionToken(
  token: string | undefined | null
): Promise<AdminSession | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return null;
  }

  const expected = await signPayload(secret, payloadB64);
  const sigOk = await timingSafeEqualString(sig, expected);
  if (!sigOk) return null;

  try {
    const json = new TextDecoder().decode(base64UrlToBytes(payloadB64));
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload?.email || payload.role !== 'admin') return null;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return { email: payload.email, role: 'admin' };
  } catch {
    return null;
  }
}

export function readSessionCookieValue(
  cookieHeader: string | null
): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (name === ADMIN_SESSION_COOKIE) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

/** Middleware-safe: validate from Cookie header string. */
export async function getAdminSessionFromRequest(
  request: Request
): Promise<AdminSession | null> {
  const token = readSessionCookieValue(request.headers.get('cookie'));
  return parseAndVerifySessionToken(token);
}

export async function requireAdminSession(
  request: Request
): Promise<AdminSession | null> {
  return getAdminSessionFromRequest(request);
}

export function buildSessionCookieOptions(maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure,
    maxAge: maxAgeSeconds,
  };
}

export function getSessionMaxAgeSeconds(): number {
  return Math.floor(SESSION_TTL_MS / 1000);
}

export function clearAdminSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === 'production';
  const securePart = secure ? '; Secure' : '';
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${securePart}`;
}

export async function createSessionSetCookieHeader(
  identity: AdminSession
): Promise<string> {
  const token = await createAdminSession(identity);
  const opts = buildSessionCookieOptions(getSessionMaxAgeSeconds());
  const securePart = opts.secure ? '; Secure' : '';
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=${opts.path}; HttpOnly; SameSite=Lax; Max-Age=${opts.maxAge}${securePart}`;
}