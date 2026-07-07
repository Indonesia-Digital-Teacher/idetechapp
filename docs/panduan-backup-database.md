# =============================================================================
# IdeTech - Panduan Setup Backup Database Otomatis
# Backup MariaDB → Telegram + Google Drive
# =============================================================================

## Gambaran Umum

```
[Cron VPS] → backup-db.sh
               ├── docker exec idetech_mariadb → mysqldump
               ├── gzip compress → .sql.gz
               ├── Upload rclone → Google Drive ☁️
               └── Upload curl  → Telegram Bot 🤖
```

---

## Prasyarat di VPS

```bash
# 1. curl (biasanya sudah ada)
curl --version

# 2. docker (harus bisa diakses oleh user yang menjalankan cron)
docker --version

# 3. gzip
gzip --version

# 4. rclone (untuk Google Drive)
rclone --version
```

---

## Step 1: Upload Script ke VPS

```bash
# Pastikan posisi terminal di root project dulu:
cd /home/ferilee/DEV/idetechapp

# Upload script menggunakan SSH alias vpsku (Port: 41280):
scp scripts/backup-db.sh vpsku:/home/ferilee/backup_db/backup-db.sh
scp scripts/.env.backup.example vpsku:/home/ferilee/backup_db/.env.backup.example

# SSH masuk ke VPS
ssh vpsku

# Di VPS: buat file konfigurasi dari template
cp /home/ferilee/backup_db/.env.backup.example /home/ferilee/backup_db/.env.backup
nano /home/ferilee/backup_db/.env.backup   # isi semua nilai yang diperlukan

# Beri izin eksekusi
chmod +x /home/ferilee/backup_db/backup-db.sh
chmod 600 /home/ferilee/backup_db/.env.backup  # proteksi kredensial
```

---

## Step 2: Buat Bot Telegram

1. Chat ke **@BotFather** di Telegram
2. Kirim `/newbot` → ikuti instruksi
3. Catat **token** yang diberikan
4. Kirim pesan ke bot baru kamu
5. Buka URL berikut untuk dapat Chat ID:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
6. Isi `TELEGRAM_BOT_TOKEN` dan `TELEGRAM_CHAT_ID` di `.env.backup`

> **Tip:** Gunakan **group** atau **channel pribadi** agar backup tidak tercampur chat personal.

---

## Step 3: Setup rclone untuk Google Drive

```bash
# Install rclone di VPS
curl https://rclone.org/install.sh | sudo bash

# Konfigurasi remote baru
rclone config

# Ikuti wizard interaktif:
# → n  (new remote)
# → nama: gdrive
# → storage type: drive (Google Drive)
# → client_id: (kosongkan untuk pakai default rclone)
# → client_secret: (kosongkan)
# → scope: 1 (full access)
# → root_folder_id: (kosongkan)
# → service_account_file: (kosongkan)
# → edit advanced? n
# → auto config? n  ← PENTING: pilih NO jika VPS headless
#   Copy URL yang muncul → buka di browser lokal
#   → Login Google → allow akses
#   → Copy verification code → paste di terminal VPS
# → is this ok? y

# Test koneksi
rclone lsd gdrive:

# Buat folder backup
rclone mkdir gdrive:IdeTech/database-backups
```

### Alternatif: Service Account (tanpa browser)

```bash
# 1. Buat project di Google Cloud Console
# 2. Enable Google Drive API
# 3. Buat Service Account → download JSON key
# 4. Share folder Google Drive ke email service account
# 5. Di rclone config: isi service_account_file dengan path ke JSON
```

---

## Step 4: Test Manual

```bash
# Test sekali tanpa cron
/home/ferilee/backup_db/backup-db.sh

# Lihat output
ls -lh /home/ferilee/backup_db/
# → idetech_db_20260707_130000.sql.gz

# Cek Google Drive
rclone ls gdrive:IdeTech/database-backups/
```

