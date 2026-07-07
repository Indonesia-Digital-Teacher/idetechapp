#!/usr/bin/env bash
# =============================================================================
# IdeTech - Database Backup Script
# Backup MariaDB dari container → compress → Telegram + Google Drive (rclone)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Load konfigurasi dari .env.backup
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/.env.backup" ]]; then
  ENV_FILE="${SCRIPT_DIR}/.env.backup"
elif [[ -f "${SCRIPT_DIR}/../.env.backup" ]]; then
  ENV_FILE="${SCRIPT_DIR}/../.env.backup"
else
  echo "[ERROR] File konfigurasi tidak ditemukan (.env.backup)"
  echo "        Pastikan file tersebut ada di folder yang sama dengan script"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

# ---------------------------------------------------------------------------
# Variabel (dari .env.backup)
# ---------------------------------------------------------------------------
CONTAINER_NAME="${BACKUP_CONTAINER_NAME:-idetech_mariadb}"
DB_NAME="${BACKUP_DB_NAME:-idetech}"
DB_ROOT_PASS="${BACKUP_DB_ROOT_PASS}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/idetech-backups}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-7}"

# Telegram
TG_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TG_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# rclone (Google Drive)
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
RCLONE_PATH="${RCLONE_BACKUP_PATH:-IdeTech/database-backups}"
RCLONE_ENABLED="${RCLONE_ENABLED:-true}"

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
HOSTNAME_LABEL=$(hostname -s)
BACKUP_FILENAME="idetech_db_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')] [backup-db]"

mkdir -p "$BACKUP_DIR"

log() { echo "${LOG_PREFIX} $*"; }
log_err() { echo "${LOG_PREFIX} [ERROR] $*" >&2; }

# ---------------------------------------------------------------------------
# Fungsi: Kirim notifikasi Telegram (teks)
# ---------------------------------------------------------------------------
tg_notify() {
  local message="$1"
  if [[ -z "$TG_BOT_TOKEN" || -z "$TG_CHAT_ID" ]]; then
    log "[Telegram] Token atau Chat ID kosong, skip notifikasi."
    return 0
  fi
  curl -sf -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TG_CHAT_ID}" \
    --data-urlencode "text=${message}" \
    --data-urlencode "parse_mode=HTML" \
    -o /dev/null || log "[Telegram] Gagal kirim notifikasi teks."
}

# ---------------------------------------------------------------------------
# Fungsi: Kirim file ke Telegram
# ---------------------------------------------------------------------------
tg_send_file() {
  local filepath="$1"
  local caption="$2"
  if [[ -z "$TG_BOT_TOKEN" || -z "$TG_CHAT_ID" ]]; then
    log "[Telegram] Token atau Chat ID kosong, skip upload file."
    return 0
  fi
  local filesize
  filesize=$(du -sh "$filepath" | cut -f1)
  log "[Telegram] Mengirim file ${BACKUP_FILENAME} (${filesize})..."
  curl -sf -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendDocument" \
    -F "chat_id=${TG_CHAT_ID}" \
    -F "document=@${filepath}" \
    -F "caption=${caption}" \
    -o /dev/null \
    && log "[Telegram] File berhasil dikirim." \
    || log_err "[Telegram] Gagal mengirim file."
}

# ---------------------------------------------------------------------------
# Fungsi: Upload ke Google Drive via rclone
# ---------------------------------------------------------------------------
gdrive_upload() {
  local filepath="$1"
  if [[ "$RCLONE_ENABLED" != "true" ]]; then
    log "[rclone] Dinonaktifkan, skip upload Google Drive."
    return 0
  fi
  if ! command -v rclone &>/dev/null; then
    log_err "[rclone] rclone tidak ditemukan. Install: https://rclone.org/install/"
    return 1
  fi
  log "[rclone] Upload ke ${RCLONE_REMOTE}:${RCLONE_PATH}/ ..."
  rclone copy "$filepath" "${RCLONE_REMOTE}:${RCLONE_PATH}/" \
    --progress \
    --log-level INFO \
    && log "[rclone] Upload berhasil." \
    || log_err "[rclone] Gagal upload ke Google Drive."
}

