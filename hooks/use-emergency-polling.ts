// hooks/use-emergency-polling.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface EmergencyPatient {
  id: number;
  patientName: string;
  queueNumber: number | null;
  examinationStatus?: string | null;
  isPriority: boolean;
  priorityReason?: string;
}

export function useEmergencyPolling(interval = 30000) {
  const [emergencyPatients, setEmergencyPatients] = useState<
    EmergencyPatient[]
  >([]);
  const [lastEmergency, setLastEmergency] = useState<EmergencyPatient | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const notifiedEmergencyIdsRef = useRef<Set<string>>(new Set());
  const visibleEmergencyIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkForEmergencies = async () => {
      try {
        const response = await fetch("/api/queue/emergency");
        if (!response.ok) throw new Error("Failed to fetch emergency cases");

        const data = await response.json();
        const activeEmergencies: EmergencyPatient[] = Array.isArray(
          data.emergencyPatients
        )
          ? data.emergencyPatients
          : [];

        if (!isMounted) {
          return;
        }

        setEmergencyPatients(activeEmergencies);

        const activeIds = new Set(
          activeEmergencies.map((patient) => String(patient.id))
        );

        for (const notifiedId of Array.from(
          notifiedEmergencyIdsRef.current
        )) {
          if (!activeIds.has(notifiedId)) {
            notifiedEmergencyIdsRef.current.delete(notifiedId);
          }
        }

        if (
          visibleEmergencyIdRef.current &&
          !activeIds.has(visibleEmergencyIdRef.current)
        ) {
          visibleEmergencyIdRef.current = null;
          setLastEmergency(null);
        }

        // Cek apakah ada kasus darurat baru sejak polling terakhir
        if (activeEmergencies.length > 0) {
          const newestEmergency = activeEmergencies[0];
          const newestEmergencyId = String(newestEmergency.id);

          if (!notifiedEmergencyIdsRef.current.has(newestEmergencyId)) {
            notifiedEmergencyIdsRef.current.add(newestEmergencyId);
            visibleEmergencyIdRef.current = newestEmergencyId;
            setLastEmergency(newestEmergency);
          }
        } else {
          visibleEmergencyIdRef.current = null;
          setLastEmergency(null);
        }
      } catch (error) {
        console.error("Error checking for emergencies:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Periksa segera saat mounted
    checkForEmergencies();

    // Set interval polling
    const intervalId = setInterval(checkForEmergencies, interval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [interval]);

  const dismissLatest = useCallback(() => {
    visibleEmergencyIdRef.current = null;
    setLastEmergency(null);
  }, []);

  return {
    emergencyPatients,
    lastEmergency,
    loading,
    dismissLatest,
  };
}
