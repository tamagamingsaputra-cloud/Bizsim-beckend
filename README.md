# BizSim Backend

REST API untuk autentikasi, cloud save, dan admin panel BizSim.
Ditulis memakai **Node.js core saja** (`http`, `crypto`, `node:sqlite`) —
**tidak perlu `npm install`** untuk menjalankan mode default (SQLite).

## Menjalankan (SQLite, default — tidak perlu instalasi apapun)

```bash
cd backend
cp .env.example .env          # lalu edit JWT_SECRET, dsb
node database/migrate.js      # buat tabel + akun superadmin awal
node server.js                 # jalan di http://localhost:4000
```

Cek: `curl http://localhost:4000/api/health`

Akun superadmin awal dibuat dari `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
di `.env` (default: `admin@bizsim.local` / `ChangeMe123!`). **Ganti segera**
setelah login pertama di lingkungan produksi.

> Node 22.5+ diperlukan (memakai `node:sqlite` bawaan, masih berstatus
> eksperimental — akan muncul warning di konsol, aman diabaikan).

## Menghubungkan Frontend ↔ Backend

**Cara 1 — tanpa redeploy (disarankan untuk testing/demo):**
Buka BizSim di browser → layar login → tombol **"Atur Server"** di bagian
bawah kartu login (atau setelah masuk sebagai Guest: menu **Pengaturan →
Backend Server**) → isi URL backend kamu → **Uji Koneksi** → **Simpan**.
Tersimpan di `localStorage` perangkat itu, berlaku seketika tanpa deploy ulang.

**Cara 2 — set default sebelum deploy frontend:**
1. Jalankan backend seperti di atas (default port `4000`).
2. Buka `js/config.js` di root project, set:
   ```js
   API_BASE_URL: "http://localhost:4000"
   ```
3. Buka `index.html` — layar login akan muncul. Register/Login/Guest akan
   otomatis bicara ke backend. Kalau backend mati atau `API_BASE_URL`
   dikosongkan, tombol Login/Register akan gagal dengan pesan error, tapi
   **Continue as Guest tetap berfungsi 100% offline** (localStorage saja).

> Penting: `http://localhost:4000` hanya bisa diakses dari perangkat yang
> SAMA dengan yang menjalankan backend. Kalau frontend kamu buka dari HP
> (apalagi lewat domain Netlify/hosting lain), backend juga harus
> di-deploy ke alamat publik — lihat bagian **Deploy** di bawah.

## Menghubungkan Google Login

