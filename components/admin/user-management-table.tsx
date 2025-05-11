import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
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
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontal,
  Search,
  Edit,
  Trash,
  UserPlus,
  Download,
  Filter,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  FileText,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { EditUserModal } from "./edit-user-modal";
import { DeleteUserModal } from "./delete-user-modal";
import { exportUsers } from "@/lib/utils/export";

// Tipe data untuk user
interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone?: string;
  // Field tambahan
  specialization?: string;
  nik?: string;
  dateOfBirth?: string;
  address?: string;
  gender?: string;
}

// Data dummy untuk tabel user
const dummyUsers = [
  {
    id: "1",
    username: "admin",
    name: "Admin Sistem",
    email: "admin@borneokasih.com",
    role: "Admin",
    status: "Active",
    phone: "081234567890",
  },
  {
    id: "2",
    username: "dokter",
    name: "Dr. Borneo",
    email: "dokter@borneokasih.com",
    role: "Doctor",
    status: "Active",
    phone: "081234567891",
    specialization: "Umum",
  },
  {
    id: "3",
    username: "budipatient",
    name: "Budi Santoso",
    email: "budi@example.com",
    role: "Patient",
    status: "Active",
    phone: "081234567892",
    nik: "3578112509830001",
    dateOfBirth: "1990-05-15",
    address: "Jl. Pahlawan No. 123, Banjarmasin",
    gender: "L",
  },
  {
    id: "4",
    username: "nurse1",
    name: "Siti Nuraini",
    email: "siti@borneokasih.com",
    role: "Nurse",
    status: "Active",
    phone: "081234567893",
  },
  {
    id: "5",
    username: "apoteker1",
    name: "Ahmad Farhan",
    email: "ahmad@borneokasih.com",
    role: "Pharmacist",
    status: "Active",
    phone: "081234567894",
  },
  {
    id: "6",
    username: "reception1",
    name: "Dewi Putri",
    email: "dewi@borneokasih.com",
    role: "Receptionist",
    status: "Inactive",
    phone: "081234567895",
  },
  {
    id: "7",
    username: "indrapatient",
    name: "Indra Wijaya",
    email: "indra@example.com",
    role: "Patient",
    status: "Pending",
    phone: "081234567896",
    nik: "3578112509830002",
    dateOfBirth: "1985-08-20",
    address: "Jl. Merdeka No. 45, Banjarmasin",
    gender: "L",
  },
];

