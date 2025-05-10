// components/admin/doctor-management-table.tsx
"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Search, Edit, Trash, Calendar } from "lucide-react";

// Data dummy untuk dokter
const dummyDoctors = [
  {
    id: "1",
    name: "Dr. Borneo",
    specialization: "Umum",
    email: "dokter@borneokasih.com",
    phone: "08123456790",
    status: "Active",
    schedule: ["Senin (Pagi)", "Rabu (Pagi)", "Jumat (Malam)"],
  },
  {
    id: "2",
    name: "Dr. Siti Aisyah",
    specialization: "Anak",
    email: "siti@borneokasih.com",
    phone: "08567891234",
    status: "Active",
    schedule: ["Selasa (Pagi)", "Kamis (Pagi)", "Sabtu (Pagi)"],
  },
  {
    id: "3",
    name: "Dr. Ahmad Jailani",
    specialization: "Penyakit Dalam",
    email: "ahmad@borneokasih.com",
    phone: "08123987456",
    status: "Active",
    schedule: ["Senin (Malam)", "Rabu (Malam)", "Jumat (Pagi)"],
  },
  {
    id: "4",
    name: "Dr. Putri Handayani",
    specialization: "Kandungan",
    email: "putri@borneokasih.com",
    phone: "08789456123",
    status: "Active",
    schedule: ["Selasa (Malam)", "Kamis (Malam)", "Sabtu (Malam)"],
  },
  {
    id: "5",
    name: "Dr. Budi Santoso",
    specialization: "Umum",
    email: "budi@borneokasih.com",
    phone: "08234567890",
    status: "Inactive",
    schedule: [],
  },
];

export function DoctorManagementTable() {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter dokter berdasarkan pencarian
  const filteredDoctors = dummyDoctors.filter(
    (doctor) =>
      doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari dokter..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Spesialisasi</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Jadwal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDoctors.map((doctor) => (
              <TableRow key={doctor.id}>
                <TableCell className="font-medium">{doctor.name}</TableCell>
                <TableCell>{doctor.specialization}</TableCell>
                <TableCell>{doctor.email}</TableCell>
                <TableCell>{doctor.phone}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {doctor.schedule.length > 0 ? (
                      doctor.schedule.map((schedule, index) => (
                        <Badge key={index} variant="outline">
                          {schedule}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Tidak ada jadwal
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      doctor.status === "Active" ? "secondary" : "outline"
                    }
                  >
                    {doctor.status === "Active" ? "Aktif" : "Tidak Aktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Trash className="mr-2 h-4 w-4" />
                        Hapus
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Calendar className="mr-2 h-4 w-4" />
                        Kelola Jadwal
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button variant="outline" size="sm" disabled>
          Sebelumnya
        </Button>
        <Button variant="outline" size="sm">
          Selanjutnya
        </Button>
      </div>
    </div>
  );
}