1. Buat OAuth Client ID di [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   → Application type: **Web application** → tambahkan origin frontend kamu
   (mis. `http://localhost:5500` atau domain produksi) ke **Authorized JavaScript origins**.
2. Isi `.env` backend:
   ```
   GOOGLE_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
   ```
3. Isi `js/config.js` frontend dengan Client ID yang sama:
   ```js
   GOOGLE_CLIENT_ID: "xxxxxxxxxx.apps.googleusercontent.com"
   ```
4. Restart backend. Tombol "Continue with Google" akan menampilkan tombol
   resmi Google (bukan popup "One Tap" yang sering gagal muncul di browser
   mobile) — dirender lewat `google.accounts.id.renderButton()`. Backend
   memverifikasi ID token dari Google dengan mengambil JWKS publik Google
   dan memvalidasi signature RS256 — bukan simulasi.

Ini butuh koneksi internet di sisi backend (untuk ambil JWKS) dan di sisi
browser (untuk memuat script Google) — keduanya wajar untuk fitur ini.

## Struktur folder (clean architecture)

```
backend/
  server.js              entry point, HTTP server + CORS + security headers
  config/
    index.js               loader .env (tanpa dependency dotenv)
    database.js             adapter DB (sqlite aktif, mysql/postgres stub siap diisi)
  database/
    schema.sqlite.sql        skema yang JALAN di lingkungan ini
    schema.mysql.sql          skema setara untuk MySQL (produksi)
    schema.postgres.sql       skema setara untuk PostgreSQL (produksi)
    migrate.js                 jalankan skema + seed data awal
  repositories/            query SQL mentah (parameterized, anti SQL-injection)
  services/                logika bisnis (auth, game/cloud-save, admin)
  controllers/             terima request, panggil service, kirim response
  middleware/               auth (JWT), role (RBAC), rateLimit, csrf
  routes/
    router.js                router mini pengganti express
    index.js                  daftar seluruh endpoint
  utils/                    hash, jwt, googleAuth, validate, respond, body
```

Lapisan mengikuti alur: **routes → middleware → controllers → services →
repositories → database**. Tidak ada logic bisnis yang ditaruh langsung di
controller atau route.

## Endpoint API

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| GET | `/api/health` | - | cek server hidup |
| POST | `/api/register` | - | daftar akun email+password |
| POST | `/api/login` | - | login email+password |
| POST | `/api/google-login` | - | login pakai ID token Google |
| POST | `/api/guest-login` | - | buat sesi guest di server (opsional; frontend default guest offline) |
| POST | `/api/refresh` | refresh token | perbarui access token |
| POST | `/api/logout` | - | cabut refresh token |
| GET/PUT | `/api/profile` | ✅ | lihat/ubah profil |
| POST | `/api/save` | ✅ | simpan snapshot game lengkap (cloud save) |
| POST | `/api/load` | ✅ | ambil snapshot game terakhir |
| GET | `/api/business` | ✅ | daftar bisnis (tabel ternormalisasi) |
| GET | `/api/assets` | ✅ | ringkasan aset online/offline |
| GET | `/api/events` | ✅ | katalog event + riwayat trigger user |
| GET | `/api/transactions` | ✅ | riwayat transaksi |
| GET | `/api/notifications` | ✅ | notifikasi user |
| POST | `/api/buy` | ✅ | catat pembelian aset market di server |
| POST | `/api/sell` | ✅ | catat penjualan aset market di server |
| GET | `/api/admin/users` | ✅ admin+ | daftar semua user |
| DELETE | `/api/admin/users/:id` | ✅ superadmin | hapus user |
| PUT | `/api/admin/users/:id/role` | ✅ superadmin | ubah role user |
| PUT | `/api/admin/users/:id/active` | ✅ admin+ | aktif/nonaktifkan user |
| POST | `/api/admin/events` | ✅ admin+ | tambah/perbarui event |
| PUT | `/api/admin/market/:id` | ✅ admin+ | ubah parameter aset market |
| POST | `/api/admin/notifications` | ✅ admin+ | broadcast notifikasi |
| GET | `/api/admin/stats` | ✅ admin+ | statistik agregat |

Semua request/response memakai JSON. Endpoint ber-auth memakai header
`Authorization: Bearer <accessToken>`.

**Catatan arsitektur penting:** engine simulasi ekonomi (pergerakan harga,
event dunia, bisnis, dsb) **tetap berjalan di client** (`js/engine.js`,
tidak diduplikasi di backend) — sesuai instruksi untuk tidak mengubah fitur
yang sudah ada. Backend berperan sebagai lapisan akun + persistensi +
admin di atasnya: `/api/save` menyimpan snapshot lengkap sebagai sumber
kebenaran cloud, sementara `/api/business`, `/api/assets`, dsb membaca dari
tabel ternormalisasi yang disinkronkan setiap kali `/api/save` dipanggil —
berguna untuk query cepat di admin panel tanpa mem-parse JSON blob.

## Keamanan yang diterapkan

- **Password**: `crypto.scryptSync` (bukan plaintext, bukan MD5/SHA polos)
- **Token**: JWT HS256 asli (signature HMAC, verifikasi `timingSafeEqual`)
- **Google ID Token**: verifikasi signature RS256 terhadap JWKS publik Google
- **SQL Injection**: seluruh query pakai prepared statement berparameter
- **XSS**: input teks bebas (nama bisnis, notifikasi, dsb) di-escape sebelum disimpan
- **Rate limiting**: in-memory sliding window, lebih ketat di `/api/login`
- **CSRF**: helper double-submit-cookie tersedia untuk skenario cookie-session
- **RBAC**: middleware `requireRole` dengan hierarki guest < member < admin < superadmin
- **Tidak ada credential di source code** — semua lewat `.env` (lihat `.env.example`)

## Mengganti Database ke MySQL / PostgreSQL

1. Install driver: `npm install mysql2` (atau `pg`)
2. Set di `.env`: `DB_CLIENT=mysql` (atau `postgres`)
3. Jalankan skema: `mysql -u root -p bizsim < database/schema.mysql.sql`
   (atau `psql -U postgres -d bizsim -f database/schema.postgres.sql`)
4. Implementasikan adapter di `config/database.js` pada fungsi
   `initUnsupported()` — ganti dengan koneksi driver asli, tetap ikuti
   kontrak `{ run(sql, params), get(sql, params), all(sql, params), exec(sql) }`
   supaya seluruh `repositories/*.js` tidak perlu diubah sama sekali.

Frontend **tidak perlu diubah** ketika backend pindah bahasa/database —
selama endpoint & format JSON di atas tetap sama. Backend Node.js ini adalah
implementasi referensi; struktur route/controller/service/repository yang
sama bisa direplikasi 1:1 di PHP (Laravel/Slim), Python (FastAPI/Flask),
Java (Spring Boot), C# (ASP.NET Core), atau Go (net/http, chi) — tabel
skema (`database/schema.*.sql`) dan kontrak endpoint di atas adalah acuannya.

## Deploy

**Kenapa backend tidak bisa ikut di-deploy ke Netlify:** Netlify hanya
melayani file statis (HTML/CSS/JS) dan serverless functions berumur pendek
— tidak bisa menjalankan proses `http.createServer` yang terus hidup
seperti `server.js` ini. Frontend dan backend **harus di-hosting
terpisah**: frontend tetap di Netlify, backend perlu platform yang
menjalankan proses Node persisten.

**Render.com (gratis, paling cepat untuk mulai):**
1. Push folder `backend/` ke repo Git (GitHub/GitLab).
2. Di Render: **New → Web Service** → hubungkan repo, root directory `backend`.
3. Build command: (kosongkan — tidak perlu install apa pun)
   Start command: `node database/migrate.js && node server.js`
4. Tambahkan environment variables dari `.env.example` (minimal `JWT_SECRET`,
   `SQLITE_PATH=/data/bizsim.db`) lewat dashboard Render → Environment.
5. Tambahkan **Persistent Disk** (Render → Disks) mount ke `/data` supaya
   database SQLite tidak hilang tiap redeploy.
6. Setelah deploy selesai, Render memberi URL publik seperti
   `https://bizsim-api.onrender.com`.
7. Buka BizSim di HP kamu → Login/Register akan gagal seperti biasa dulu →
   tekan **"Atur Server"** di layar login (atau menu **Pengaturan → Backend
   Server** setelah masuk sebagai Guest) → tempel URL Render tadi → **Uji
   Koneksi** → **Simpan**. Tidak perlu redeploy frontend sama sekali.

**VPS (kalau sudah punya server sendiri):**
```bash
git clone <repo> && cd backend
cp .env.example .env   # isi JWT_SECRET & kredensial asli
node database/migrate.js
npm install -g pm2
pm2 start server.js --name bizsim-api
```
Pasang Nginx sebagai reverse proxy + TLS (Let's Encrypt/certbot) di depan
port `4000`, lalu isi URL `https://api.domainmu.com` lewat "Atur Server"
di aplikasi (sama seperti langkah Render di atas).

**Platform lain (Railway/Fly.io/dst):** pola sama seperti Render — set
environment variables, start command `node server.js`, pastikan disk
persistent untuk `SQLITE_PATH` atau pindah ke MySQL/PostgreSQL terkelola
(lihat bagian di atas) kalau platform pakai filesystem ephemeral.

## Sinkronisasi data

- Saat login (non-guest): frontend memanggil `POST /api/load`; jika ada
  cloud save, dipakai dan langsung menimpa cache localStorage.
- Selama bermain: `State.save()` (localStorage) dipanggil tiap ~8 detik;
  `Auth.scheduleCloudSync()` mendebounce push ke `POST /api/save` 3 detik
  setelahnya, supaya tidak membanjiri server dengan request tiap tick.
- Kalau internet putus di tengah sesi: game tetap berjalan penuh dari
  localStorage (tidak ada fitur yang terkunci); begitu online kembali,
  push berikutnya otomatis menyusul lewat siklus autosave yang sama.
- Guest ("Continue as Guest") murni lokal per definisi — tidak pernah
  memanggil backend sama sekali, sesuai permintaan "mode offline".
