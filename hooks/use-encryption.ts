// hooks/use-encryption.ts
"use client";

import { useState, useCallback, useRef } from "react";
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
  const keyRef = useRef<CryptoKey | null>(null);

  const initialize = useCallback(async () => {
    if (keyRef.current) {
      return keyRef.current;
    }

    if (typeof window === "undefined") {
      return null;
    }

    try {
      // Check if we have a stored key in localStorage
      const storedKey = localStorage.getItem("encryptionKey");

      if (storedKey) {
        // Import the stored key
        const importedKey = await importEncryptionKey(storedKey);
        keyRef.current = importedKey;
        setKey(importedKey);
      } else {
        // Generate a new key
        const newKey = await generateEncryptionKey();

        // Export the key to JWK format and store it
        const exportedKey = await exportPublicKey(newKey);
        localStorage.setItem("encryptionKey", exportedKey);

        keyRef.current = newKey;
        setKey(newKey);
      }

      setIsInitialized(true);
      return keyRef.current;
    } catch (error) {
      console.error("Error initializing encryption:", error);
      return null;
    }
  }, []);

  const encrypt = useCallback(
    async (data: string) => {
      const activeKey = keyRef.current ?? (await initialize());
      if (!activeKey) {
        throw new Error("Encryption key not initialized");
      }

      return await encryptData(data, activeKey);
    },
    [initialize]
  );

  const decrypt = useCallback(
    async (ciphertext: string, iv: string) => {
      const activeKey = keyRef.current ?? (await initialize());
      if (!activeKey) {
        throw new Error("Encryption key not initialized");
      }

      return await decryptData(ciphertext, iv, activeKey);
    },
    [initialize]
  );

  return {
    encrypt,
    decrypt,
    initialize,
    isInitialized,
  };
}
