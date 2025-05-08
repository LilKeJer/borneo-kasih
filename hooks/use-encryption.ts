// hooks/use-encryption.ts
"use client";

import { useState, useCallback } from "react";
import {
  generateEncryptionKey,
  encryptData,
  decryptData,
  exportPublicKey,
  importEncryptionKey,
} from "@/lib/utils/encryption";

export function useEncryption() {
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const initialize = useCallback(async () => {
    if (!key && typeof window !== "undefined") {
      try {
        // Check if we have a stored key in localStorage
        const storedKey = localStorage.getItem("encryptionKey");

        if (storedKey) {
          // Import the stored key
          const importedKey = await importEncryptionKey(storedKey);
          setKey(importedKey);
        } else {
          // Generate a new key
          const newKey = await generateEncryptionKey();

          // Export the key to JWK format and store it
          const exportedKey = await exportPublicKey(newKey);
          localStorage.setItem("encryptionKey", exportedKey);

          setKey(newKey);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Error initializing encryption:", error);
      }
    }
  }, [key]);

  const encrypt = useCallback(
    async (data: string) => {
      if (!key) {
        await initialize();
      }

      if (!key) {
        throw new Error("Encryption key not initialized");
      }

      return await encryptData(data, key);
    },
    [key, initialize]
  );

  const decrypt = useCallback(
    async (ciphertext: string, iv: string) => {
      if (!key) {
        await initialize();
      }

      if (!key) {
        throw new Error("Encryption key not initialized");
      }

      return await decryptData(ciphertext, iv, key);
    },
    [key, initialize]
  );

  return {
    encrypt,
    decrypt,
    initialize,
    isInitialized,
  };
}
