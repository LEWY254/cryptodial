import { createHash, timingSafeEqual } from 'crypto';
import axios from 'axios';

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

/**
 * Converts a blockchain amount to the local currency based on the country code.
 * @param countryCode - The country code (e.g., 'US' for the United States).
 * @param blockchainId - The blockchain identifier (e.g., 'etn' for Ethereum).
 * @param blockchainAmount - The amount in the blockchain.
 * @returns The amount in the local currency.
 */
export async function convertToLocalCurrency(
  countryCode: string,
  blockchainId: string,
  blockchainAmount: number
): Promise<number> {
  try {
    // Fetch the exchange rate for the blockchain to USD
    const blockchainResponse = await axios.get(`https://api.ankr.com/v1/blockchain/${blockchainId}/usd`);
    const blockchainToUsdRate = blockchainResponse.data.rate;

    // Fetch the exchange rate for USD to the local currency
    const currencyResponse = await axios.get(`https://api.exchangerate-api.com/v4/latest/USD`);
    const usdToLocalRate = currencyResponse.data.rates[countryCode];

    if (!blockchainToUsdRate || !usdToLocalRate) {
      throw new Error('Unable to fetch exchange rates.');
    }

    // Convert the blockchain amount to USD
    const amountInUsd = blockchainAmount * blockchainToUsdRate;

    // Convert the amount from USD to the local currency
    const amountInLocalCurrency = amountInUsd * usdToLocalRate;

    return amountInLocalCurrency;
  } catch (error) {
    console.error('Error converting to local currency:', error);
    throw new Error('Conversion failed.');
  }
}