# Dokumen Alur Blackbox Testing
## Project: Web Rekam Medis Klinik (berbasis data seed)

Dokumen ini disusun dari analisis UI + API + seed data pada project `rekam-medis-klinik`, agar bisa langsung dipakai sebagai panduan blackbox testing manual.

## 1. Tujuan
- Menyediakan alur test blackbox end-to-end lintas role.
- Memvalidasi perilaku sistem berdasarkan data seed default.
- Menyediakan checklist yang bisa dipakai berulang untuk regresi.

## 2. Cakupan Sistem
- Autentikasi dan otorisasi role.
- Alur pasien: appointment, check-in, rekam medis, resep, pembayaran.
- Alur operasional klinik: resepsionis, perawat, dokter, farmasi.
- Master data admin: pasien pending, staff, layanan, jadwal, setting klinik.
- Queue display publik.

## 3. Definisi Waktu Seed
Karena `db/seed.ts` membuat data relatif terhadap waktu eksekusi, gunakan notasi:
- `T0` = tanggal saat menjalankan `npm run db:reset:seed`.
- `T-1` = satu hari sebelum `T0`.
- `T+1` = satu hari setelah `T0`.

Catatan:
- Jika pengujian dilakukan dekat pergantian hari, rerun seed untuk menghindari mismatch tanggal.

## 4. Persiapan Uji
1. Pastikan `.env` sudah berisi `DATABASE_URL` valid.
2. Jalankan:
```bash
npm run db:reset:seed
```
3. Jalankan aplikasi:
```bash
npm run dev
```
4. Buka `http://localhost:3000`.

## 5. Akun Seed dan Data Baseline
### 5.1 Akun login
Semua password akun: `test12345`.

| Username | Role | Status | Ekspektasi Login |
|---|---|---|---|
| admin | Admin | Active | Bisa login |
| doctor | Doctor | Active | Bisa login |
| nurse | Nurse | Active | Bisa login |
| receptionist | Receptionist | Active | Bisa login |
| pharmacist | Pharmacist | Active | Bisa login |
| patient1 | Patient | Verified | Bisa login |
| patient2 | Patient | Verified | Bisa login |
| patient3 | Patient | Verified | Bisa login |
| patient_pending | Patient | Pending | Tidak bisa login |

### 5.2 Baseline operasional dari seed
- Total user aktif (tidak soft-delete): 9.
- Pasien total: 4 (`patient1`, `patient2`, `patient3`, `patient_pending`).
- Reservasi utama:
  - `T0`: queue 1 (Waiting, priority), queue 2 (In Progress), queue 3 (Waiting for Payment), queue 4 (Completed).
  - `T+1`: 1 reservasi pending.
  - `T-1`: 1 reservasi completed.
- Resep:
  - 1 resep `Unpaid + Pending`.
  - 1 resep `Paid + Pending`.
  - 1 resep `Paid + Dispensed`.
- Pembayaran:
  - 1 pembayaran di `T0`.
  - 1 pembayaran di `T-1`.
- Stok obat:
  - 1 item low stock (Vitamin C).
  - 1 batch mendekati expired (sekitar +30 hari).
  - 1 batch sudah expired (sekitar -5 hari).

### 5.3 Baseline angka dashboard (tepat setelah seed, sebelum aksi uji)
| Dashboard | Nilai baseline |
|---|---|
| Admin: total users | 9 |
| Admin: patients today | 3 |
| Admin: active queues | 2 |
| Receptionist: appointments today | 4 |
| Receptionist: waiting for doctor | 2 |
| Receptionist: waiting for payment | 1 |
| Receptionist: total patients | 4 |
| Nurse: patients today | 4 |
| Nurse: waiting for checkup | 1 |
| Nurse: checkups today | 2 |
| Doctor: total patients today | 4 |
| Doctor: patients seen | 2 |
| Doctor: patients remaining | 2 |
| Doctor: prescriptions today | 2 |
| Doctor: ready for pickup | 1 |
| Pharmacist: pending prescriptions | 2 |
| Pharmacist: ready for pickup | 1 |
| Pharmacist: medicine inventory count | 3 |
| Pharmacist: transactions today | 1 |
| Pharmacist: total sales today | 248000 |

