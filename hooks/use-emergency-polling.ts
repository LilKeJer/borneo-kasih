// hooks/use-emergency-polling.ts
"use client";

import { useState, useEffect } from "react";

interface EmergencyPatient {
  id: string;
  patientName: string;
  queueNumber: number;
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

  useEffect(() => {
    const checkForEmergencies = async () => {
      try {
        const response = await fetch("/api/queue/emergency");
        if (!response.ok) throw new Error("Failed to fetch emergency cases");

        const data = await response.json();
        setEmergencyPatients(data.emergencyPatients || []);

        // Cek apakah ada kasus darurat baru sejak polling terakhir
        if (data.emergencyPatients && data.emergencyPatients.length > 0) {
          const newestEmergency = data.emergencyPatients[0];

          if (!lastEmergency || lastEmergency.id !== newestEmergency.id) {
            setLastEmergency(newestEmergency);
          }
        }
      } catch (error) {
        console.error("Error checking for emergencies:", error);
      } finally {
        setLoading(false);
      }
    };

    // Periksa segera saat mounted
    checkForEmergencies();

    // Set interval polling
    const intervalId = setInterval(checkForEmergencies, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  return {
    emergencyPatients,
    lastEmergency,
    loading,
    dismissLatest: () => setLastEmergency(null),
  };
}
