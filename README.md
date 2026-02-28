This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database Reset + Seed (Testing)

Pastikan file `.env` sudah berisi `DATABASE_URL` yang valid.

Alur reset + seed yang direkomendasikan:

```bash
npm run db:reset
npm run db:seed
```

Shortcut yang tersedia:

```bash
npm run db:reset:seed
npm run db:rebuild
```

Catatan command:
- `db:reset` menghapus semua tabel existing lalu menjalankan `drizzle-kit push --force` agar schema sinkron ke definisi terbaru.
- `db:seed` menjalankan seed dummy via `node ./db/run-ts.cjs ./db/seed.ts` (tanpa `ts-node`).

Akun demo dari seed (password semua akun: `test12345`):

- `admin`
- `doctor`
- `nurse`
- `receptionist`
- `pharmacist`
- `patient1`
- `patient2`
- `patient3`

Catatan:
- `patient_pending` sengaja dibuat status `Pending` untuk skenario verifikasi admin.
- Perintah reset/seed bersifat destruktif untuk data existing, gunakan untuk local/dev/testing.

## Queue Policy + Auto-cancel (No-show)

Fitur baru:
- Strict window check-in (dinamis dari Admin Settings)
- Auto-cancel no-show via cron job endpoint

Aturan status:
- `Pending/Confirmed` -> check-in -> `Waiting`
- Tidak check-in sampai deadline -> `Cancelled` dengan `cancellationReason = NO_SHOW`

Deadline no-show:
- `min(reservationDate + checkInLateMinutes, sessionEnd + autoCancelGraceMinutes)`

Konfigurasi dinamis (Admin > Pengaturan > Check-in & Auto-cancel):
- `enableStrictCheckIn`
- `checkInEarlyMinutes`
- `checkInLateMinutes`
- `enableAutoCancel`
- `autoCancelGraceMinutes`

Auto-cancel endpoint:
- `GET /api/internal/jobs/auto-cancel`
- Wajib header `Authorization: Bearer <CRON_SECRET>`
- Saat local dev, endpoint tetap bisa dipanggil tanpa secret untuk kebutuhan testing.

Vercel Cron:
- Konfigurasi ada di `vercel.json` (setiap 5 menit)
- Pastikan environment variable `CRON_SECRET` tersedia di project Vercel

## Panduan Blackbox Testing (Seed-based)

Dokumen alur dan checklist blackbox testing berbasis seed tersedia di:

- `docs/blackbox-testing-seed.md`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
