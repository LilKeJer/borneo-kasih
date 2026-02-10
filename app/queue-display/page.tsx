// app/queue-display/page.tsx
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DoctorQueueItem {
  id: number;
  queueNumber: number | null;
  status: string;
  reservationStatus: string;
  isPriority: boolean | null;
}

interface DoctorSessionQueue {
  doctorId: number | null;
  doctorName: string;
  sessionId: number | null;
  sessionName: string;
  queues: DoctorQueueItem[];
}

interface SimpleQueueItem {
  reservationId: number;
  queueNumber: number | null;
  doctorName: string | null;
  isPriority: boolean | null;
}

interface QueueDisplayData {
  doctorQueues: DoctorSessionQueue[];
  paymentQueues: SimpleQueueItem[];
  pharmacyQueues: SimpleQueueItem[];
}

export default function QueueDisplayPage() {
  const [queueData, setQueueData] = useState<QueueDisplayData>({
    doctorQueues: [],
    paymentQueues: [],
    pharmacyQueues: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchQueueData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/queue/display");
      if (!response.ok) {
        throw new Error("Failed to fetch queue data");
      }
      const data = await response.json();
      const responseData = data.data || {};
      setQueueData({
        doctorQueues: responseData.doctorQueues || [],
        paymentQueues: responseData.paymentQueues || [],
        pharmacyQueues: responseData.pharmacyQueues || [],
      });
      setLastUpdated(new Date());
      setError(null);
    } catch (error) {
      console.error("Error fetching queue data:", error);
      setError("Gagal memuat data antrian. Harap segarkan halaman.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();

    // Set interval for auto-refresh (every 30 seconds)
    const intervalId = setInterval(() => {
      fetchQueueData();
    }, 30000); // 30 seconds

    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Format time for last update
  const formatTime = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Check if current queue is being examined
  const isCurrentlyExamined = (status: string) => status === "In Progress";
  const hasNoQueues =
    queueData.doctorQueues.length === 0 &&
    queueData.paymentQueues.length === 0 &&
    queueData.pharmacyQueues.length === 0;

  const renderSimpleQueue = (
    title: string,
    items: SimpleQueueItem[],
    emptyText: string,
    statusLabel: string
  ) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-primary text-white p-4 text-center">
        <h3 className="text-2xl font-bold">{title}</h3>
      </div>
      <div className="p-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 text-left text-lg font-semibold">
                No. Antrian
              </th>
              <th className="py-3 text-left text-lg font-semibold">Dokter</th>
              <th className="py-3 text-right text-lg font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-500">
                  {emptyText}
                </td>
              </tr>
            ) : (
              items.map((queue) => (
                <tr
                  key={queue.reservationId}
                  className={cn(
                    "border-b border-gray-100",
                    queue.isPriority
                      ? "bg-red-50 animate-pulse border-l-4 border-l-red-500"
                      : ""
                  )}
                >
                  <td className="py-4 text-2xl font-bold">
                    {queue.queueNumber ?? "-"}
                    {queue.isPriority && (
                      <span className="ml-2 bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded-full">
                        DARURAT
                      </span>
                    )}
                  </td>
                  <td className="py-4 text-left text-lg">
                    {queue.doctorName || "Dokter"}
                  </td>
                  <td className="py-4 text-right">
                    <span className="inline-block rounded-full px-4 py-1 text-lg font-semibold bg-blue-100 text-blue-800">
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-md text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-1">
            ANTRIAN PASIEN
          </h1>
          <h2 className="text-xl md:text-2xl font-semibold mb-1">
            KLINIK BORNEO KASIH
          </h2>
          <p className="text-gray-600 mb-2">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-sm">
            Pembaruan Terakhir: {formatTime(lastUpdated)}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p>{error}</p>
          </div>
        )}

        {/* Queue Display */}
        {loading && hasNoQueues ? (
          <div className="bg-white rounded-lg p-6 text-center shadow-md">
            <p className="text-xl">Memuat data antrian...</p>
          </div>
        ) : hasNoQueues ? (
          <div className="bg-white rounded-lg p-8 text-center shadow-md">
            <p className="text-2xl font-semibold">
              Tidak ada antrian aktif saat ini
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">
                ANTRIAN DOKTER
              </h3>
              {queueData.doctorQueues.length === 0 ? (
                <div className="bg-white rounded-lg p-6 text-center shadow-md">
                  <p className="text-lg text-gray-600">
                    Tidak ada antrian dokter
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {queueData.doctorQueues.map((queueItem) => (
                    <div
                      key={`${queueItem.doctorId}-${queueItem.sessionId}`}
                      className="bg-white rounded-lg shadow-md overflow-hidden"
                    >
                      <div className="bg-primary text-white p-4">
                        <h3 className="text-2xl font-bold text-center">
                          {queueItem.doctorName}
                        </h3>
                        <div className="bg-primary-foreground text-primary mt-2 py-1 px-3 rounded-full text-center text-sm font-semibold inline-block">
                          Sesi: {queueItem.sessionName}
                        </div>
                      </div>
                      <div className="p-4">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="py-3 text-left text-lg font-semibold">
                                No. Antrian
                              </th>
                              <th className="py-3 text-right text-lg font-semibold">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {queueItem.queues.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={2}
                                  className="py-4 text-center text-gray-500"
                                >
                                  Tidak ada pasien dalam antrian
                                </td>
                              </tr>
                            ) : (
                              queueItem.queues
                                .filter(
                                  (queue) =>
                                    queue.reservationStatus !== "Cancelled"
                                )
                                .map((queue) => (
                                  <tr
                                    key={queue.id}
                                    className={cn(
                                      "border-b border-gray-100",
                                      isCurrentlyExamined(queue.status)
                                        ? "bg-green-50"
                                        : queue.isPriority
                                        ? "bg-red-50 animate-pulse border-l-4 border-l-red-500"
                                        : ""
                                    )}
                                  >
                                    <td className="py-4 text-2xl font-bold">
                                      {queue.queueNumber ?? "-"}
                                      {queue.isPriority && (
                                        <span className="ml-2 bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded-full">
                                          DARURAT
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-4 text-right">
                                      <span
                                        className={cn(
                                          "inline-block rounded-full px-4 py-1 text-lg font-semibold",
                                          isCurrentlyExamined(queue.status)
                                            ? "bg-green-100 text-green-800"
                                            : queue.isPriority
                                            ? "bg-red-100 text-red-800"
                                            : "bg-blue-100 text-blue-800"
                                        )}
                                      >
                                        {isCurrentlyExamined(queue.status)
                                          ? "Sedang Diperiksa"
                                          : "Menunggu"}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderSimpleQueue(
                "ANTRIAN PEMBAYARAN",
                queueData.paymentQueues,
                "Tidak ada antrian pembayaran",
                "Menunggu Pembayaran"
              )}
              {renderSimpleQueue(
                "ANTRIAN OBAT",
                queueData.pharmacyQueues,
                "Tidak ada antrian obat",
                "Menunggu Obat"
              )}
            </div>
          </div>
        )}

        {/* Footer information */}
        <div className="mt-6 text-center">
          <p className="text-lg text-gray-600">
            Tampilan ini diperbarui secara otomatis setiap 30 detik
          </p>
        </div>
      </div>
    </div>
  );
}