## 6. State Transition yang Harus Divalidasi
### 6.1 Reservation
- Booking pasien: `Pending + Waiting`.
- Check-in: `Confirmed + Waiting`.
- Mulai pemeriksaan: `Confirmed + In Progress`.
- Selesai pemeriksaan tanpa pembayaran: `Confirmed + Waiting for Payment`.
- Pembayaran sukses: `Completed + Completed`.
- Cancel appointment (sebelum check-in): `Cancelled + Cancelled`.

### 6.2 Prescription
- Setelah dibuat dokter: `Unpaid + Pending`.
- Setelah pembayaran: `Paid + Pending`.
- Setelah dispense farmasi: `Paid + Dispensed`.

## 7. Strategi Eksekusi Test
- Suite A (read-only): login, dashboard, tampilan data.
- Suite B (mutasi operasional): check-in, queue status, medical record, payment, dispense.
- Suite C (master data admin): pasien pending, staff, layanan, jadwal, settings.
- Rekomendasi: `db:reset:seed` sebelum tiap suite mutasi besar.

## 8. Checklist Test Case Blackbox
## A. Auth dan Role
### AUTH-01 Login semua role aktif
- Langkah:
1. Login bergantian dengan `admin`, `doctor`, `nurse`, `receptionist`, `pharmacist`, `patient1`.
- Ekspektasi:
- Masing-masing diarahkan ke dashboard role yang sesuai.

### AUTH-02 Pending patient tidak bisa login
- Langkah:
1. Login dengan `patient_pending / test12345`.
- Ekspektasi:
- Login gagal.
- User tidak mendapat akses dashboard pasien.

### AUTH-03 Password salah
- Langkah:
1. Login `admin` dengan password salah.
- Ekspektasi:
- Login gagal, tetap di halaman login.

### AUTH-04 Route protection lintas role
- Langkah:
1. Login sebagai `doctor`.
2. Akses URL `/dashboard/admin`.
- Ekspektasi:
- Di-redirect ke `/dashboard/doctor`.

## B. Pasien
### PAT-01 Dashboard pasien tampil data seed
- Prekondisi: login `patient1`.
- Langkah:
1. Buka dashboard pasien.
- Ekspektasi:
- Ada kartu status appointment hari ini.
- Ada info kunjungan terakhir.

### PAT-02 Lihat daftar appointment
- Prekondisi: login `patient1`.
- Langkah:
1. Buka `/dashboard/patient/appointments`.
- Ekspektasi:
- Muncul appointment `T0`, `T+1`, dan histori sesuai seed.

### PAT-03 Buat appointment baru
- Prekondisi: login `patient1`.
- Langkah:
1. Buat appointment baru (pilih dokter, tanggal valid <= 30 hari, slot).
- Ekspektasi:
- Sukses, muncul nomor antrian baru.
- Data masuk daftar appointment.

### PAT-04 Cancel appointment pending
- Prekondisi: punya appointment status `Pending`.
- Langkah:
1. Klik batal pada appointment pending.
- Ekspektasi:
- Status jadi `Cancelled`.
- Tidak bisa di-cancel ulang.

### PAT-05 Reschedule appointment pending
- Prekondisi: punya appointment status `Pending`.
- Langkah:
1. Ubah jadwal ke tanggal/slot lain.
- Ekspektasi:
- Sukses.
- Queue number berubah mengikuti slot baru.

### PAT-06 Check-in dari detail appointment
- Prekondisi: appointment status `Pending` atau `Confirmed`.
- Langkah:
1. Buka detail appointment.
2. Klik check-in.
- Ekspektasi:
- Status pemeriksaan jadi `Waiting`.

### PAT-07 Lihat riwayat rekam medis
- Prekondisi: login `patient1`.
- Langkah:
1. Buka `/dashboard/patient/medical-records`.
2. Buka salah satu detail record.
- Ekspektasi:
- Diagnosa/description/treatment tampil (dekripsi berhasil di client).

