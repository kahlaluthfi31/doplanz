import crypto from 'crypto';
import { verify } from 'otplib';

const PENDING_AUTH_TTL_MS = 5 * 60 * 1000;

export async function verifyTotpCode(secret, code) {
  if (!secret || !code) return false;
  const result = await verify({ token: String(code).trim(), secret });
  return result.valid;
}

export function hashPendingToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function issuePendingAuth(settings) {
  const pendingToken = crypto.randomBytes(32).toString('hex');
  settings.pendingAuthToken = hashPendingToken(pendingToken);
  settings.pendingAuthExpires = new Date(Date.now() + PENDING_AUTH_TTL_MS);
  await settings.save();
  return pendingToken;
}

export function isPendingAuthValid(settings, pendingToken) {
  if (!settings?.pendingAuthToken || !settings?.pendingAuthExpires || !pendingToken) {
    return false;
  }
  if (new Date() > settings.pendingAuthExpires) return false;
  return settings.pendingAuthToken === hashPendingToken(pendingToken);
}

export async function clearPendingAuth(settings) {
  settings.pendingAuthToken = null;
  settings.pendingAuthExpires = null;
  await settings.save();
}
