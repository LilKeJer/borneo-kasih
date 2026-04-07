// lib/utils/encryption.ts
// Shared AES-GCM helpers for browser runtime and local seed/demo tooling.

export const DEFAULT_DEMO_ENCRYPTION_JWK = JSON.stringify({
  kty: "oct",
  k: "5ISc00Jk79k0y-4iTWChPsM6gMFRDh-T2bQV65wtIgQ",
  alg: "A256GCM",
  key_ops: ["encrypt", "decrypt"],
  ext: true,
});

function getCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API tidak tersedia");
  }

  return globalThis.crypto;
}

function toBase64(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

function fromBase64(value: string) {
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(value, "base64"));
  }

  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await getCrypto().subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(
  data: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const cryptoObject = getCrypto();
  const iv = cryptoObject.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(data);

  const encryptedData = await cryptoObject.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encodedData
  );

  return {
    ciphertext: toBase64(new Uint8Array(encryptedData)),
    iv: toBase64(iv),
  };
}

export async function decryptData(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const encryptedData = fromBase64(ciphertext);
  const ivArray = fromBase64(iv);

  const decryptedData = await getCrypto().subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivArray,
    },
    key,
    encryptedData
  );

  return new TextDecoder().decode(decryptedData);
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await getCrypto().subtle.exportKey("jwk", key);
  return JSON.stringify(exported);
}

export async function importEncryptionKey(jwkKey: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkKey) as JsonWebKey;

  return await getCrypto().subtle.importKey(
    "jwk",
    jwk,
    {
      name: "AES-GCM",
    },
    true,
    ["encrypt", "decrypt"]
  );
}