### PAT-08 Lihat resep pasien
- Prekondisi: login `patient1` atau `patient3`.
- Langkah:
1. Buka `/dashboard/patient/prescriptions`.
- Ekspektasi:
- Data resep tampil per kunjungan.
- Dosis/frekuensi/durasi tampil.

### PAT-09 Lihat histori pembayaran
- Prekondisi: login `patient1`.
- Langkah:
1. Buka `/dashboard/patient/payments`.
2. Buka detail pembayaran.
- Ekspektasi:
- Ringkasan payment dan item detail tampil.

## C. Resepsionis dan Queue
### REC-01 Lihat queue harian per dokter
- Prekondisi: login `receptionist`.
- Langkah:
1. Buka `/dashboard/receptionist/queue`.
- Ekspektasi:
- Queue terkelompok per dokter.
- Status Waiting/In Progress tampil.

### REC-02 Check-in pasien via queue
- Prekondisi: ada reservasi `Pending/Confirmed`.
- Langkah:
1. Lakukan check-in dari tombol/ID reservasi.
- Ekspektasi:
- Sukses, status menjadi `Waiting`.

### REC-03 Update status Waiting -> In Progress
- Prekondisi: ada pasien status `Waiting`.
- Langkah:
1. Klik `Mulai Periksa`.
- Ekspektasi:
- Status jadi `In Progress`.

### REC-04 Update status In Progress -> Completed
- Prekondisi: ada pasien `In Progress`, belum ada payment.
- Langkah:
1. Klik `Selesai`.
- Ekspektasi:
- Status pemeriksaan berubah ke `Waiting for Payment`.
- Status reservasi tetap `Confirmed`.

### REC-05 Tandai prioritas darurat
- Prekondisi: ada pasien waiting non-priority.
- Langkah:
1. Aktifkan priority + isi alasan.
- Ekspektasi:
- Pasien menjadi priority.
- Nomor antrian dipindah ke urutan awal.

### REC-06 Registrasi walk-in
- Prekondisi: login `receptionist`.
- Langkah:
1. Buka menu walk-in.
2. Pilih pasien + dokter tersedia.
3. Submit.
- Ekspektasi:
- Reservasi baru dibuat dengan status `Confirmed + Waiting`.

### REC-07 Buat pembayaran dari reservation
- Prekondisi: pilih reservasi `Waiting for Payment`.
- Langkah:
1. Buka `Create Payment`.
2. Tambah item layanan/resep valid.
3. Submit pembayaran.
- Ekspektasi:
- Payment sukses.
- Reservasi jadi `Completed + Completed`.
- Jika ada resep, paymentStatus resep jadi `Paid`.

### REC-08 Cegah pembayaran duplikat
- Prekondisi: reservasi sudah punya payment.
- Langkah:
1. Coba create payment lagi untuk reservasi yang sama.
- Ekspektasi:
- Ditolak dengan pesan bahwa reservasi sudah memiliki pembayaran.

## D. Perawat
### NUR-01 Dashboard perawat baseline
- Prekondisi: login `nurse`.
- Langkah:
1. Buka dashboard perawat.
- Ekspektasi:
- Angka baseline sesuai tabel (sebelum data dimodifikasi).

### NUR-02 Daftar pasien untuk checkup
- Prekondisi: login `nurse`.
- Langkah:
1. Buka `/dashboard/nurse/patients`.
- Ekspektasi:
- Menampilkan antrean Waiting/Not Started di tanggal terpilih.

### NUR-03 Simpan catatan perawat
- Prekondisi: pilih pasien antrian aktif.
- Langkah:
1. Buka dialog catatan.
2. Isi catatan.
3. Simpan.
- Ekspektasi:
- Catatan tersimpan.
- Indikator `Sudah Dicatat` muncul.

### NUR-04 Update catatan perawat
- Prekondisi: catatan perawat sudah ada.
- Langkah:
1. Edit catatan yang sama.
2. Simpan ulang.
- Ekspektasi:
- Catatan terupdate, timestamp terbaru.

