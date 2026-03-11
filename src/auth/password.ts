import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;

  const parts = stored.split('$');
  if (parts.length !== 3) return false;

  const [algo, saltB64, hashB64] = parts;
  if (algo !== 'scrypt') return false;

  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = scryptSync(password, salt, expected.length);

  return timingSafeEqual(expected, actual);
}
