"use client";

import { useCallback, useRef, useState } from "react";
import {
  DEFAULT_DEMO_ENCRYPTION_JWK,
  decryptData,
  encryptData,
  importEncryptionKey,
} from "@/lib/utils/encryption";

export function useEncryption() {
  const [isInitialized, setIsInitialized] = useState(false);
  const keyRef = useRef<CryptoKey | null>(null);
  const keyJwkRef = useRef<string | null>(null);
  const demoKeyRef = useRef<CryptoKey | null>(null);

  const getDemoKey = useCallback(async () => {
    if (!demoKeyRef.current) {
      demoKeyRef.current = await importEncryptionKey(
        DEFAULT_DEMO_ENCRYPTION_JWK
      );
    }

    return demoKeyRef.current;
  }, []);

  const initialize = useCallback(async () => {
    if (keyRef.current) {
      return keyRef.current;
    }

    if (typeof window === "undefined") {
      return null;
    }

    try {
      const storedKey =
        localStorage.getItem("encryptionKey") || DEFAULT_DEMO_ENCRYPTION_JWK;
      const importedKey = await importEncryptionKey(storedKey);

      keyRef.current = importedKey;
      keyJwkRef.current = storedKey;
      demoKeyRef.current = await getDemoKey();

      if (!localStorage.getItem("encryptionKey")) {
        localStorage.setItem("encryptionKey", DEFAULT_DEMO_ENCRYPTION_JWK);
      }

      setIsInitialized(true);
      return importedKey;
    } catch (error) {
      console.error("Error initializing encryption:", error);
      return null;
    }
  }, [getDemoKey]);

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

      try {
        return await decryptData(ciphertext, iv, activeKey);
      } catch (activeKeyError) {
        if (keyJwkRef.current === DEFAULT_DEMO_ENCRYPTION_JWK) {
          throw activeKeyError;
        }

        const demoKey = await getDemoKey();
        return await decryptData(ciphertext, iv, demoKey);
      }
    },
    [getDemoKey, initialize]
  );

  return {
    encrypt,
    decrypt,
    initialize,
    isInitialized,
  };
}