### NUR-05 Riwayat checkup perawat
- Prekondisi: ada catatan perawat.
- Langkah:
1. Buka `/dashboard/nurse/medical-records`.
2. Buka detail record.
- Ekspektasi:
- Catatan tampil sesuai data tersimpan.

## E. Dokter
### DOC-01 Dashboard dokter baseline
- Prekondisi: login `doctor`.
- Langkah:
1. Buka dashboard dokter.
- Ekspektasi:
- Angka baseline sesuai tabel.
- Current queue menunjukkan pasien in-progress.

### DOC-02 Queue dokter
- Prekondisi: login `doctor`.
- Langkah:
1. Buka `/dashboard/doctor/queue`.
- Ekspektasi:
- Current patient dan waiting list tampil.

### DOC-03 Mulai pemeriksaan dari waiting
- Prekondisi: ada pasien `Waiting`.
- Langkah:
1. Klik `Mulai Periksa`.
- Ekspektasi:
- Status berubah ke `In Progress`.

### DOC-04 Simpan rekam medis tanpa resep
- Prekondisi: buka form create medical record.
- Langkah:
1. Isi diagnosis/description/treatment.
2. Tambahkan layanan saja.
3. Submit.
- Ekspektasi:
- Rekam medis tersimpan.
- Reservasi menuju `Waiting for Payment` (jika belum completed).

### DOC-05 Simpan rekam medis dengan resep valid
- Prekondisi: stok obat mencukupi.
- Langkah:
1. Tambah obat dengan quantity valid.
2. Submit.
- Ekspektasi:
- Rekam medis + resep tersimpan.
- Resep status awal `Unpaid + Pending`.

### DOC-06 Validasi stok resep tidak cukup
- Prekondisi: isi quantity jauh di atas stok.
- Langkah:
1. Submit form resep.
- Ekspektasi:
- Ditolak dengan pesan stok tidak mencukupi.

## F. Farmasi
### PHA-01 Dashboard farmasi baseline
- Prekondisi: login `pharmacist`.
- Langkah:
1. Buka dashboard farmasi.
- Ekspektasi:
- Pending prescription dan ready for pickup sesuai baseline.

### PHA-02 Daftar resep
- Prekondisi: login `pharmacist`.
- Langkah:
1. Buka `/dashboard/pharmacist/prescription`.
- Ekspektasi:
- Resep berbayar dan belum berbayar terpisah statusnya.

### PHA-03 Dispense resep berstatus Paid
- Prekondisi: ada resep `Paid + Pending`.
- Langkah:
1. Buka detail resep.
2. Klik serahkan obat.
- Ekspektasi:
- Sukses.
- Resep berubah `Dispensed`.

### PHA-04 Blok dispense resep Unpaid
- Prekondisi: ada resep `Unpaid + Pending`.
- Langkah:
1. Coba dispense.
- Ekspektasi:
- Ditolak karena pembayaran belum lunas.

### PHA-05 Inventory low stock dan expiring
- Prekondisi: login `pharmacist`.
- Langkah:
1. Buka inventory filter `low_stock`.
2. Buka filter `expiring`.
- Ekspektasi:
- Vitamin C muncul sebagai low stock.
- Batch yang mendekati expired muncul di daftar expiring.

### PHA-06 Tambah batch stok
- Prekondisi: login `pharmacist`.
- Langkah:
1. Tambah batch baru dengan expiry > hari ini.
- Ekspektasi:
- Berhasil menambah stock.
- Total stock obat bertambah.

### PHA-07 Cegah batch number duplikat
- Prekondisi: gunakan batch number yang sudah ada.
- Langkah:
1. Submit tambah stok.
- Ekspektasi:
- Ditolak dengan pesan batch number sudah ada.

## G. Admin dan Master Data
### ADM-01 Dashboard admin baseline
- Prekondisi: login `admin`.
- Langkah:
1. Buka dashboard admin.
- Ekspektasi:
- Total user, pasien hari ini, active queue sesuai baseline.

