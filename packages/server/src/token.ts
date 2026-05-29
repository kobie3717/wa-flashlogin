import { createHmac, randomBytes } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateToken(length: number = 8): string {
  const bytes = randomBytes(Math.ceil((length * 5) / 8));
  let token = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      token += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    token += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return token.substring(0, length);
}

export function signToken(token: string, secret: string): string {
  return createHmac('sha256', secret).update(token).digest('hex');
}

export function verifyToken(token: string, signature: string, secret: string): boolean {
  const expectedSignature = signToken(token, secret);
  return signature === expectedSignature;
}

export function isValidBase32(token: string): boolean {
  return /^[A-Z2-7]+$/.test(token);
}
