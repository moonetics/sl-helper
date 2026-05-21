# sl-helper

SL Helper adalah bot Discord berbasis Node.js dan discord.js untuk membantu operasional server Squad Limpul. Bot ini menyediakan slash command untuk setup struktur server, sinkronisasi roster, backup channel, moderasi dasar, dan pengiriman DM update member.

## Fitur

- Load slash command dan event handler otomatis dari folder `src/commands` dan `src/events`.
- Deploy command ke guild tertentu atau global lewat Discord REST API.
- Setup ulang struktur role dan channel SL lewat `/slsetupchannels`.
- Publish verified roster dari `members.txt` lewat `/verifiedsl`.
- Sinkron role verified roster berdasarkan data member aktif.
- Backup text channel ke HTML lokal lewat `/pjpjserver`.
- Moderasi utilitas seperti `/clearchat`, `/slkick`, dan `/sldeletechannels`.
- Script operasional untuk cek role, cek duplikat user ID, restore announcement, dan DM update member.

## Persyaratan

- Node.js 18 atau lebih baru.
- Bot Discord dengan token dari Discord Developer Portal.
- Permission bot yang sesuai dengan command yang dipakai, seperti `Manage Channels`, `Manage Roles`, `Manage Messages`, `Kick Members`, dan `Administrator` untuk command tertentu.
- Message Content Intent hanya dibutuhkan untuk fitur backup isi pesan.

## Instalasi

```bash
npm install
```

Salin file environment contoh:

```bash
copy .env.example .env
```

Isi `.env`:

```env
DISCORD_TOKEN=isi_token_bot_kamu_di_sini
CLIENT_ID=isi_application_id_discord_bot
GUILD_ID=opsional_isi_id_server_discord_untuk_register_cepat
ENABLE_MESSAGE_CONTENT_INTENT=false
```

Catatan:

- `GUILD_ID` membuat command cepat muncul di satu server untuk development.
- Kosongkan `GUILD_ID` jika ingin deploy command global.
- Set `ENABLE_MESSAGE_CONTENT_INTENT=true` hanya setelah intent tersebut aktif di Discord Developer Portal.

## Data lokal

File data produksi tidak ikut di-commit karena bisa berisi Discord ID, Roblox ID, kode assessment, link form, atau log DM. Buat file lokal dari contoh berikut saat dibutuhkan:

```bash
copy members.example.txt members.txt
copy dm.example.txt dm.txt
copy member-update-message.example.md member-update-message.md
```

Format `members.txt`:

```txt
# userid,discordid,displayname
8480368946,719268229188550747,NamaDisplay
```

Format `dm.txt` sama, tetapi kolom ketiga biasanya dipakai untuk kode assessment:

```txt
# userid,discordid,kode
8480368946,719268229188550747,SLFA-XXXX-XXXX
```

## Menjalankan bot

Deploy slash command:

```bash
npm run deploy
```

Start bot:

```bash
npm start
```

## Script npm

- `npm start` menjalankan bot.
- `npm run deploy` deploy semua slash command.
- `npm run clear:guild` hapus command guild.
- `npm run clear:global` hapus command global.
- `npm run announcements:restore` restore announcement.
- `npm run permissions:apply` apply permission channel/role.
- `npm run roles:check` cek role server.
- `npm run roles:recommend` rekomendasi permission role.
- `npm run check:dup-userid` cek duplikat Roblox user ID.
- `npm run dm:update:dry` preview DM update tanpa mengirim.
- `npm run dm:update` kirim DM ke target default/manual.
- `npm run dm:update:all` kirim DM ke semua target di `dm.txt`.
- `npm run test:roblox` test integrasi Roblox API.

## Command Discord

- `/verifiedsl` mengirim roster verified SL dan sinkron role verified roster.
- `/slsetupchannels` reset dan buat ulang struktur role/channel SL.
- `/sldeletechannels` menghapus semua channel yang bisa dihapus bot lalu membuat channel random.
- `/slkick user` kick satu member.
- `/slkick all` mass kick semua member yang bisa dikick bot.
- `/clearchat` hapus pesan dalam jumlah tertentu.
- `/pjpjserver` backup channel server ke folder lokal `backups/`.

## Peringatan

Beberapa command bersifat destruktif, terutama `/slsetupchannels`, `/sldeletechannels`, dan `/slkick all`. Pastikan permission bot, role hierarchy, dan opsi `confirm:true` sudah benar sebelum menjalankannya di server utama.
