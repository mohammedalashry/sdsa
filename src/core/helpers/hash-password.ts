import crypto from "crypto";

const ALGO = "pbkdf2_sha256";
const KEY_LEN = 32; // Django uses 32-byte derived key
const ITER = parseInt(process.env.DJANGO_PBKDF2_ITERATIONS ?? "720000", 10); // Django 5.0 default

function djangoSalt(len = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(len);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[bytes[i] % chars.length];
  return s;
}

export function encodeDjangoPBKDF2(
  password: string,
  salt = djangoSalt(),
  iterations = ITER,
): string {
  const dk = crypto.pbkdf2Sync(password, salt, iterations, KEY_LEN, "sha256");
  const hashB64 = dk.toString("base64");
  return `${ALGO}$${iterations}$${salt}$${hashB64}`;
}

export function verifyDjangoPBKDF2(password: string, encoded: string): boolean {
  const parts = encoded.split("$");
  if (parts.length !== 4) return false;
  const [algo, iterStr, salt, hashB64] = parts;
  if (algo !== ALGO) return false;

  const iterations = parseInt(iterStr, 10);
  const dk = crypto.pbkdf2Sync(password, salt, iterations, KEY_LEN, "sha256");
  const a = Buffer.from(dk); // computed bytes
  const b = Buffer.from(hashB64, "base64"); // stored bytes
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Optional: detect if stored hash needs upgrade to current ITER value */
export function needsUpgrade(encoded: string): boolean {
  const [algo, iterStr] = encoded.split("$");
  return algo === ALGO && parseInt(iterStr, 10) !== ITER;
}