### ADM-02 Pending patient list
- Prekondisi: login `admin`.
- Langkah:
1. Buka tab pasien pending.
- Ekspektasi:
- `patient_pending` muncul.

### ADM-03 Approve pending patient
- Prekondisi: pasien pending tersedia.
- Langkah:
1. Approve pasien pending.
- Ekspektasi:
- Status user jadi `Verified`.
- Pasien bisa login.

### ADM-04 Reject pending patient
- Prekondisi: ada pasien pending (bisa dari registrasi baru).
- Langkah:
1. Reject pasien.
- Ekspektasi:
- Status jadi `Rejected` dan user terhapus secara soft delete.

### ADM-05 CRUD staff
- Prekondisi: login `admin`.
- Langkah:
1. Tambah staff baru.
2. Edit staff.
3. Hapus staff non-admin.
- Ekspektasi:
- Semua aksi berhasil sesuai role dan validasi.

### ADM-06 CRUD layanan medis
- Prekondisi: login `admin`.
- Langkah:
1. Tambah layanan kategori valid.
2. Edit layanan.
3. Hapus layanan (soft delete).
- Ekspektasi:
- Layanan muncul/hilang sesuai status aktif.

### ADM-07 Tambah jadwal dokter multi hari/multi sesi
- Prekondisi: login `admin`.
- Langkah:
1. Pilih dokter.
2. Pilih beberapa hari dan sesi.
3. Simpan.
- Ekspektasi:
- Jadwal baru tersimpan.
- Jika kombinasi duplikat, sistem menolak.

### ADM-08 CRUD sesi praktik
- Prekondisi: login `admin`.
- Langkah:
1. Tambah sesi praktik.
2. Edit sesi.
3. Hapus sesi.
- Ekspektasi:
- Validasi jam mulai < jam selesai berjalan.

### ADM-09 Update settings klinik
- Prekondisi: login `admin`.
- Langkah:
1. Ubah informasi klinik.
2. Ubah jam praktik.
3. Refresh halaman.
- Ekspektasi:
- Data persist setelah refresh.

### ADM-10 Uji akses URL role lain
- Prekondisi: login `admin`.
- Langkah:
1. Akses `/dashboard/patient`, `/dashboard/doctor`, dsb.
- Ekspektasi:
- Di-redirect ke dashboard admin.

## 9. Skenario E2E Prioritas Tinggi
### E2E-01 Alur klinik lengkap dari check-in sampai obat
- Aktor: Patient -> Receptionist -> Nurse -> Doctor -> Receptionist -> Pharmacist -> Patient.
- Langkah ringkas:
1. Pasien check-in.
2. Perawat isi catatan awal.
3. Dokter input rekam medis + resep.
4. Resepsionis proses pembayaran.
5. Farmasi dispense resep.
6. Pasien melihat update pada prescriptions/payments.
- Ekspektasi akhir:
- Reservation `Completed + Completed`.
- Prescription `Paid + Dispensed`.
- Payment tercatat.
- Riwayat pasien bertambah.

## 10. Catatan Risiko dari Analisis Implementasi
Fokuskan observasi pada area berikut saat blackbox:
- Pesan error login untuk akun pending cenderung generik di UI.
- Fitur `available-now` dokter sensitif pada konfigurasi sesi waktu.
- Pelepasan status priority tidak melakukan reorder balik antrian.
- Filter pencarian pembayaran dilakukan setelah pagination (potensi hasil page tidak intuitif).
- Endpoint detail pasien (`/api/patients/[id]`) menghitung status dari kelengkapan data, bukan langsung dari `users.status`.

## 11. Format Bukti Uji yang Direkomendasikan
Untuk setiap test case simpan:
- ID test case.
- Tanggal dan waktu eksekusi.
- Username role penguji.
- Langkah yang dijalankan.
- Hasil aktual.
- Status `PASS/FAIL`.
- Screenshot halaman sebelum/sesudah aksi penting.

