// components/admin/visitors-chart.tsx
"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function VisitorsChart() {
  // Data dummy untuk jumlah pengunjung
  const data = [
    { day: "Senin", visitors: 35 },
    { day: "Selasa", visitors: 42 },
    { day: "Rabu", visitors: 38 },
    { day: "Kamis", visitors: 45 },
    { day: "Jumat", visitors: 40 },
    { day: "Sabtu", visitors: 28 },
    { day: "Minggu", visitors: 15 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kunjungan Mingguan</CardTitle>
        <CardDescription>
          Total kunjungan pasien dalam 7 hari terakhir
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="visitors"
                stroke="#4f46e5"
                strokeWidth={2}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