---

## Step 5: Setup Crontab

```bash
# Edit crontab untuk user ferilee (tidak perlu root karena folder di home directory)
crontab -e

# Tambahkan salah satu jadwal berikut:

# ---- [Rekomendasi] Backup setiap hari jam 12:00 WIB siang (UTC+7 = 05:00 UTC) ----
0 5 * * * /home/ferilee/backup_db/backup-db.sh >> /home/ferilee/backup_db/backup.log 2>&1

# ---- Backup setiap hari jam 02:00 WIB pagi (UTC+7 = 19:00 UTC) ----
0 19 * * * /home/ferilee/backup_db/backup-db.sh >> /home/ferilee/backup_db/backup.log 2>&1

# ---- Backup 2x sehari: 02:00 pagi dan 14:00 WIB siang ----
0 19 * * * /home/ferilee/backup_db/backup-db.sh >> /home/ferilee/backup_db/backup.log 2>&1
0 7  * * * /home/ferilee/backup_db/backup-db.sh >> /home/ferilee/backup_db/backup.log 2>&1
```

> **Catatan timezone:** Cron VPS biasanya berjalan pada zona waktu UTC. WIB adalah UTC+7.
> Jam 12:00 WIB siang = 05:00 UTC pagi.
> Jam 02:00 WIB pagi = 19:00 UTC malam (hari sebelumnya).

### Verifikasi crontab aktif

```bash
# Lihat crontab aktif
crontab -l

# Monitor log backup
tail -f /home/ferilee/backup_db/backup.log
```

---

## Step 6: Rotasi Log (Opsional)

Jika ingin membatasi ukuran file log agar tidak memenuhi VPS seiring berjalannya waktu:
```bash
# /etc/logrotate.d/idetech-backup
sudo tee /etc/logrotate.d/idetech-backup << 'EOF'
/home/ferilee/backup_db/backup.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF
```

---

## Struktur File Backup

```
/home/ferilee/backup_db/
├── backup-db.sh                        ← Script utama
├── .env.backup                         ← Kredensial rahasia (chmod 600)
├── backup.log                          ← Log cronjob
├── idetech_db_20260707_065204.sql.gz   ← File hasil backup (terkompresi)
└── ...                                 ← Max 7 file backup lokal (retensi 7 hari)

Google Drive: IdeTech/database-backups/
├── idetech_db_20260707_065204.sql.gz
└── ...                                 ← Backup awet di cloud (tidak auto-delete)
```

---

## Restore Database dari Backup

```bash
# 1. Ambil file backup
# Masuk ke folder backup
cd /home/ferilee/backup_db/

# Jika file di VPS terhapus, download kembali dari Google Drive:
# rclone copy gdrive:IdeTech/database-backups/NAMA_FILE_BACKUP.sql.gz .

# 2. Jalankan restore ke container MariaDB
# Ganti NAMA_FILE_BACKUP.sql.gz dengan file yang ingin direstore.
# Ganti -pidetech_root_secret dengan password database root Anda.
gunzip -c NAMA_FILE_BACKUP.sql.gz | \
  docker exec -i idetech_mariadb \
  mariadb -uroot -pidetech_root_secret idetech

# 3. Verifikasi tabel database setelah restore
docker exec -i idetech_mariadb \
  mariadb -uroot -pidetech_root_secret idetech \
  -e "SHOW TABLES;"
```

---

## Troubleshooting

| Problem | Solusi |
|---|---|
| `docker: permission denied` | Tambahkan user ke grup docker: `usermod -aG docker $USER` |
| `rclone: token expired` | Jalankan `rclone config reconnect gdrive:` |
| Telegram file > 50MB | Hanya kirim notifikasi teks, file besar langsung ke GDrive saja |
| Backup kosong | Cek password MariaDB di `.env.backup` |
| Cron tidak jalan | Cek `crontab -l` dan path lengkap script |
