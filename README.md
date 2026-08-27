# SOREVI LABS • Discord Assistant & Automation Bot

Bot Discord resmi berbasis **Node.js** dan **discord.js (v14)** yang dirancang untuk operasional studio pengembangan game Roblox **SOREVI LABS** (Roblox Development & Service Hub). Bot ini mengelola otomasi sistem ticketing, penerimaan order proyek, bantuan teknis, audit logging, penataan hak akses server, dan penyambutan komunitas.

---

## 🌟 Fitur Utama

### 1. 🎫 Sistem Ticketing & Order Project Terpadu
* **Panel Tiket Interaktif:** Menyediakan 4 tombol kategori layanan (`🛠️ Order Project`, `🔧 Bantuan Teknis`, `🤝 Partnership`, `❓ Bantuan Umum`) dengan form pop-up modal.
* **Format Channel Unik:** Setiap room tiket dibuat otomatis dengan format **`#sl-xxxxxxxx`** (8 digit alfanumerik acak, contoh: `#sl-8f3a1b2c`) di dalam kategori khusus **`🎫｜✦ ACTIVE TICKETS ✦`**.
* **Pembuatan Tiket Manual Staf (`/ticket create <user>`):** Staf dapat membuatkan tiket untuk member tertentu dengan pilihan kategori dan form modal khusus.
* **Pemberitahuan Terfokus:** Pesan awal tiket hanya me-mention pembuat tiket dan role `@Project Developer` untuk meminimalkan spam notifikasi.
* **Archiving & Transkrip Markdown (`.md`) Lokal:** Saat tiket ditutup via modal alasan (`/ticket close` atau tombol), room tiket dipindahkan ke kategori **`📁｜✦ CLOSED TICKETS ✦`**, hak akses member dicabut, dan riwayat chat disimpan sebagai file Markdown ke folder lokal `transcripts/transcript-sl-xxxxxxxx.md`.
* **Kontrol Tiket Lengkap:** Tombol cepat `Claim Tiket`, `Export Transcript`, dan `Tutup Tiket` di dalam room tiket.

### 2. 📊 Sistem Audit & Realtime Bot Logs
* **Batched Bot Logs (`# 📊・bot-logs`):** Mengelompokkan log eksekusi slash command dan aksi staf secara realtime dalam satu pesan embed (hingga 10 baris entri per pesan) untuk menjaga channel log tetap rapi dan tidak spam.
* **Ticket Audit Logs (`# 📊・ticket-logs`):** Mencatat seluruh riwayat pembukaan tiket, staf yang mengklaim, dan penutupan tiket beserta lokasi file transkrip lokal.

### 3. 👋 Sambutan & Manajemen Komunitas
* **Welcome Embed Card (`# 👋・welcome`):** Kartu sambutan modern yang memuat foto profil member, panduan rules, info order, dan penghitung member server.
* **Auto-Assign Role:** Member baru otomatis mendapatkan role **`⭐ ｜ Sorevi Community`**.
* **Farewell Audit (`# 🚪・farewell`):** Channel privat admin/staff untuk memantau member yang keluar beserta durasi bergabungnya.
* **Simulasi Event (`/testevent`):** Fitur simulasi kartu join/leave untuk memudahkan pengujian embed.

### 4. 🏛️ Sinkronisasi Konten & Server Blueprint
* **Channel Content Markdown:** 18 file master markdown di folder `channel_content/*.md` yang dapat disinkronkan ke Discord kapan saja.
* **Clickable Mentions:** Otomatis mengubah tag `<#slug-channel>` dan `<@&slug-role>` menjadi mention Discord asli yang bisa diklik.

---

## ⚡ Daftar Slash Commands Resmi

| Command | Subcommand / Opsi | Deskripsi & Kegunaan |
| :--- | :--- | :--- |
| **`/ticket`** | `panel` | Memasang panel embed pembuatan tiket di channel aktif |
| | `create <user>` | Membuka form modal untuk membuatkan tiket bagi member target |
| | `close [reason]` | Menutup dan mengarsipkan tiket ke kategori Closed Tickets |
| | `add <user>` | Menambahkan member ke dalam room tiket aktif *(Ticket Only)* |
| | `remove <user>` | Mengeluarkan member dari room tiket aktif *(Ticket Only)* |
| | `claim` | Mengklaim penanganan tiket oleh staf developer *(Ticket Only)* |
| **`/testevent`** | `join <user>` | Simulasikan pengiriman Welcome Embed Card di `# 👋・welcome` |
| | `leave <user>` | Simulasikan pengiriman Farewell Embed Card di `# 🚪・farewell` |
| **`/sorevisetup`** | `[reset_channels] [reset_roles] [post_content]` | Setup & sinkronisasi total struktur role, kategori, dan permissions server |
| **`/backupserver`** | — | Membuat snapshot cadangan struktur channel dan role ke folder `backups/` |

---

## 📁 Struktur Direktori Proyek

```
slhelper/
├── channel_content/          # Master template markdown konten channel Discord
│   ├── about-sorevi-labs.md
│   ├── announcements.md
│   ├── faq.md
│   ├── rules-and-tos.md
│   ├── services-and-pricing.md
│   ├── ticket-guidelines.md
│   └── ...
├── scripts/                  # Skrip otomasi & deployment
│   ├── deploy-commands.js
│   ├── publish-channel-content.js
│   ├── setup-sorevi-server.js
│   ├── reorganize-voice-channels.js
│   └── ...
├── src/
│   ├── commands/             # Slash commands (/ticket, /testevent, /sorevisetup, /backupserver)
│   ├── events/               # Event handlers (ready, interactionCreate, guildMemberAdd, guildMemberRemove)
│   ├── services/             # Core business logic (ticketService, backupService)
│   ├── data/                 # Blueprint role, category, dan channel (soreviData.js)
│   └── index.js              # Entrypoint bot
├── transcripts/              # Folder penyimpanan lokal transkrip tiket (.md)
└── package.json
```

---

## 🛠️ Instalasi & Menjalankan Bot

### 1. Prasyarat
* **Node.js** v18.0.0 atau lebih baru.
* Bot Discord terdaftar di [Discord Developer Portal](https://discord.com/developers/applications) dengan **Privileged Gateway Intents** aktif (*Guild Members Intent* & *Message Content Intent*).

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
GUILD_ID=1501690878530424973
ENABLE_MESSAGE_CONTENT_INTENT=true
```

### 4. Deploy Slash Commands
Daftarkan seluruh command resmi ke Discord API:
```bash
npm run deploy
```

### 5. Menjalankan Bot
```bash
npm start
```

---

## 📜 Perintah NPM Tambahan (CLI)

| Script NPM | Deskripsi |
| :--- | :--- |
| **`npm run deploy`** | Mendaftarkan ulang seluruh slash commands ke Discord REST API |
| **`npm run publish:content`** | Mempublikasikan / memperbarui teks channel Discord langsung dari folder `channel_content/*.md` |
| **`npm run sorevi:setup`** | Membangun ulang seluruh struktur server Sorevi Labs secara otomatis |
| **`npm run backup:server`** | Membuat snapshot cadangan server ke folder `backups/` |
| **`npm run clear:global`** | Membersihkan command global lama yang tertinggal di cache Discord |

---

## 🛡️ Lisensi
© 2026 **SOREVI LABS**. All rights reserved.