# ---------------------------------------------------------------------------
# Fungsi: Hapus backup lama
# ---------------------------------------------------------------------------
cleanup_old_backups() {
  log "Membersihkan backup lokal lebih dari ${RETAIN_DAYS} hari..."
  find "$BACKUP_DIR" -name "idetech_db_*.sql.gz" -mtime "+${RETAIN_DAYS}" -delete
  log "Cleanup selesai."
}

# =============================================================================
# MAIN PROSES
# =============================================================================

log "====== MULAI BACKUP IDETECH DATABASE ======"
log "Container : ${CONTAINER_NAME}"
log "Database  : ${DB_NAME}"
log "Output    : ${BACKUP_PATH}"

# Notifikasi awal
tg_notify "🔄 <b>IdeTech Backup Dimulai</b>
📅 $(date '+%A, %d %B %Y %H:%M WIB')
🖥️ Host: <code>${HOSTNAME_LABEL}</code>
🗄️ Database: <code>${DB_NAME}</code>"

# ---------------------------------------------------------------------------
# Step 1: Dump database dari container
# ---------------------------------------------------------------------------
log "Step 1: Menjalankan mysqldump dari container ${CONTAINER_NAME}..."

START_TIME=$(date +%s)

if ! docker exec "$CONTAINER_NAME" \
  mariadb-dump \
  --single-transaction \
  --routines \
  --triggers \
  --add-drop-table \
  --skip-lock-tables \
  -uroot -p"${DB_ROOT_PASS}" \
  "$DB_NAME" \
  | gzip -9 > "$BACKUP_PATH"; then
  
  log_err "mysqldump GAGAL!"
  tg_notify "❌ <b>Backup GAGAL!</b>
⏰ $(date '+%H:%M WIB')
💥 mysqldump dari container <code>${CONTAINER_NAME}</code> error.
Cek log VPS segera."
  exit 1
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
FILESIZE=$(du -sh "$BACKUP_PATH" | cut -f1)

log "Step 1 selesai: ${BACKUP_FILENAME} (${FILESIZE}), waktu: ${DURATION}s"

# ---------------------------------------------------------------------------
# Step 2: Validasi file backup tidak kosong
# ---------------------------------------------------------------------------
log "Step 2: Validasi integritas backup..."
if [[ ! -s "$BACKUP_PATH" ]]; then
  log_err "File backup kosong atau corrupt!"
  tg_notify "❌ <b>Backup GAGAL!</b> File hasil dump kosong/corrupt."
  exit 1
fi

# Cek apakah gzip valid
if ! gzip -t "$BACKUP_PATH" 2>/dev/null; then
  log_err "File gzip corrupt!"
  tg_notify "❌ <b>Backup GAGAL!</b> File gzip corrupt setelah dump."
  exit 1
fi
log "Validasi OK."

# ---------------------------------------------------------------------------
# Step 3: Upload ke Google Drive
# ---------------------------------------------------------------------------
log "Step 3: Upload ke Google Drive..."
gdrive_upload "$BACKUP_PATH"

# ---------------------------------------------------------------------------
# Step 4: Kirim file ke Telegram
# ---------------------------------------------------------------------------
log "Step 4: Kirim file ke Telegram..."
tg_send_file "$BACKUP_PATH" \
"✅ IdeTech DB Backup
📅 $(date '+%d/%m/%Y %H:%M WIB')
📦 Ukuran: ${FILESIZE}
⏱️ Durasi: ${DURATION}s
🗄️ DB: ${DB_NAME}"

# ---------------------------------------------------------------------------
# Step 5: Cleanup backup lama
# ---------------------------------------------------------------------------
log "Step 5: Cleanup backup lokal..."
cleanup_old_backups

# ---------------------------------------------------------------------------
# Notifikasi selesai
# ---------------------------------------------------------------------------
tg_notify "✅ <b>Backup Berhasil!</b>
📅 $(date '+%A, %d %B %Y %H:%M WIB')
📦 File: <code>${BACKUP_FILENAME}</code>
📏 Ukuran: <b>${FILESIZE}</b>
⏱️ Durasi: <b>${DURATION}s</b>
☁️ Google Drive: ${RCLONE_ENABLED}
🗑️ Retensi lokal: ${RETAIN_DAYS} hari"

log "====== BACKUP SELESAI: ${BACKUP_FILENAME} (${FILESIZE}) ======"
exit 0
