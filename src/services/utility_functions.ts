import { createHash, timingSafeEqual } from 'crypto';

/**
 * Hash a pin using SHA-256.
 * @param pin - The user's pin.
 * @returns The hashed pin.
 */
export function hashPin(pin: string): string {
  const hash = createHash('sha256');
  hash.update(pin);
  return hash.digest('hex');
}

/**
 * Compare a pin with a stored hash.
 * @param pin - The user's pin.
 * @param hash - The stored hash.
 * @returns True if the pin matches the hash, false otherwise.
 */
export function comparePin(pin: string, hash: string): boolean {
  const hashedPin = hashPin(pin);
  // Use timingSafeEqual to prevent timing attacks
  const hashBuffer = Buffer.from(hash, 'hex');
  const hashedPinBuffer = Buffer.from(hashedPin, 'hex');
  return timingSafeEqual(hashBuffer, hashedPinBuffer);
}