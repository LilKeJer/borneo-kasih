// lib/utils/export.ts
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Fungsi untuk terjemahkan role
function translateRole(role: string): string {
  switch (role) {
    case "Admin":
      return "Administrator";
    case "Doctor":
      return "Dokter";
    case "Nurse":
      return "Perawat";
    case "Pharmacist":
      return "Apoteker";
    case "Receptionist":
      return "Resepsionis";
    case "Patient":
      return "Pasien";
    default:
      return role;
  }
}

// Fungsi untuk terjemahkan status
function translateStatus(status: string): string {
  switch (status) {
    case "Active":
      return "Aktif";
    case "Inactive":
      return "Tidak Aktif";
    case "Pending":
      return "Menunggu";
    default:
      return status;
  }
}

// Export to CSV
export function exportToCSV(data: User[], filename: string) {
  // Format data with translated values
  const formattedData = data.map((user) => ({
    ID: user.id,
    Nama: user.name,
    Username: user.username,
    Email: user.email,
    "Nomor Telepon": user.phone || "",
    Role: translateRole(user.role),
    Status: translateStatus(user.status),
    ...(user.role === "Doctor" && { Spesialisasi: user.specialization || "" }),
    ...(user.role === "Patient" && {
      NIK: user.nik || "",
      "Tanggal Lahir": user.dateOfBirth || "",
      Alamat: user.address || "",
      "Jenis Kelamin":
        user.gender === "L"
          ? "Laki-laki"
          : user.gender === "P"
          ? "Perempuan"
          : "",
    }),
  }));

  // Get all possible headers
  const allKeys = Array.from(
    new Set(formattedData.flatMap((item) => Object.keys(item)))
  );

  // Convert data to CSV format
  const csvData = [
    allKeys.join(","),
    ...formattedData.map((item) =>
      allKeys
        .map((key) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const value = (item as any)[key] || "";
          // Quote values that contain commas
          return value.toString().includes(",") ? `"${value}"` : value;
        })
        .join(",")
    ),
  ].join("\n");

  // Create a Blob and download
  const blob = new Blob([csvData], {
    type: "text/csv;charset=utf-8;header=present",
  });
  saveAs(blob, `${filename}.csv`);
}

// Export to Excel
export function exportToExcel(data: User[], filename: string) {
  // Format data with translated values
  const formattedData = data.map((user) => ({
    ID: user.id,
    Nama: user.name,
    Username: user.username,
    Email: user.email,
    "Nomor Telepon": user.phone || "",
    Role: translateRole(user.role),
    Status: translateStatus(user.status),
    ...(user.role === "Doctor" && { Spesialisasi: user.specialization || "" }),
    ...(user.role === "Patient" && {
      NIK: user.nik || "",
      "Tanggal Lahir": user.dateOfBirth || "",
      Alamat: user.address || "",
      "Jenis Kelamin":
        user.gender === "L"
          ? "Laki-laki"
          : user.gender === "P"
          ? "Perempuan"
          : "",
    }),
  }));

  // Prepare worksheet
  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set column widths for better readability
  const colWidths = [
    { wch: 5 }, // ID
    { wch: 25 }, // Nama
    { wch: 15 }, // Username
    { wch: 25 }, // Email
    { wch: 15 }, // Nomor Telepon
    { wch: 12 }, // Role
    { wch: 10 }, // Status
    { wch: 20 }, // Spesialisasi / NIK
    { wch: 15 }, // Tanggal Lahir
    { wch: 30 }, // Alamat
    { wch: 12 }, // Jenis Kelamin
  ];
  worksheet["!cols"] = colWidths;

  // Create workbook and append worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

  // Generate Excel file and download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Main export function
export function exportUsers(data: User[], format: "csv" | "excel" = "excel") {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.]/g, "")
    .substring(0, 14);
  const filename = `users_export_${timestamp}`;

  if (format === "csv") {
    exportToCSV(data, filename);
  } else {
    exportToExcel(data, filename);
  }
}