export function UserManagementTable() {
  const [data, setData] = useState<User[]>(dummyUsers);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [rowSelection, setRowSelection] = useState({});

  // State untuk modal edit dan delete
  const [editUserData, setEditUserData] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Setup kolom tabel
  const columnHelper = createColumnHelper<User>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns = useMemo<ColumnDef<User, any>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
      },
      columnHelper.accessor("name", {
        header: "Nama",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor("username", {
        header: "Username",
      }),
      columnHelper.accessor("email", {
        header: "Email",
      }),
      columnHelper.accessor("role", {
        header: "Role",
        cell: (info) => {
          const role = info.getValue();
          let displayName = role;

          // Terjemahkan role ke bahasa Indonesia
          switch (role) {
            case "Doctor":
              displayName = "Dokter";
              break;
            case "Nurse":
              displayName = "Perawat";
              break;
            case "Pharmacist":
              displayName = "Apoteker";
              break;
            case "Receptionist":
              displayName = "Resepsionis";
              break;
            case "Patient":
              displayName = "Pasien";
              break;
            default:
              break;
          }

          return displayName;
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue();
          let variant = "default";
          let displayText = status;

          if (status === "Active") {
            variant = "secondary";
            displayText = "Aktif";
          } else if (status === "Inactive") {
            variant = "outline";
            displayText = "Tidak Aktif";
          } else if (status === "Pending") {
            variant = "destructive";
            displayText = "Menunggu";
          }

          return (
            <Badge
              variant={
                variant as
                  | "default"
                  | "destructive"
                  | "outline"
                  | "secondary"
                  | null
                  | undefined
              }
            >
              {displayText}
            </Badge>
          );
        },
      }),
      {
        id: "actions",
        header: "Aksi",
        cell: ({ row }) => {
          const user = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEdit(user)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>

                {user.role === "Patient" && (
                  <DropdownMenuItem
                    onClick={() => handleViewMedicalRecord(user)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Rekam Medis
                  </DropdownMenuItem>
                )}

                {user.role !== "Admin" && (
                  <DropdownMenuItem onClick={() => handleDelete(user)}>
                    <Trash className="mr-2 h-4 w-4" />
                    Hapus
                  </DropdownMenuItem>
                )}

                {user.status === "Pending" && (
                  <DropdownMenuItem onClick={() => handleVerify(user)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Verifikasi
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => handleRolePermissions(user)}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Izin Akses
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [columnHelper]
  );

  // Filter data berdasarkan role dan status
  const filteredData = useMemo(() => {
    return data.filter((user) => {
      const roleMatches =
        roleFilter.length === 0 || roleFilter.includes(user.role);
      const statusMatches =
        statusFilter.length === 0 || statusFilter.includes(user.status);
      return roleMatches && statusMatches;
    });
  }, [data, roleFilter, statusFilter]);

  // Setup table
  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Handlers
  const handleEdit = (user: User) => {
    setEditUserData(user);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = (updatedUser: User) => {
    // Update user in the data array
    setData((prevData) =>
      prevData.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );

    toast.success("Data pengguna berhasil diperbarui");
  };

  const handleDelete = (user: User) => {
    setDeleteUser(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteUser) return;

    // Delete user from data array
    setData((prevData) => prevData.filter((user) => user.id !== deleteUser.id));
    setIsDeleteModalOpen(false);

    toast.success(`Pengguna ${deleteUser.name} berhasil dihapus`);
  };

  const handleVerify = (user: User) => {
    // Update user status to Active
    setData((prevData) =>
      prevData.map((u) => (u.id === user.id ? { ...u, status: "Active" } : u))
    );

    toast.success(`Pengguna ${user.name} berhasil diverifikasi`);
  };

  const handleViewMedicalRecord = (user: User) => {
    toast.info(`Melihat rekam medis ${user.name}`);
    // Implementasi navigasi ke halaman rekam medis pasien
  };

  const handleRolePermissions = (user: User) => {
    toast.info(`Mengatur izin akses untuk ${user.name}`);
    // Implementasi pengaturan izin akses per pengguna
  };

  const handleBulkAction = (action: string) => {
    const selectedIds = Object.keys(rowSelection).map(
      (idx) => table.getRowModel().rows[parseInt(idx)].original.id
    );

    if (selectedIds.length === 0) return;

    // Perform bulk action based on the selected action
    if (action === "activate") {
      setData((prevData) =>
        prevData.map((user) =>
          selectedIds.includes(user.id) ? { ...user, status: "Active" } : user
        )
      );
      toast.success(`${selectedIds.length} pengguna berhasil diaktifkan`);
    } else if (action === "deactivate") {
      setData((prevData) =>
        prevData.map((user) =>
          selectedIds.includes(user.id) ? { ...user, status: "Inactive" } : user
        )
      );
      toast.success(`${selectedIds.length} pengguna berhasil dinonaktifkan`);
    } else if (action === "delete") {
      setData((prevData) =>
        prevData.filter((user) => !selectedIds.includes(user.id))
      );
      toast.success(`${selectedIds.length} pengguna berhasil dihapus`);
    }

    // Clear selection after action
    setRowSelection({});
  };

  const handleExport = (format: "csv" | "excel" = "excel") => {
    // Get selected users or all filtered users if none selected
    const selectedRows =
      Object.keys(rowSelection).length > 0
        ? Object.keys(rowSelection).map(
            (idx) => table.getRowModel().rows[parseInt(idx)].original
          )
        : filteredData;

    // Export the data
    exportUsers(selectedRows, format);

    toast.success(`Data pengguna berhasil diekspor ke ${format.toUpperCase()}`);
  };

  // Mendapatkan daftar unik role dan status untuk filter
  const uniqueRoles = [...new Set(data.map((user) => user.role))];
  const uniqueStatuses = [...new Set(data.map((user) => user.status))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari pengguna..."
            className="pl-8"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <div className="p-2">
                <p className="text-sm font-semibold mb-2">Role</p>
                {uniqueRoles.map((role) => (
                  <DropdownMenuCheckboxItem
                    key={role}
                    checked={roleFilter.includes(role)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setRoleFilter([...roleFilter, role]);
                      } else {
                        setRoleFilter(roleFilter.filter((r) => r !== role));
                      }
                    }}
                  >
                    {role}
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
              <DropdownMenuSeparator />
              <div className="p-2">
                <p className="text-sm font-semibold mb-2">Status</p>
                {uniqueStatuses.map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter.includes(status)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setStatusFilter([...statusFilter, status]);
                      } else {
                        setStatusFilter(
                          statusFilter.filter((s) => s !== status)
                        );
                      }
                    }}
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport("excel")}>
                Export ke Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>
                Export ke CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {Object.keys(rowSelection).length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default">
                <CheckSquare className="mr-2 h-4 w-4" />
                Aksi Masal ({Object.keys(rowSelection).length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => handleBulkAction("activate")}>
                Aktivasi
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleBulkAction("deactivate")}>
                Nonaktifkan
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleBulkAction("delete")}>
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={
                          header.column.getCanSort()
                            ? "cursor-pointer select-none flex items-center"
                            : ""
                        }
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: <ArrowUp className="ml-2 h-4 w-4" />,
                          desc: <ArrowDown className="ml-2 h-4 w-4" />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Tidak ada data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {Object.keys(rowSelection).length} dari{" "}
          {table.getFilteredRowModel().rows.length} baris dipilih.
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Sebelumnya
          </Button>
          <div className="text-sm font-medium">
            Halaman {table.getState().pagination.pageIndex + 1} dari{" "}
            {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Selanjutnya
          </Button>
        </div>
      </div>

      {/* Modal untuk edit user */}
      {editUserData && (
        <EditUserModal
          user={editUserData}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSave={handleSaveUser}
        />
      )}

      {/* Modal untuk konfirmasi hapus user */}
      {deleteUser && (
        <DeleteUserModal
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          onConfirm={confirmDelete}
          username={deleteUser.username}
        />
      )}
    </div>
  );
}
