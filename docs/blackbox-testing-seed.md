# Dokumen Alur Blackbox Testing
## Project: Web Rekam Medis Klinik (berbasis seed dinamis)

Dokumen ini diperbarui untuk mengikuti implementasi terbaru per Maret 2026:
- seed dinamis berdasarkan waktu eksekusi,
- strict window check-in,
- auto-cancel no-show berbasis akhir sesi,
- job auto-cancel via endpoint internal,
- perbaikan status history agar data `Completed` tidak salah label menjadi `Lewat Batas Check-in`.

## 1. Tujuan
- Menyediakan alur uji blackbox end-to-end lintas role.
- Menyediakan skenario uji auto-cancel yang bisa direplikasi cepat.
- Menjadi acuan regresi setelah perubahan flow pasien/antrian.

## 2. Cakupan
- Auth + otorisasi role.
- Alur pasien: appointment, check-in, riwayat, pembayaran.
- Alur klinik: resepsionis, perawat, dokter, farmasi.
- Admin setting: queue policy (strict check-in + auto-cancel).
- Job internal auto-cancel (`/api/internal/jobs/auto-cancel`).

## 3. Persiapan Uji
1. Pastikan `.env` sudah valid (`DATABASE_URL`, dan untuk deploy: `CRON_SECRET`).
2. Reset + seed:
```bash
npm run db:reset:seed
```
3. Jalankan app:
```bash
npm run dev
```
4. Buka `http://localhost:3000`.

## 4. Output Seed yang Wajib Dicatat
Setelah seed, catat log bagian `Reservation timeline (local server time)`:
- `AutoCancel Test Session: ... -> ...`
- `AutoCancel Candidate (patient2): ...`
- `AutoCancel Expected >= ...`

Log ini adalah acuan waktu valid untuk test auto-cancel. Jangan pakai asumsi jam statis.

## 5. Akun Seed
Password semua akun: `test12345`.

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

## 6. Baseline Seed Terkini (Dinamis)
- Appointment `T0` (hari seed) berisi kombinasi status: `Waiting`, `In Progress`, `Waiting for Payment`, `Completed`, `Pending`.
- Ada 1 appointment `patient2` khusus `AutoCancel Candidate` pada sesi `AutoCancel Test`.
- Ada 1 no-show candidate historis (`Yesterday`) untuk validasi cepat job.
- Queue policy default dari seed:
  - `enableStrictCheckIn = false`
  - `checkInEarlyMinutes = 120`
  - `checkInLateMinutes = 60`
  - `enableAutoCancel = true`
  - `autoCancelGraceMinutes = 1`

## 7. Aturan Sistem Terkini
### 7.1 Lifecycle reservasi
- Booking: `Pending` (examination status `null`).
- Check-in: `Confirmed + Waiting`.
- Diperiksa: `Confirmed + In Progress`.
- Menunggu bayar: `Confirmed + Waiting for Payment`.
- Selesai bayar/alur selesai: `Completed + Completed`.
- Dibatalkan: `Cancelled + Cancelled`.

### 7.2 Strict check-in
Jika `enableStrictCheckIn=true`, check-in hanya boleh pada:
- mulai: `reservationDate - checkInEarlyMinutes`
- akhir: `reservationDate + checkInLateMinutes`

### 7.3 Auto-cancel no-show
Deadline no-show:
- utama: `sessionEnd + autoCancelGraceMinutes`
- fallback (jika data sesi tidak tersedia): `reservationDate + checkInLateMinutes`

Ketika lewat deadline dan belum check-in:
- reservation menjadi `Cancelled`
- `examinationStatus = Cancelled`
- `cancellationReason = NO_SHOW`

### 7.4 Tampilan status pasien
- `Completed` tidak boleh tertimpa label check-in window.
- Label `Lewat Batas Check-in`/`Belum Masuk Waktu Check-in` hanya untuk appointment yang masih eligible check-in.

## 8. Test Case Prioritas
### TC-AUTH-01 Pending user tidak bisa login
- Prekondisi: seed selesai.
- Langkah: login `patient_pending`.
- Ekspektasi: ditolak.

### TC-PAT-01 History `Completed` tetap `Selesai`
- Prekondisi: login `patient1`.
- Langkah: buka `/dashboard/patient/appointments`.
- Ekspektasi: item histori completed tampil `Selesai`, bukan `Lewat Batas Check-in`.

### TC-PAT-02 Check-in window hint sesuai policy
- Prekondisi: ada appointment pending/confirmed.
- Langkah: lihat badge/hint di dashboard patient.
- Ekspektasi: hint check-in muncul hanya untuk appointment eligible.

### TC-AC-01 Auto-cancel manual (deterministik)
- Prekondisi:
  - gunakan waktu dari log `AutoCancel Expected >= ...`.
  - `enableAutoCancel=true`.
- Langkah:
1. Tunggu lewat waktu `AutoCancel Expected`.
2. Panggil endpoint job (manual):
```bash
curl -H "Authorization: Bearer <CRON_SECRET>" <APP_BASE_URL>/api/internal/jobs/auto-cancel
```
3. Cek appointment `patient2`.
- Ekspektasi: status berubah `Cancelled` (NO_SHOW).

### TC-AC-02 Auto-cancel via scheduler
- Prekondisi: workflow scheduler aktif.
- Langkah:
1. Jangan trigger manual.
2. Tunggu run scheduler setelah `AutoCancel Expected`.
- Ekspektasi: appointment candidate dicancel pada run pertama setelah deadline.

### TC-AC-03 Manual run sebelum deadline
- Prekondisi: sekarang masih sebelum `AutoCancel Expected`.
- Langkah: trigger manual job.
- Ekspektasi: candidate belum dicancel (cancelled count untuk candidate = 0).

### TC-AC-04 No-show historis kemarin
- Prekondisi: seed baru selesai.
- Langkah: trigger manual job sekali.
- Ekspektasi: no-show candidate kemarin langsung dicancel.

## 9. Checklist Regresi Ringkas
- Login semua role aktif berhasil.
- `patient_pending` tetap gagal login.
- Dashboard tiap role tampil tanpa error.
- Flow check-in -> pemeriksaan -> pembayaran -> resep tetap jalan.
- History appointment completed tidak salah label.
- Auto-cancel manual dan scheduler keduanya valid.

## 10. Template Bukti Uji
Untuk setiap test case simpan:
- ID test case.
- Waktu eksekusi (tanggal + jam).
- Role/akun.
- Langkah uji.
- Hasil aktual.
- Status `PASS/FAIL`.
- Screenshot/log (termasuk output endpoint/job bila relevan).

## 11. Catatan Operasional
- Seed bersifat destruktif untuk data existing.
- Karena waktu seed dinamis, selalu gunakan output timeline terbaru setelah setiap `db:reset:seed`.
- Jika pengujian mendekati pergantian hari, disarankan reseed agar tidak terjadi mismatch tanggal.
