# Sorevi Labs Helper

Bot Discord berbasis Node.js dan discord.js (v14) untuk operasional studio game **Sorevi Labs** (fokus Roblox Game Development), mencakup sistem ticketing (komplain, bug report, komisi jasa dev, partnership), manajemen struktur server, showcase portofolio, dan integrasi API Roblox.

## Fitur Utama

- **Sistem Ticketing Multi-Kategori:**
  - Panel tiket interaktif dengan tombol & popup modal (`Pesan Jasa / Komisi`, `Laporan Bug & Keluhan`, `Partnership`, `Bantuan Umum`).
  - Pembuatan saluran privat otomatis dengan permission least-privilege untuk user dan tim staff.
  - Tombol operasional di dalam tiket (`Claim`, `Tutup Tiket`, `Export Transcript`).
  - Auto-transcript yang dikirimkan ke channel log staff (`#ticket-logs`) dan DM pembuat tiket saat tiket ditutup.
- **Setup Server Sorevi Labs Otomatis:**
  - Slash command `/sorevisetup` dan script CLI `npm run sorevi:setup` untuk membangun ulang struktur role developer, kategori, channel informasi, dan memasang panel tiket.
- **Integrasi Roblox API:**
  - `/roblox group` untuk melihat statistik & rank group Roblox.
  - `/roblox game` untuk memantau pemain aktif, total visits, likes/dislikes ratio game Roblox secara live.
  - `/roblox user` untuk melihat profil dan avatar player/developer.
- **Utilitas Moderasi & Server:**
  - `/clearchat` untuk pembersihan pesan massal.
  - `/pjpjserver` untuk backup isi seluruh channel teks ke file HTML lokal.
  - `/ticket` untuk manajemen panel, penambahan/pengurangan anggota tiket, dan ekspor transkrip.

## Persyaratan

- Node.js 18 atau lebih baru.
- Bot Discord dengan token dari Discord Developer Portal.
- Bot Permissions: `Manage Channels`, `Manage Roles`, `Manage Messages`, `Attach Files`, `Embed Links`, `View Channel`.

## Instalasi

```bash
npm install
```

Salin file environment:

```bash
copy .env.example .env
```

Isi konfigurasi `.env`:

```env
DISCORD_TOKEN=isi_token_bot_kamu
CLIENT_ID=isi_client_id_bot
GUILD_ID=1501690878530424973
ENABLE_MESSAGE_CONTENT_INTENT=true
```

## Menjalankan Bot

Deploy slash commands ke server:

```bash
npm run deploy
```

Jalankan bot:

```bash
npm start
```

Jalankan setup struktur server Sorevi Labs via CLI:

```bash
npm run sorevi:setup
```

## Daftar Slash Command

| Command | Fungsi |
| :--- | :--- |
| `/sorevisetup` | Setup ulang seluruh role, kategori, channel, dan panel tiket Sorevi Labs |
| `/ticket panel` | Mengirim panel tiket interaktif ke channel saat ini |
| `/ticket close` | Menutup channel tiket aktif dan membuat transkrip log |
| `/ticket add` | Menambahkan user ke dalam channel tiket aktif |
| `/ticket remove` | Mengeluarkan user dari channel tiket aktif |
| `/ticket transcript` | Mengekspor riwayat chat tiket ke file `.txt` |
| `/roblox group` | Cek detail dan statistik Roblox Group |
| `/roblox game` | Cek live player, visits, dan rating game Roblox |
| `/roblox user` | Cek profil dan avatar user Roblox |
| `/clearchat` | Hapus sejumlah pesan pada channel |
| `/pjpjserver` | Backup riwayat chat text channel ke format HTML |
