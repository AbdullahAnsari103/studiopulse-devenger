import CryptoJS from "crypto-js";

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || "studio-pulse-default-encryption-key-change-me";

/**
 * Encrypt a plaintext token using AES encryption.
 * Used for storing access and refresh tokens securely in the database.
 */
export function encryptToken(token: string): string {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_SECRET).toString();
}

/**
 * Decrypt an AES-encrypted token back to plaintext.
 * Used for retrieving tokens from the database to make API calls.
 */
export function decryptToken(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
}
