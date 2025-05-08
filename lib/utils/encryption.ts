// lib/utils/encryption.ts
// Using Web Crypto API for secure client-side encryption

// Function to generate a random encryption key
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// Function to encrypt data
export async function encryptData(
  data: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  // Generate random initialization vector
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encode the data
  const encodedData = new TextEncoder().encode(data);

  // Encrypt the data
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encodedData
  );

  // Convert encrypted data to base64
  const ciphertext = btoa(
    String.fromCharCode(...new Uint8Array(encryptedData))
  );

  // Convert iv to base64
  const ivString = btoa(String.fromCharCode(...iv));

  return { ciphertext, iv: ivString };
}

// Function to decrypt data
export async function decryptData(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  // Convert base64 ciphertext to ArrayBuffer
  const encryptedData = Uint8Array.from(atob(ciphertext), (c) =>
    c.charCodeAt(0)
  );

  // Convert base64 iv to Uint8Array
  const ivArray = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));

  // Decrypt the data
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivArray,
    },
    key,
    encryptedData
  );

  // Decode the data
  return new TextDecoder().decode(decryptedData);
}

// Export public key for the server to securely send back the encryption key
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(exported);
}

// Import encryption key from JSON Web Key format
export async function importEncryptionKey(jwkKey: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkKey);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "AES-GCM",
    },
    true,
    ["encrypt", "decrypt"]
  );
}
