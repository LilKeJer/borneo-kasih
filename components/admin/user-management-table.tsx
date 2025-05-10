// components/admin/user-management-table.tsx
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
import { MoreHorizontal, Search, Edit, Trash, UserPlus } from "lucide-react";

// Data dummy untuk tabel user
const dummyUsers = [
  {
    id: "1",
    username: "admin",
    name: "Admin Sistem",
    email: "admin@borneokasih.com",
    role: "Admin",
    status: "Active",
  },
  {
    id: "2",
    username: "dokter",
    name: "Dr. Borneo",
    email: "dokter@borneokasih.com",
    role: "Doctor",
    status: "Active",
  },
  {
    id: "3",
    username: "budipatient",
    name: "Budi Santoso",
    email: "budi@example.com",
    role: "Patient",
    status: "Active",
  },
  {
    id: "4",
    username: "nurse1",
    name: "Siti Nuraini",
    email: "siti@borneokasih.com",
    role: "Nurse",
    status: "Active",
  },
  {
    id: "5",
    username: "apoteker1",
    name: "Ahmad Farhan",
    email: "ahmad@borneokasih.com",
    role: "Pharmacist",
    status: "Active",
  },
  {
    id: "6",
    username: "reception1",
    name: "Dewi Putri",
    email: "dewi@borneokasih.com",
    role: "Receptionist",
    status: "Inactive",
  },
  {
    id: "7",
    username: "indrapatient",
    name: "Indra Wijaya",
    email: "indra@example.com",
    role: "Patient",
    status: "Pending",
  },
];

export function UserManagementTable() {
  const [searchTerm, setSearchTerm] = useState("");

  // Filter users berdasarkan pencarian
  const filteredUsers = dummyUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fungsi untuk mendapatkan warna badge berdasarkan status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Active":
        return "secondary";
      case "Inactive":
        return "outline";
      case "Pending":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari pengguna..."
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
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(user.status)}>
                    {user.status}
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
                      {user.status === "Pending" && (
                        <DropdownMenuItem>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Verifikasi
                        </DropdownMenuItem>
                      )}
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
